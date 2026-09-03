// Refreshes the book names and translation lists in `src/lib/bible/languages.json`.
//
//   node scripts/languages.mjs
//
// The upstream API reports its own book names and translation list on every
// chapter response, so the catalogue for a language is one fetch. Scripture
// metadata does not change, so the result is committed and nothing at build or
// run time depends on holybible.ge being up.
//
// It rewrites `names` and `versions` and leaves everything else alone: the
// label, the book ordering, the psalm scheme and the default translation were
// decided by hand and checked against the API, and no response carries them.
//
// Georgian, English and Russian are skipped. Their arrays were checked against
// the old app and the tests read them; the API's own lists for those three do
// not match them exactly and should not overwrite them.

import { readFile, writeFile } from 'node:fs/promises';

// Where the scripture was copied from. Hard-coded rather than an environment
// variable: the app has no connection to this host any more, and a setting in
// `.env` would suggest the running product still reaches for it.
const UPSTREAM = 'https://holybible.ge/service.php';
const CATALOGUE = new URL('../src/lib/bible/languages.json', import.meta.url);

/** The three whose entries are maintained by hand. */
const BY_HAND = new Set(['geo', 'eng', 'ru']);

const fetchLanguage = async code => {
  const query = new URLSearchParams({ w: '4', t: '1', m: '', s: '', mv: '', language: code, page: '1' });
  const response = await fetch(`${UPSTREAM}?${query}`);

  if (!response.ok) throw new Error(`${code}: upstream ${response.status}`);

  const body = await response.json();

  if (!body.bibleNames?.length) throw new Error(`${code}: no book names`);
  if (!body.versions?.length) throw new Error(`${code}: no translations`);

  // Some names arrive wrapped in non-breaking spaces.
  return {
    names: body.bibleNames.map(name => String(name).replace(/ /g, ' ').trim()),
    versions: body.versions.map(version => String(version).trim()),
  };
};

const catalogue = JSON.parse(await readFile(CATALOGUE, 'utf8'));
const codes = Object.keys(catalogue).filter(code => !BY_HAND.has(code));

const loaded = await Promise.all(codes.map(async code => [code, await fetchLanguage(code)]));

loaded.forEach(([code, { names, versions }]) => {
  const before = catalogue[code];

  catalogue[code] = { ...before, versions, names };

  const gone = before.defaultVersion && !versions.includes(before.defaultVersion);

  console.log(
    `${code}: ${names.length} names, ${versions.length} translations` +
      (names.length !== before.names.length ? `  (was ${before.names.length} names — check nameOffset)` : '') +
      (gone ? `  (defaultVersion "${before.defaultVersion}" is gone)` : ''),
  );
});

await writeFile(CATALOGUE, `${JSON.stringify(catalogue, null, 2)}\n`);
