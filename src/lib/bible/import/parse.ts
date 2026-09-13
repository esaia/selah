import { detectFormat } from '@/lib/bible/import/detect';
import { parseNested } from '@/lib/bible/import/nested';
import { parseOsis } from '@/lib/bible/import/osis';
import { parseUsx } from '@/lib/bible/import/usx';
import type { ParsedBible, ParsedBook } from '@/lib/bible/import/types';

export const parseBibleXml = (source: string): ParsedBible | null => {
  const format = detectFormat(source);

  if (!format) return null;
  if (format === 'usx') return parseUsx(source);
  if (format === 'osis') return parseOsis(source);

  return parseNested(source, format);
};

export const mergeBibles = (parts: ParsedBible[]): ParsedBible | null => {
  const found = parts.filter(part => part.books.length > 0);

  if (found.length === 0) return null;

  const books = new Map<number, ParsedBook>();

  for (const part of found) {
    for (const book of part.books) {
      const had = books.get(book.position);
      const verses = (entry: ParsedBook) =>
        entry.chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0);

      if (!had || verses(book) > verses(had)) books.set(book.position, book);
    }
  }

  return {
    format: found[0].format,
    name: found.find(part => part.name)?.name ?? '',
    books: [...books.values()].sort((a, b) => a.position - b.position),
  };
};
