// Finds chapters in the local copy that hold fewer verses than they should.
//
//   pnpm mirror-gaps                    every translation
//   pnpm mirror-gaps --lang eng         one language
//   pnpm mirror-gaps --refill           re-fetch the suspects and keep what grows
//
// A short chapter is one of three things, and only the last is worth fixing:
//
//   1. The translation genuinely omits the verse. The NIV and NASB have no
//      Matthew 17:21; the KJV does. That is a decision by the translators, and
//      putting the verse back would show text the translation does not contain.
//   2. The API has nothing there at all — Abkhazian and Ossetian have no Old
//      Testament, so a whole chapter comes back empty. Recorded, not missing.
//   3. It came back short because the upstream hiccuped. A real gap.
//
// This lists all three, because they are indistinguishable from the row alone.
// `--refill` is what tells them apart: it re-fetches each suspect and keeps the
// result only if it has *more* verses than what is stored. A translation that
// really omits a verse returns the same short chapter and is left as it is.
//
// The expected counts come from `books.json`, which mirrors `versification.ts`.
// They are Masoretic, so the psalms of a Septuagint language (Georgian,
// Russian, Ukrainian) are split differently and are reported separately rather
// than counted as gaps.

import { readFile } from 'node:fs/promises';

import { connect } from './db.mjs';

// Where the scripture was copied from. Hard-coded rather than an environment
// variable: the app has no connection to this host any more, and a setting in
// `.env` would suggest the running product still reaches for it.
const UPSTREAM = 'https://holybible.ge/service.php';

/** Psalms, in the shared book numbering. */
const PSALMS = 22;

const args = process.argv.slice(2);

const flag = name => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? null : args[at + 1];
};

const only = { lang: flag('lang'), version: flag('version') };
const refill = args.includes('--refill');

const read = async name => JSON.parse(await readFile(new URL(`../src/lib/bible/${name}`, import.meta.url), 'utf8'));

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const live = async row => {
  const query = new URLSearchParams({
    w: String(row.book),
    t: String(row.chapter),
    m: '',
    s: '',
    mv: row.version,
    language: row.lang,
    page: '1',
  });

  const response = await fetch(`${UPSTREAM}?${query}`, { signal: AbortSignal.timeout(20000) });

  if (!response.ok) throw new Error(`upstream ${response.status}`);

  const body = await response.json();
  const verses = body?.bibleData ?? [];

  return {
    wigni: verses.length ? Number(verses[0].wigni) : row.book - 3,
    verses: verses.map(verse => [Number(verse.muxli), verse.bv]),
  };
};

const run = async () => {
  const db = await connect();
  const catalogue = await read('languages.json');
  const books = await read('books.json');

  const sharedByEnglish = Object.fromEntries(
    Object.entries(books.englishBooks).map(([shared, english]) => [english, Number(shared)]),
  );

  const shared = (spec, book) => (spec.order === 'eng' ? (sharedByEnglish[book] ?? book) : book);

  const expected = (spec, book, chapter) => books.verses[shared(spec, book)]?.[chapter - 1] ?? 0;

  // One translation at a time. The whole corpus is ~280 MB of text and none of
  // it needs to be in memory at once to count what is in it.
  const targets = Object.entries(catalogue)
    .filter(([lang]) => !only.lang || lang === only.lang)
    .flatMap(([lang, spec]) =>
      spec.versions
        .filter(version => !only.version || version === only.version)
        .map(version => ({ lang, version, spec })),
    );

  let checked = 0;
  let empty = 0;
  let lxxPsalms = 0;
  const short = [];

  for (const { lang, version, spec } of targets) {
    const where = `lang=eq.${encodeURIComponent(lang)}&version=eq.${encodeURIComponent(version)}`;
    const rows = [];

    for (let from = 0; ; from += 1000) {
      const page = await db.select('bible_text', `select=lang,version,book,chapter,verses&${where}`, from, from + 999);

      if (!page.length) break;

      rows.push(...page);

      if (page.length < 1000) break;
    }

    rows.forEach(row => {
      checked += 1;

      const want = expected(spec, row.book, row.chapter);
      const have = row.verses.length;

      if (have >= want) return;

      if (have === 0) {
        empty += 1;
        return;
      }

      // A Septuagint psalter splits the psalms differently, so a Masoretic
      // count says nothing useful about it.
      if (shared(spec, row.book) === PSALMS && spec.psalms === 'lxx') {
        lxxPsalms += 1;
        return;
      }

      short.push({ lang, version, book: row.book, chapter: row.chapter, have, want });
    });

    process.stdout.write(`\r  ${checked} chapters checked, ${short.length} short, ${empty} empty    `);
  }

  console.log(`\n\n${checked} chapters checked`);
  console.log(`  ${short.length} shorter than expected`);
  console.log(`  ${empty} empty (a chapter the API has nothing for)`);
  console.log(`  ${lxxPsalms} Septuagint psalms (counted differently, not a gap)`);

  if (short.length === 0) return;

  const byTranslation = new Map();
  short.forEach(item => {
    const key = `${item.lang} / ${item.version}`;
    byTranslation.set(key, (byTranslation.get(key) ?? 0) + 1);
  });

  console.log('\nshort chapters by translation:');
  [...byTranslation.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, n]) => console.log(`  ${String(n).padStart(5)}  ${key}`));

  if (!refill) {
    console.log(`\nRun again with --refill to re-fetch these ${short.length} chapters.`);
    console.log('It keeps a result only when it has more verses than what is stored, so a');
    console.log('verse the translation genuinely omits is left alone.');
    return;
  }

  console.log(`\nre-fetching ${short.length} chapters\n`);

  let grew = 0;
  let same = 0;
  const failed = [];

  for (const item of short) {
    try {
      const fresh = await live(item);

      if (fresh.verses.length > item.have) {
        await db.upsert('bible_text', [
          {
            lang: item.lang,
            version: item.version,
            book: item.book,
            chapter: item.chapter,
            wigni: fresh.wigni,
            chapters: books.chapters[shared(catalogue[item.lang], item.book)] ?? 0,
            verses: fresh.verses,
          },
        ]);

        grew += 1;
      } else {
        same += 1;
      }
    } catch (error) {
      failed.push({ ...item, why: String(error) });
    }

    process.stdout.write(`\r  ${grew} filled, ${same} unchanged, ${failed.length} failed    `);

    await wait(350);
  }

  console.log(`\n\n${grew} chapters filled, ${same} unchanged, ${failed.length} could not be fetched`);

  if (same) {
    console.log('\nThe unchanged ones are almost certainly verses those translations do not have.');
  }
};

await run();
