// Copies the scripture into our own database, one chapter at a time.
//
//   pnpm mirror                                     everything the API carries
//   pnpm mirror --set scripts/mirror-set.json       a curated list of translations
//   pnpm mirror --lang eng                          one language
//   pnpm mirror --lang eng --version "KJV King James Version"
//   pnpm mirror --dry-run                           say what the work is, fetch nothing
//   pnpm mirror --rps 2 --concurrency 2             gentler
//
// Why this exists: every verse the console shows comes from a third party we
// have no account with and cannot fix. `/api/bible` reads `bible_text` before
// it reads anything else, so once a translation is here a service does not
// depend on that host being up.
//
// Two things make the run survivable. It reads the keys it already has and
// skips them, so stopping it costs nothing and running it again after adding a
// language does only the new work. And it is slow on purpose: holybible.ge is
// someone's ministry on cheap shared hosting, and a copy taken over a few hours
// at three requests a second should be invisible to them.

import { readFile } from "node:fs/promises";

import { connect } from "./db.mjs";

const UPSTREAM =
  process.env.BIBLE_API_URL || "https://holybible.ge/service.php";

/** The 66 books, in whichever order the language uses. Three group headers come first. */
const FIRST_BOOK = 4;
const LAST_BOOK = 69;

/** Chapters in the Bible. Only used to estimate a dry run. */
const CHAPTERS = 1189;

/** Rows per write. Few enough round trips, little enough lost to a retry. */
const BATCH = 100;

const ATTEMPTS = 4;

/**
 * Statuses that mean "stop", not "try again".
 *
 * A first run at three a second was answered with 468 Access Denied after
 * about seven thousand chapters, and the script kept politely backing off and
 * retrying through a hundred and thirty of them. Every one of those made the
 * block more likely to stick. A refusal is the host saying no; the only decent
 * answer is to stop asking.
 */
const REFUSED = new Set([401, 403, 429, 468]);

class Refused extends Error {}

// ------------------------------------------------------------------ arguments

const args = process.argv.slice(2);

const flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? null : args[at + 1];
};

const only = { lang: flag("lang"), version: flag("version"), set: flag("set") };
const dryRun = args.includes("--dry-run");
const rps = Number(flag("rps")) || 3;
const concurrency = Number(flag("concurrency")) || 3;

// ------------------------------------------------------------------ fetching

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One request every 1/rps seconds, however many workers are asking.
 *
 * A shared clock rather than a sleep per worker: three workers each pausing a
 * third of a second still fire three requests at once whenever they line up,
 * and the point of a ceiling is that it holds.
 */
let nextSlot = 0;

const slot = async () => {
  const now = Date.now();
  const at = Math.max(now, nextSlot);

  nextSlot = at + 1000 / rps;

  if (at > now) await wait(at - now);
};

const fetchChapter = async (lang, version, book, chapter) => {
  const query = new URLSearchParams({
    w: String(book),
    t: String(chapter),
    m: "",
    s: "",
    mv: version,
    language: lang,
    page: "1",
  });

  for (let attempt = 1; ; attempt += 1) {
    await slot();

    try {
      const response = await fetch(`${UPSTREAM}?${query}`, {
        signal: AbortSignal.timeout(20000),
      });

      if (REFUSED.has(response.status))
        throw new Refused(`upstream ${response.status}`);
      if (!response.ok) throw new Error(`upstream ${response.status}`);

      return await response.json();
    } catch (error) {
      if (error instanceof Refused || attempt === ATTEMPTS) throw error;

      // Backing off rather than trying again at once: a host that has just said
      // no is not helped by being asked immediately.
      await wait(1000 * 2 ** attempt);
    }
  }
};

/** The row shape `/api/bible` reads. `verses` is `[[muxli, bv], …]` and nothing else. */
const rowOf = (lang, version, book, chapter, chapters, body) => {
  const verses = body?.bibleData ?? [];

  return {
    lang,
    version,
    book,
    chapter,
    // The book id the API stamps on each verse — always book - 3 so far, but
    // taken from the response rather than assumed. An empty chapter has none.
    wigni: verses.length ? Number(verses[0].wigni) : book - 3,
    chapters,
    verses: verses.map((verse) => [Number(verse.muxli), verse.bv]),
  };
};

// ------------------------------------------------------------------ the walk

const read = async (name) =>
  JSON.parse(
    await readFile(
      new URL(`../src/lib/bible/${name}`, import.meta.url),
      "utf8",
    ),
  );

const run = async () => {
  const db = await connect();
  const catalogue = await read("languages.json");
  const books = await read("books.json");

  /**
   * How many chapters a book has, from our own table rather than the API's.
   *
   * `tavi[0].cc` is not to be trusted: it says 40 for Leviticus, which has 27,
   * and 3 for 2 John, which has 1. Walking on it fetched 68 chapters that do
   * not exist and stored a count the browse modal would have believed. The
   * canonical numbers are in `books.json`, keyed by the shared book id, and a
   * test keeps them in step with `versification.ts`.
   */
  const sharedByEnglish = Object.fromEntries(
    Object.entries(books.englishBooks).map(([shared, english]) => [
      english,
      Number(shared),
    ]),
  );

  const chapterCount = (spec, book) =>
    books.chapters[
      spec.order === "eng" ? (sharedByEnglish[book] ?? book) : book
    ] ?? 0;

  // A curated set, if one was named. Copying everything the API carries is
  // rarely what is wanted — most of it is under licences we do not hold — so
  // the list of translations Selah actually keeps is a file rather than a flag.
  //
  // A version string that matches nothing is an error rather than a silent
  // skip: these are long, hand-copied strings in four scripts, and a typo that
  // quietly fetched sixteen translations instead of seventeen would not be
  // noticed until someone armed the missing one mid-service.
  const chosen = only.set
    ? JSON.parse(
        await readFile(new URL(only.set, `file://${process.cwd()}/`), "utf8"),
      )
    : null;

  chosen?.translations.forEach(({ lang, version }) => {
    if (!catalogue[lang])
      throw new Error(`${only.set}: no such language "${lang}"`);
    if (!catalogue[lang].versions.includes(version)) {
      throw new Error(`${only.set}: ${lang} has no translation "${version}"`);
    }
  });

  const wanted =
    chosen &&
    new Set(
      chosen.translations.map(({ lang, version }) => `${lang} ${version}`),
    );

  const targets = Object.entries(catalogue)
    .filter(([lang]) => !only.lang || lang === only.lang)
    .flatMap(([lang, spec]) =>
      spec.versions
        .filter((version) => !only.version || version === only.version)
        .filter((version) => !wanted || wanted.has(`${lang} ${version}`))
        .map((version) => ({ lang, version, spec })),
    );

  if (targets.length === 0) {
    throw new Error(
      `nothing matches --lang ${only.lang ?? "*"} --version ${only.version ?? "*"}`,
    );
  }

  console.log(
    `${targets.length} translation(s), ${rps} req/s, ${concurrency} at a time\n`,
  );

  if (dryRun) {
    const chapters = targets.length * CHAPTERS;

    targets.forEach(({ lang, version }) =>
      console.log(`  ${lang}  ${version}`),
    );
    console.log(
      `\nabout ${chapters.toLocaleString()} chapters — ${(chapters / rps / 3600).toFixed(1)} hours at ${rps}/s.` +
        "\nAn estimate: the real count per translation is only knowable by asking.",
    );

    return;
  }

  // What is already here. Paged because the whole corpus is ~56k rows and
  // PostgREST caps a response at a thousand.
  const done = new Set();

  for (let from = 0; ; from += 1000) {
    const page = await db.select(
      "bible_text",
      "select=lang,version,book,chapter",
      from,
      from + 999,
    );

    if (!page.length) break;

    page.forEach((row) =>
      done.add(`${row.lang} ${row.version} ${row.book} ${row.chapter}`),
    );

    if (page.length < 1000) break;
  }

  console.log(`${done.size} chapter(s) already stored\n`);

  const started = Date.now();
  let fetched = 0;
  let skipped = 0;
  let stored = 0;
  const failures = [];

  for (const { lang, version, spec } of targets) {
    let pending = [];

    const flush = async () => {
      if (pending.length === 0) return;

      await db.upsert("bible_text", pending);

      stored += pending.length;
      pending = [];
    };

    const say = (book) => {
      const rate = fetched / Math.max((Date.now() - started) / 1000, 1);

      process.stdout.write(
        `\r  ${lang}/${version.slice(0, 26).padEnd(26)} book ${String(book).padStart(2)}  ` +
          `${fetched} fetched, ${skipped} skipped, ${failures.length} failed  ${rate.toFixed(1)}/s    `,
      );
    };

    // A refusal unwinds the whole run, so what has been fetched and not yet
    // written goes out first — up to a batch of chapters that were paid for
    // and would otherwise have to be asked for a second time.
    try {
      for (let book = FIRST_BOOK; book <= LAST_BOOK; book += 1) {
        const count = chapterCount(spec, book);
        const rest = [];

        for (let chapter = 1; chapter <= count; chapter += 1) {
          if (done.has(`${lang} ${version} ${book} ${chapter}`)) {
            skipped += 1;
            continue;
          }

          rest.push(chapter);
        }

        // A few chapters in flight at once. The rate ceiling is what actually
        // paces them; this only stops the run being one round trip at a time.
        for (let at = 0; at < rest.length; at += concurrency) {
          const group = rest.slice(at, at + concurrency);

          const bodies = await Promise.all(
            group.map((chapter) =>
              fetchChapter(lang, version, book, chapter).then(
                (body) => ({ chapter, body }),
                (error) => {
                  if (error instanceof Refused) throw error;

                  failures.push({
                    lang,
                    version,
                    book,
                    chapter,
                    why: String(error),
                  });
                  return null;
                },
              ),
            ),
          );

          bodies.filter(Boolean).forEach(({ chapter, body }) => {
            pending.push(rowOf(lang, version, book, chapter, count, body));
            fetched += 1;
          });

          if (pending.length >= BATCH) await flush();
        }

        say(book);
      }
    } finally {
      await flush();
    }

    process.stdout.write("\n");
  }

  const minutes = ((Date.now() - started) / 60000).toFixed(1);

  console.log(
    `\nfetched ${fetched}, skipped ${skipped}, stored ${stored}, failed ${failures.length} — ${minutes} min`,
  );

  if (failures.length) {
    console.log("\nnot fetched:");
    failures.forEach((f) =>
      console.log(
        `  ${f.lang} / ${f.version} / book ${f.book} ch ${f.chapter} — ${f.why}`,
      ),
    );
    console.log("\nRun the same command again to retry only these.");
    process.exitCode = 1;
  }
};

try {
  await run();
} catch (error) {
  if (error instanceof Refused) {
    console.error(`\n\nStopped: the host refused us (${error.message}).`);
    console.error(
      "Everything fetched up to here is stored. Leave it alone for a few hours,",
    );
    console.error(
      "then run the same command again — it resumes where it stopped.",
    );
    process.exitCode = 1;
  } else {
    throw error;
  }
}
