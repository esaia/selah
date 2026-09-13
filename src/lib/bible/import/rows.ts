import { bookByPosition } from '@/lib/bible/import/canon';
import type { ParsedBible } from '@/lib/bible/import/types';
import type { Lang } from '@/lib/bible/languages';
import { toLangBook } from '@/lib/bible/passage';

export interface TranslationRow {
  translation_id: string;
  book: number;
  chapter: number;
  wigni: number;
  chapters: number;
  verses: [number, string][];
}

export const rowsOf = (bible: ParsedBible, lang: Lang, translationId: string): TranslationRow[] =>
  bible.books.flatMap(book => {
    const canon = bookByPosition(book.position);

    if (!canon) return [];

    const langBook = toLangBook(canon.shared, lang);
    const chapters = book.chapters.reduce((highest, chapter) => Math.max(highest, chapter.number), 0);

    return book.chapters
      .filter(chapter => chapter.verses.length > 0)
      .map(chapter => ({
        translation_id: translationId,
        book: langBook,
        chapter: chapter.number,
        wigni: langBook - 3,
        chapters,
        verses: [...chapter.verses].sort((a, b) => a[0] - b[0]),
      }));
  });

export const batched = <T,>(rows: T[], size = 100): T[][] => {
  const batches: T[][] = [];

  for (let at = 0; at < rows.length; at += size) batches.push(rows.slice(at, at + size));

  return batches;
};
