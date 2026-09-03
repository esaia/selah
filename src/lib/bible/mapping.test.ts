import { describe, expect, it } from 'vitest';

import { canonicalToEnglish, englishToCanonical, fromCanonicalRef } from './psalms';
import { apiBookName, bookName, toLangBook, toSharedBook, parseReference } from './passage';
import { chapterCount, verseCount } from './versification';

describe('psalm numbering', () => {
  it('leaves the psalms both traditions agree on', () => {
    expect(canonicalToEnglish(8, 3)).toEqual({ chapter: 8, verse: 3 });
    expect(canonicalToEnglish(150, 1)).toEqual({ chapter: 150, verse: 1 });
  });

  it('splits Septuagint 9 across Hebrew 9 and 10', () => {
    expect(canonicalToEnglish(9, 20)).toEqual({ chapter: 9, verse: 20 });
    expect(canonicalToEnglish(9, 21)).toEqual({ chapter: 10, verse: 1 });
  });

  it('merges Septuagint 114 and 115 into Hebrew 116', () => {
    expect(canonicalToEnglish(114, 9)).toEqual({ chapter: 116, verse: 9 });
    expect(canonicalToEnglish(115, 1)).toEqual({ chapter: 116, verse: 10 });
  });

  it('round-trips across the whole psalter', () => {
    for (let chapter = 1; chapter <= 150; chapter += 1) {
      for (let verse = 1; verse <= 8; verse += 1) {
        const english = canonicalToEnglish(chapter, verse);
        expect(englishToCanonical(english.chapter, english.verse)).toEqual({ chapter, verse });
      }
    }
  });
});

describe('book numbering', () => {
  it('leaves books the two orderings agree on', () => {
    expect(toLangBook(4, 'eng')).toBe(4);
    expect(toLangBook(47, 'geo')).toBe(47);
  });

  it('remaps the epistles English orders differently', () => {
    expect(toLangBook(48, 'eng')).toBe(62);
    expect(toLangBook(55, 'eng')).toBe(48);
  });

  it('round-trips every remapped book', () => {
    for (let book = 48; book <= 68; book += 1) {
      expect(toSharedBook(toLangBook(book, 'eng'), 'eng')).toBe(book);
    }
  });

  // The two orderings, in the languages that were checked against the API:
  // `w=48` returns James where the catholic epistles come first, and Romans
  // where they do not.
  it('follows the Georgian order in Ukrainian, Abkhazian and Ossetian', () => {
    (['ua', 'ab', 'os'] as const).forEach(lang => expect(toLangBook(48, lang)).toBe(48));
  });

  it('follows the English order in Spanish, Greek and Japanese', () => {
    (['es', 'gr', 'jp'] as const).forEach(lang => expect(toLangBook(48, lang)).toBe(62));
  });
});

describe('book names', () => {
  it('names a book in its own language', () => {
    expect(bookName(4, 'eng')).toBe('Genesis');
    expect(bookName(46, 'es')).toBe('Juan');
  });

  // Greek's name array carries a stray fourth header before Genesis, so every
  // name in it sits one index later than the book id says.
  it('steps over the stray header in the Greek names', () => {
    expect(bookName(4, 'gr')).toBe('Γένεσις');
    expect(bookName(46, 'gr')).toBe('κατά Ιωάννην');
  });

  it('names the book a verse came back from, offset and all', () => {
    // `wigni` counts books from 1, past the three group headers.
    expect(apiBookName(1, 'eng')).toBe('Genesis');
    expect(apiBookName(1, 'gr')).toBe('Γένεσις');
  });
});

describe('parseReference', () => {
  it('reads a plain English reference', () => {
    expect(parseReference('John 3:16', 'geo')).toMatchObject({ chapter: 3, verse: 16, verseTo: null });
  });

  it('reads a range', () => {
    expect(parseReference('John 3:16-18', 'geo')).toMatchObject({ chapter: 3, verse: 16, verseTo: 18 });
  });

  it('reads a transliterated Georgian name', () => {
    expect(parseReference('ioane 3:16', 'geo')?.chapter).toBe(3);
  });

  it('returns null for something that is not a reference', () => {
    expect(parseReference('amazing grace', 'geo')).toBeNull();
  });
});

describe('versification', () => {
  it('knows chapter counts', () => {
    expect(chapterCount(22)).toBe(150);
    expect(chapterCount(999)).toBe(0);
  });

  it('counts a Septuagint psalm from the Masoretic table', () => {
    // LXX 9 is Hebrew 9 + 10.
    expect(verseCount(22, 9, 'geo')).toBe(verseCount(22, 9, 'eng') + verseCount(22, 10, 'eng'));
  });

  // Ukrainian follows the Septuagint split; every other added language does
  // not, Greek's own "Septuagint LXX" translation included.
  it('splits the psalms the way each language numbers them', () => {
    expect(fromCanonicalRef(22, 'ua', 10, 1)).toEqual({ chapter: 10, verse: 1 });
    expect(fromCanonicalRef(22, 'gr', 10, 1)).toEqual({ chapter: 11, verse: 1 });
    expect(verseCount(22, 9, 'ua')).toBe(verseCount(22, 9, 'gr') + verseCount(22, 10, 'gr'));
  });
});
