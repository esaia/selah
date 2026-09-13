export type BibleFormat = 'zefania' | 'opensong' | 'beblia' | 'usx' | 'osis';

export const FORMAT_LABELS: Record<BibleFormat, string> = {
  zefania: 'Zefania XML',
  opensong: 'OpenSong',
  beblia: 'Beblia',
  usx: 'USX',
  osis: 'OSIS',
};

export interface ParsedChapter {
  number: number;
  verses: [number, string][];
}

export interface ParsedBook {
  position: number;
  name?: string;
  chapters: ParsedChapter[];
}

export interface ParsedBible {
  format: BibleFormat;
  name: string;
  books: ParsedBook[];
}

export const bookNamesOf = (bible: ParsedBible, fallback: string[]): string[] | null => {
  const named = bible.books.filter(book => book.name?.trim());

  if (named.length < 50) return null;

  const names = [...fallback];

  for (const book of named) names[3 + book.position - 1] = book.name!.trim();

  return names;
};

export const verseCountOf = (bible: ParsedBible): number =>
  bible.books.reduce(
    (total, book) => total + book.chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0),
    0,
  );
