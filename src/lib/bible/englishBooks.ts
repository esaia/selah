import books from '@/lib/bible/books.json';
import { specOf, type Lang } from '@/lib/bible/languages';

/**
 * The API numbers books in Georgian canonical order, but the English corpus
 * orders the catholic epistles and Pauline letters differently. These are the
 * books whose English id differs from the shared id.
 *
 * Moved out of `src/context/BibleSettingProvider.js` so every fetch path can
 * apply the same remap, and into `books.json` so `scripts/mirror.mjs` can read
 * it too — the mirror walks a language's own book ids and has to get back to
 * the shared ones.
 */
export const englishBooks: Record<number, number> = Object.fromEntries(
  Object.entries(books.englishBooks).map(([shared, english]) => [Number(shared), english]),
);

/**
 * Translate a shared book id into the id the API expects for `lang`.
 *
 * Every language the API carries uses one of two orderings, and the spec table
 * says which — Spanish and Japanese order the epistles the way English does,
 * Ukrainian and Ossetian the way Georgian does.
 */
export const toApiBook = (book: number, lang: Lang) =>
  specOf(lang).order === 'eng' ? englishBooks[book] || book : book;
