import { bookByUsfm, type CanonBook } from '@/lib/bible/import/canon';
import { scanXml, tidy } from '@/lib/bible/import/xml';
import type { ParsedBible, ParsedBook, ParsedChapter } from '@/lib/bible/import/types';

const NOTES = new Set(['note', 'figure', 'sidebar', 'ref']);

const HEADING = /^(s\d?|ms\d?|mr|sr|r|d|sp|cl|cp|mt\d?|imt\d?|h|toc\d?|ide|rem|iot|io\d?|ip|is\d?)$/;

const firstNumber = (value: string | undefined): number => {
  const found = value?.match(/\d+/)?.[0];

  return found ? Number(found) : 0;
};

export const parseUsx = (source: string): ParsedBible => {
  const books: ParsedBook[] = [];

  let found: CanonBook | null = null;
  let book: ParsedBook | null = null;
  let chapter: ParsedChapter | null = null;
  let verse: number | null = null;
  let words: string[] = [];
  let notes = 0;
  let heading = false;
  let naming = false;

  const closeVerse = () => {
    const text = tidy(words.join(''));

    if (verse !== null && chapter && text) chapter.verses.push([verse, text]);

    verse = null;
    words = [];
  };

  for (const event of scanXml(source)) {
    if (event.kind === 'text') {
      if (naming && book && !book.name) book.name = tidy(event.text) || undefined;
      if (verse !== null && !notes && !heading) words.push(event.text);
      continue;
    }

    const { name: tag, kind, attrs } = event;

    if (NOTES.has(tag)) {
      if (kind === 'open') notes += 1;
      if (kind === 'close' && notes) notes -= 1;
      continue;
    }

    if (tag === 'para') {
      heading = kind === 'open' && HEADING.test(attrs.style ?? '');
      naming = kind === 'open' && (attrs.style === 'h' || attrs.style === 'toc2');

      if (kind === 'open' && !heading && verse !== null) words.push(' ');
      continue;
    }

    if (tag === 'book' && kind !== 'close') {
      found = bookByUsfm(attrs.code ?? '');
      book = found ? { position: found.position, chapters: [] } : null;

      if (book) books.push(book);

      continue;
    }

    if (tag === 'chapter') {
      closeVerse();

      const number = attrs.eid ? 0 : firstNumber(attrs.number);

      chapter = book && number ? { number, verses: [] } : null;

      if (chapter && book) book.chapters.push(chapter);

      continue;
    }

    if (tag === 'verse') {
      closeVerse();

      const number = attrs.eid ? 0 : firstNumber(attrs.number);

      verse = chapter && number ? number : null;
    }
  }

  closeVerse();

  return {
    format: 'usx',
    name: '',
    books: books.filter(entry => entry.chapters.length > 0),
  };
};
