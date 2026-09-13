import { describe, expect, it } from 'vitest';

import books from '@/lib/bible/books.json';
import { bookName } from '@/lib/bible/passage';

import { bookByName, bookByOsis, bookByPosition, bookByUsfm, CANON } from './canon';

describe('the canon table', () => {
  it('holds the 66 books once each', () => {
    expect(CANON).toHaveLength(66);
    expect(new Set(CANON.map(book => book.usfm)).size).toBe(66);
    expect(new Set(CANON.map(book => book.osis)).size).toBe(66);
    expect(new Set(CANON.map(book => book.shared)).size).toBe(66);
  });

  it('lands every book on the shared id the app counts in', () => {
    expect(bookByUsfm('GEN')?.shared).toBe(4);
    expect(bookByUsfm('REV')?.shared).toBe(69);
    expect(bookByUsfm('JAS')?.shared).toBe(48);
    expect(bookByUsfm('ROM')?.shared).toBe(55);
  });

  it('names each of them what the English catalogue names it', () => {
    for (const book of CANON) {
      expect(bookName(book.shared, 'eng')).toBe(book.english === 'Habakkuk' ? 'Habbakuk' : book.english);
    }
  });

  it('agrees with books.json about how many there are', () => {
    expect(CANON).toHaveLength(Object.keys(books.chapters).length);
  });
});

describe('finding a book', () => {
  it('by its number in canonical order', () => {
    expect(bookByPosition(1)?.usfm).toBe('GEN');
    expect(bookByPosition(66)?.usfm).toBe('REV');
    expect(bookByPosition(0)).toBeNull();
    expect(bookByPosition(67)).toBeNull();
  });

  it('by a USFM code, however it is cased', () => {
    expect(bookByUsfm('gen')?.position).toBe(1);
    expect(bookByUsfm(' 1CO ')?.position).toBe(46);
    expect(bookByUsfm('TOB')).toBeNull();
  });

  it('by an osisID, whole or just the book', () => {
    expect(bookByOsis('Gen.1.1')?.position).toBe(1);
    expect(bookByOsis('1Thess')?.position).toBe(52);
    expect(bookByOsis('Sir.1.1')).toBeNull();
  });

  it('by a written-out name, spelled loosely', () => {
    expect(bookByName('Genesis')?.position).toBe(1);
    expect(bookByName('1Thessalonians')?.position).toBe(52);
    expect(bookByName('song of songs')?.position).toBe(22);
    expect(bookByName('Psalm')?.position).toBe(19);
  });

  it('accepts an abbreviation only when one book answers to it', () => {
    expect(bookByName('Rev')?.position).toBe(66);
    expect(bookByName('J')).toBeNull();
  });

  it('finds nothing in a book we do not carry', () => {
    expect(bookByName('Tobit')).toBeNull();
    expect(bookByName('')).toBeNull();
  });
});
