import { describe, expect, it } from 'vitest';

import books from './books.json';
import catalogue from './languages.json';
import { defaultVersionOf, LANGS, specOf } from './languages';
import { canonicalToEnglish, englishToCanonical, fromCanonicalRef } from './psalms';
import { englishBooks } from './englishBooks';
import { apiBookName, bookName, toLangBook, toSharedBook, parseReference } from './passage';
import { chapterCount, verseCount, versesPerChapter } from './versification';

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

  it('follows the Georgian order in Georgian and Russian', () => {
    (['geo', 'ru'] as const).forEach(lang => expect(toLangBook(48, lang)).toBe(48));
  });

  it('follows the English order in Greek, Latin and Arabic', () => {
    (['gr', 'la', 'ae'] as const).forEach(lang => expect(toLangBook(48, lang)).toBe(62));
  });
});

describe('book names', () => {
  it('names a book in its own language', () => {
    expect(bookName(4, 'eng')).toBe('Genesis');
    expect(bookName(46, 'la')).toBe('Ioannem');
  });

  it('steps over the stray header in the Greek names', () => {
    expect(bookName(4, 'gr')).toBe('Γένεσις');
    expect(bookName(46, 'gr')).toBe('κατά Ιωάννην');
  });

  it('names the book a verse came back from, offset and all', () => {
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
    expect(verseCount(22, 9, 'geo')).toBe(verseCount(22, 9, 'eng') + verseCount(22, 10, 'eng'));
  });

  it('splits the psalms the way each language numbers them', () => {
    expect(fromCanonicalRef(22, specOf('ru').psalms, 10, 1)).toEqual({ chapter: 10, verse: 1 });
    expect(fromCanonicalRef(22, specOf('gr').psalms, 10, 1)).toEqual({ chapter: 11, verse: 1 });
    expect(verseCount(22, 9, 'ru')).toBe(verseCount(22, 9, 'gr') + verseCount(22, 10, 'gr'));
  });
});

describe('the language catalogue', () => {
  it('holds exactly the languages LANGS names, in the same order', () => {
    expect(Object.keys(catalogue)).toEqual([...LANGS]);
  });

  it('gives every language a translation to open on', () => {
    LANGS.forEach(lang => {
      const spec = specOf(lang);

      expect(spec.versions.length).toBeGreaterThan(0);

      if (spec.defaultVersion) {
        expect(spec.versions).toContain(spec.defaultVersion);
      }
    });
  });

  it('gives every language three group headers and 66 books', () => {
    LANGS.forEach(lang => {
      const spec = specOf(lang);

      expect(spec.names).toHaveLength(69 + spec.nameOffset);
    });
  });
});

describe('the book table', () => {
  it('agrees with the versification table about every book', () => {
    Object.entries(books.chapters).forEach(([book, count]) => {
      expect(chapterCount(Number(book))).toBe(count);
    });
  });

  it('covers the whole canon', () => {
    expect(Object.keys(books.chapters)).toHaveLength(66);
    expect(Object.values(books.chapters).reduce((a, b) => a + b, 0)).toBe(1189);
  });

  it('agrees with the versification table about every chapter', () => {
    Object.entries(books.verses).forEach(([book, counts]) => {
      expect(counts).toEqual(versesPerChapter[Number(book)]);
    });

    expect(Object.values(books.verses).flat().reduce((a, b) => a + b, 0)).toBe(31102);
  });

  it('agrees with the English remap', () => {
    Object.entries(books.englishBooks).forEach(([shared, english]) => {
      expect(englishBooks[Number(shared)]).toBe(english);
    });
  });
});

describe('what the library can serve', () => {
  it('opens every language on a translation it lists', () => {
    LANGS.forEach(lang => expect(specOf(lang).versions).toContain(defaultVersionOf(lang)));
  });

  it('opens English on the World English Bible', () => {
    expect(defaultVersionOf('eng')).toBe('WEB-World English Bible');
  });

  it('carries the languages the console cannot do without', () => {
    (['geo', 'eng', 'ru'] as const).forEach(lang => expect(LANGS).toContain(lang));
  });
});
