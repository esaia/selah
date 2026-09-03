// Checks that the local copy says what the API says.
//
//   pnpm mirror-verify                 40 random chapters from anywhere
//   pnpm mirror-verify --lang eng      from one language
//   pnpm mirror-verify --sample 200    more of them
//
// A copy nobody has checked is a rumour. This picks stored chapters at random,
// asks the API for the same ones, and compares verse numbers and text — so a
// silent truncation, a mangled encoding or a chapter fetched during an upstream
// wobble shows up here rather than on a screen on a Sunday.

import { connect } from './db.mjs';

const UPSTREAM = process.env.BIBLE_API_URL || 'https://holybible.ge/service.php';

const args = process.argv.slice(2);

const flag = name => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? null : args[at + 1];
};

const lang = flag('lang');
const sample = Number(flag('sample')) || 40;

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

  return (body?.bibleData ?? []).map(verse => [Number(verse.muxli), verse.bv]);
};

const run = async () => {
  const db = await connect();
  const where = lang ? `&lang=eq.${encodeURIComponent(lang)}` : '';

  // Random enough for the job: a window into the table, then a shuffle. A true
  // random sample would cost an order-by-random over 56k rows and give no more
  // confidence than this does.
  const count = await db.count('bible_text', `select=lang${where}`);

  if (!count) throw new Error(`nothing stored${lang ? ` for ${lang}` : ''} — run \`pnpm mirror\` first.`);

  const window = sample * 10;
  const from = Math.floor(Math.random() * Math.max(count - window, 1));
  const data = await db.select('bible_text', `select=lang,version,book,chapter,verses${where}`, from, from + window);

  const rows = data.sort(() => Math.random() - 0.5).slice(0, sample);

  console.log(`checking ${rows.length} of ${count} stored chapters against the API\n`);

  let same = 0;
  const wrong = [];

  for (const row of rows) {
    const at = `${row.lang} / ${row.version} / book ${row.book} ch ${row.chapter}`;

    try {
      const upstream = await live(row);
      const mine = row.verses;

      if (JSON.stringify(mine) === JSON.stringify(upstream)) {
        same += 1;
        process.stdout.write(`\r${same} matched   `);
        continue;
      }

      wrong.push({
        at,
        why:
          mine.length !== upstream.length
            ? `${mine.length} verses stored, ${upstream.length} live`
            : `text differs at verse ${mine.find((v, i) => JSON.stringify(v) !== JSON.stringify(upstream[i]))?.[0]}`,
        mine: mine.slice(0, 2),
        live: upstream.slice(0, 2),
      });
    } catch (error) {
      wrong.push({ at, why: `could not reach the API: ${error}` });
    }

    // A pause between reads, for the same reason the mirror has one.
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n\n${same} matched, ${wrong.length} did not`);

  wrong.forEach(item => {
    console.log(`\n  ${item.at}\n    ${item.why}`);
    if (item.mine) console.log(`    stored: ${JSON.stringify(item.mine).slice(0, 160)}`);
    if (item.live) console.log(`    live  : ${JSON.stringify(item.live).slice(0, 160)}`);
  });

  if (wrong.length) process.exitCode = 1;
};

await run();
