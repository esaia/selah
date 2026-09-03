import { englishBooks } from '@/lib/bible/englishBooks';
import { LANGS, specOf, type Lang } from '@/lib/bible/languages';

export interface BookEntry {
  book: number;
  name: string;
}

export interface ParsedReference extends BookEntry {
  chapter: number;
  verse: number | null;
  verseTo: number | null;
}

/**
 * Book numbering
 * --------------
 * The app uses the Georgian ordering as the shared book id (Genesis = 4,
 * because indices 1-3 are the "Bible / Old Testament / New Testament" group
 * headers the API returns).
 *
 * English is ordered differently for the epistles, so both the request
 * parameter AND its name array are indexed by the *English* number, and every
 * language the API carries follows one ordering or the other —
 * `specOf(lang).order` says which. The two helpers below convert between the
 * shared id and a language's own id.
 */
const sharedByEnglish = Object.entries(englishBooks).reduce<Record<number, number>>((acc, [shared, english]) => {
  acc[english] = Number(shared);
  return acc;
}, {});

/** Shared book id -> the id `lang` uses (for API requests and name lookups). */
export const toLangBook = (book: number, lang: Lang): number =>
  specOf(lang).order === 'eng' ? englishBooks[book] || book : book;

/** A language's own book id -> the shared book id. */
export const toSharedBook = (book: number, lang: Lang): number =>
  specOf(lang).order === 'eng' ? sharedByEnglish[book] || book : book;

/**
 * Where a book id lands in a language's name array. Greek carries a stray
 * fourth header before Genesis, so its names sit one index later than the id.
 */
const nameIndex = (langBook: number, lang: Lang): number => langBook - 1 + specOf(lang).nameOffset;

/** Display name of a shared book id in `lang`. */
export const bookName = (book: number, lang: Lang): string =>
  specOf(lang).names[nameIndex(toLangBook(book, lang), lang)] || '';

/**
 * The name of the book a verse belongs to, from the id the API stamps on it.
 * `wigni` counts books from 1 past the three group headers, which is where the
 * + 3 comes from; the offset is Greek's.
 */
export const apiBookName = (wigni: string | number, lang: Lang): string =>
  specOf(lang).names[nameIndex(+wigni + 3, lang)] || '';

/** The 66 books of `lang`, as `{ book (shared id), name }`, in that language's order. */
export const booksOf = (lang: Lang): BookEntry[] =>
  specOf(lang)
    .names.slice(3 + specOf(lang).nameOffset)
    .map((name, i) => ({
      book: toSharedBook(i + 4, lang),
      name,
    }));

// Georgian (mkhedruli) and Cyrillic to Latin, so a book can be found by typing
// how its name sounds: `luka` -> ლუკას სახარება, `psaltir` -> Псалтирь.
const LATIN: Record<string, string> = {
  ა: 'a',
  ბ: 'b',
  გ: 'g',
  დ: 'd',
  ე: 'e',
  ვ: 'v',
  ზ: 'z',
  თ: 't',
  ი: 'i',
  კ: 'k',
  ლ: 'l',
  მ: 'm',
  ნ: 'n',
  ო: 'o',
  პ: 'p',
  ჟ: 'zh',
  რ: 'r',
  ს: 's',
  ტ: 't',
  უ: 'u',
  ფ: 'p',
  ქ: 'k',
  ღ: 'gh',
  ყ: 'q',
  შ: 'sh',
  ჩ: 'ch',
  ც: 'ts',
  ძ: 'dz',
  წ: 'ts',
  ჭ: 'ch',
  ხ: 'kh',
  ჯ: 'j',
  ჰ: 'h',
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export const transliterate = (value: string): string =>
  [...value].map(character => (character in LATIN ? LATIN[character] : character)).join('');

export const normalizeName = (value: string | number): string =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,'"`’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Every string a book can be found by: its name in every language the API
 * carries, plus a Latin transliteration of each — so a book is found by typing
 * it in any of them, whatever the console happens to be browsing in.
 *
 * Cached because the search bar asks for this on every keystroke, once per
 * book, and fourteen names normalised sixty-six times over is real work to
 * repeat for a list that never changes.
 */
const searchKeys = new Map<number, string[]>();

export const bookSearchKeys = (book: number): string[] => {
  const cached = searchKeys.get(book);

  if (cached) {
    return cached;
  }

  const keys = new Set<string>();

  LANGS.forEach(lang => {
    const name = bookName(book, lang);

    if (name) {
      const normalized = normalizeName(name);
      keys.add(normalized);
      keys.add(normalizeName(transliterate(normalized)));
    }
  });

  const built = [...keys];
  searchKeys.set(book, built);

  return built;
};

/** 3 = exact, 2 = prefix, 1 = substring, 0 = no match. */
const matchScore = (book: number, needle: string): number => {
  const probes = [needle, normalizeName(transliterate(needle))];
  const keys = bookSearchKeys(book);

  if (keys.some(key => probes.some(probe => key === probe))) {
    return 3;
  }

  if (keys.some(key => probes.some(probe => key.startsWith(probe)))) {
    return 2;
  }

  return keys.some(key => probes.some(probe => key.includes(probe))) ? 1 : 0;
};

/** Does this book match a (already normalised) search term? */
export const bookMatches = (book: number, needle: string): boolean => !needle || matchScore(book, needle) > 0;

/** Best book match for a bare name, with no chapter or verse. */
export const findBook = (input: string, lang: Lang): BookEntry | null => {
  const needle = normalizeName(input || '');

  if (!needle) {
    return null;
  }

  const ranked = booksOf(lang)
    .map(entry => ({ entry, score: matchScore(entry.book, needle) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.entry || null;
};

/**
 * Parse a free-text reference such as `John 3:16-18`, `იოანე 3:16` or
 * `1 Петра 2`. Returns shared book ids, or null when nothing matches.
 *
 * The browsing language is tried first, then the rest — the placeholder
 * shows an English example, so typing `John 3:16` has to work even when the
 * cards are being printed in Georgian.
 */
export const parseReference = (input: string, lang: Lang): ParsedReference | null => {
  if (!input) {
    return null;
  }

  const parsed = input.trim().match(/^(.+?)[\s.]*(\d+)(?:\s*[:.\s]\s*(\d+))?(?:\s*[-–—]\s*(\d+))?\s*$/);

  if (!parsed) {
    return null;
  }

  const [, rawName, chapter, verse, verseTo] = parsed;
  const needle = normalizeName(rawName);

  if (!needle) {
    return null;
  }

  // Book names are matched across every language the API carries and their
  // transliterations, so `John 3:16`, `იოანე 3:16` and `ioane 3:16` all work
  // whichever language is being browsed.
  const ranked = booksOf(lang)
    .map(entry => ({ entry, score: matchScore(entry.book, needle) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return null;
  }

  const found = ranked[0].entry;

  return {
    book: found.book,
    name: found.name,
    chapter: Number(chapter),
    verse: verse ? Number(verse) : null,
    verseTo: verseTo ? Number(verseTo) : null,
  };
};
