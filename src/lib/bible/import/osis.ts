import { bookByOsis } from '@/lib/bible/import/canon';
import { scanXml, tidy } from '@/lib/bible/import/xml';
import type { ParsedBible, ParsedBook, ParsedChapter } from '@/lib/bible/import/types';

const NOTES = new Set(['note', 'rdg', 'figure']);

const refOf = (osisId: string) => {
  const [book, chapter, verse] = osisId.split('-')[0].split('.');
  const found = book ? bookByOsis(book) : null;

  return found && chapter && verse
    ? { position: found.position, chapter: Number(chapter), verse: Number(verse) }
    : null;
};

export const parseOsis = (source: string): ParsedBible => {
  const books = new Map<number, ParsedBook>();
  const chapters = new Map<string, ParsedChapter>();

  let name = '';
  let at: { position: number; chapter: number; verse: number } | null = null;
  let words: string[] = [];
  let noteDepth = 0;
  let inWork = false;
  let titled = false;

  const closeVerse = () => {
    const text = tidy(words.join(''));

    if (at && text) {
      const book = books.get(at.position) ?? { position: at.position, chapters: [] };
      books.set(at.position, book);

      const key = `${at.position}:${at.chapter}`;
      let chapter = chapters.get(key);

      if (!chapter) {
        chapter = { number: at.chapter, verses: [] };
        chapters.set(key, chapter);
        book.chapters.push(chapter);
      }

      chapter.verses.push([at.verse, text]);
    }

    at = null;
    words = [];
    noteDepth = 0;
  };

  for (const event of scanXml(source)) {
    if (event.kind === 'text') {
      if (titled) name = tidy(event.text);
      if (at && !noteDepth) words.push(event.text);
      continue;
    }

    const { name: tag, kind, attrs } = event;

    if (NOTES.has(tag)) {
      if (kind === 'open') noteDepth += 1;
      if (kind === 'close' && noteDepth) noteDepth -= 1;
      continue;
    }

    if (tag === 'work') {
      inWork = kind === 'open';

      if (kind !== 'close' && !name) name = attrs.osiswork ?? '';

      continue;
    }

    if (tag === 'title' && kind === 'open') {
      titled = inWork;
      noteDepth += 1;
      continue;
    }

    if (tag === 'title' && kind === 'close' && noteDepth) {
      titled = false;
      noteDepth -= 1;
      continue;
    }

    if (tag === 'verse') {
      if (kind === 'close') {
        closeVerse();
        continue;
      }

      const ref = attrs.osisid && !attrs.eid ? refOf(attrs.osisid) : null;

      closeVerse();
      at = ref;
      continue;
    }

    if (tag === 'chapter' || tag === 'div') closeVerse();

  }

  closeVerse();

  return {
    format: 'osis',
    name: tidy(name),
    books: [...books.values()].sort((a, b) => a.position - b.position),
  };
};
