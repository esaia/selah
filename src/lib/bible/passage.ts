import { englishBooks } from '@/lib/bible/englishBooks';
import { LANGS, onLangsChanged, registeredLangs, specOf, type Lang } from '@/lib/bible/languages';

export interface BookEntry {
  book: number;
  name: string;
}

export interface ParsedReference extends BookEntry {
  chapter: number;
  verse: number | null;
  verseTo: number | null;
}

const sharedByEnglish = Object.entries(englishBooks).reduce<Record<number, number>>((acc, [shared, english]) => {
  acc[english] = Number(shared);
  return acc;
}, {});

export const toLangBook = (book: number, lang: Lang): number =>
  specOf(lang).order === 'eng' ? englishBooks[book] || book : book;

export const toSharedBook = (book: number, lang: Lang): number =>
  specOf(lang).order === 'eng' ? sharedByEnglish[book] || book : book;

const nameIndex = (langBook: number, lang: Lang): number => langBook - 1 + specOf(lang).nameOffset;

export const bookName = (book: number, lang: Lang): string =>
  specOf(lang).names[nameIndex(toLangBook(book, lang), lang)] || '';

export const apiBookName = (wigni: string | number, lang: Lang): string =>
  specOf(lang).names[nameIndex(+wigni + 3, lang)] || '';

export const booksOf = (lang: Lang): BookEntry[] =>
  specOf(lang)
    .names.slice(3 + specOf(lang).nameOffset)
    .map((name, i) => ({
      book: toSharedBook(i + 4, lang),
      name,
    }));

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

const searchKeys = new Map<number, string[]>();

onLangsChanged(() => searchKeys.clear());

export const bookSearchKeys = (book: number): string[] => {
  const cached = searchKeys.get(book);

  if (cached) {
    return cached;
  }

  const keys = new Set<string>();

  [...LANGS, ...registeredLangs()].forEach(lang => {
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

export const bookMatches = (book: number, needle: string): boolean => !needle || matchScore(book, needle) > 0;

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
