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

  // The two orderings, checked against the API when each was mirrored: `w=48`
  // returns James where the catholic epistles come first, and Romans where
  // they do not.
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

  // Georgian and Russian follow the Septuagint split; Greek, Latin and Arabic
  // do not, despite Greek being the language the Septuagint is named for.
  it('splits the psalms the way each language numbers them', () => {
    expect(fromCanonicalRef(22, 'ru', 10, 1)).toEqual({ chapter: 10, verse: 1 });
    expect(fromCanonicalRef(22, 'gr', 10, 1)).toEqual({ chapter: 11, verse: 1 });
    expect(verseCount(22, 9, 'ru')).toBe(verseCount(22, 9, 'gr') + verseCount(22, 10, 'gr'));
  });
});

describe('the language catalogue', () => {
  // `LANGS` is what makes `Lang` a closed union and `languages.json` is what
  // the rows are; nothing in the type system ties them together, and the
  // catalogue is rewritten by a script that talks to a third party.
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
  // `books.json` is what `scripts/mirror.mjs` walks — it cannot import the
  // TypeScript, and it must not trust the API's own chapter count, which is
  // wrong for a good number of books (Leviticus comes back as 40, 2 John as 3).
  it('agrees with the versification table about every book', () => {
    Object.entries(books.chapters).forEach(([book, count]) => {
      expect(chapterCount(Number(book))).toBe(count);
    });
  });

  it('covers the whole canon', () => {
    expect(Object.keys(books.chapters)).toHaveLength(66);
    expect(Object.values(books.chapters).reduce((a, b) => a + b, 0)).toBe(1189);
  });

  // The verse counts are what tells a chapter that came back short from one a
  // translation simply does not have every verse of.
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
  // The catalogue is generated from `bible_text` and there is no fallback to
  // anyone else, so anything offered here has to be something we hold. A
  // translation in this list that is not in the database is a 404 on a Sunday.
  it('opens every language on a translation it lists', () => {
    LANGS.forEach(lang => expect(specOf(lang).versions).toContain(defaultVersionOf(lang)));
  });

  // A new console opens on this, and it is a deliberate choice rather than
  // whichever translation happened to sort first: the WEB is the only modern
  // English here, and the only one outright dedicated to the public domain.
  // The KJV reads as 400-year-old English and is under Crown copyright in the
  // UK; the Basic English Bible's public-domain status is genuinely disputed.
  it('opens English on the World English Bible', () => {
    expect(defaultVersionOf('eng')).toBe('WEB-World English Bible');
  });

  // Georgian and Russian are the reason this app exists; English is the
  // fallback every output lands on.
  it('carries the languages the console cannot do without', () => {
    (['geo', 'eng', 'ru'] as const).forEach(lang => expect(LANGS).toContain(lang));
  });
});
