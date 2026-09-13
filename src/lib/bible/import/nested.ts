import { bookByName, bookByPosition, type CanonBook } from '@/lib/bible/import/canon';
import { scanXml, tidy } from '@/lib/bible/import/xml';
import type { BibleFormat, ParsedBible, ParsedBook, ParsedChapter } from '@/lib/bible/import/types';

interface Dialect {
  book: string[];
  chapter: string[];
  verse: string[];
}

const DIALECTS: Record<'zefania' | 'opensong', Dialect> = {
  zefania: { book: ['biblebook'], chapter: ['chapter'], verse: ['vers', 'verse'] },
  opensong: { book: ['b', 'book'], chapter: ['c', 'chapter'], verse: ['v', 'verse'] },
};

const NOTES = new Set(['note', 'f', 'x', 'xref', 'gr', 'rf', 'fn']);

const numberOf = (value: string | undefined): number => {
  const found = value?.match(/\d+/)?.[0];

  return found ? Number(found) : 0;
};

const numeric = (value: string | undefined) => (value && /^\d+$/.test(value.trim()) ? Number(value) : 0);

const bookOf = (attrs: Record<string, string>): CanonBook | null => {
  const numbered =
    numeric(attrs.bnumber) || numeric(attrs.number) || numeric(attrs.id) || numeric(attrs.index) || numeric(attrs.n);

  if (numbered) return bookByPosition(numbered);

  const named = attrs.bname ?? attrs.name ?? attrs.n ?? attrs.osisid;

  return named ? bookByName(named) : null;
};

const bookNameOf = (attrs: Record<string, string>): string | undefined => {
  const named = (attrs.bname ?? attrs.name ?? attrs.n ?? '').trim();

  return named && !/^\d+$/.test(named) ? named : undefined;
};

const chapterNumberOf = (attrs: Record<string, string>) =>
  numberOf(attrs.cnumber ?? attrs.number ?? attrs.n ?? attrs.id);

const verseNumberOf = (attrs: Record<string, string>) =>
  numberOf(attrs.vnumber ?? attrs.number ?? attrs.n ?? attrs.id);

export const parseNested = (source: string, format: BibleFormat): ParsedBible => {
  const dialect = format === 'zefania' ? DIALECTS.zefania : DIALECTS.opensong;
  const books: ParsedBook[] = [];

  let name = '';
  let book: ParsedBook | null = null;
  let chapter: ParsedChapter | null = null;
  let verse: number | null = null;
  let words: string[] = [];
  let noteDepth = 0;

  const closeVerse = () => {
    if (verse !== null && chapter) {
      const text = tidy(words.join(''));

      if (text) chapter.verses.push([verse, text]);
    }

    verse = null;
    words = [];
    noteDepth = 0;
  };

  for (const event of scanXml(source)) {
    if (event.kind === 'text') {
      if (verse !== null && !noteDepth) words.push(event.text);
      continue;
    }

    const { name: tag, kind, attrs } = event;

    if (NOTES.has(tag)) {
      if (kind === 'open') noteDepth += 1;
      if (kind === 'close' && noteDepth) noteDepth -= 1;
      continue;
    }

    if (kind === 'close') {
      if (dialect.verse.includes(tag)) closeVerse();
      if (dialect.chapter.includes(tag)) chapter = null;
      if (dialect.book.includes(tag)) book = null;
      continue;
    }

    if (kind === 'open' && dialect.book.includes(tag)) {
      const found = bookOf(attrs);

      book = found ? { position: found.position, name: bookNameOf(attrs), chapters: [] } : null;

      if (book) books.push(book);

      continue;
    }

    if (kind === 'open' && dialect.chapter.includes(tag)) {
      const number = chapterNumberOf(attrs);

      chapter = book && number ? { number, verses: [] } : null;

      if (chapter && book) book.chapters.push(chapter);

      continue;
    }

    if (kind === 'open' && dialect.verse.includes(tag)) {
      closeVerse();

      const number = verseNumberOf(attrs);

      verse = chapter && number ? number : null;

      continue;
    }

    if (verse !== null && !noteDepth && (tag === 'br' || tag === 'p')) words.push(' ');

    if (!name && (attrs.biblename || attrs.name || attrs.translation)) {
      name = attrs.biblename || attrs.name || attrs.translation;
    }
  }

  closeVerse();

  return { format, name: tidy(name), books: books.filter(entry => entry.chapters.length > 0) };
};
