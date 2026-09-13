import { describe, expect, it } from 'vitest';

import { detectPsalms } from './psalms';
import type { ParsedBible, ParsedChapter } from './types';

const verses = (count: number) =>
  Array.from({ length: count }, (_, index): [number, string] => [index + 1, 'a verse']);

const psalter = (lengths: Record<number, number>): ParsedBible => ({
  format: 'osis',
  name: 'a Bible',
  books: [
    {
      position: 19,
      chapters: Object.entries(lengths).map(
        ([chapter, count]): ParsedChapter => ({ number: Number(chapter), verses: verses(count) }),
      ),
    },
  ],
});

describe('measuring the psalm split', () => {
  it('reads a merged ninth psalm as Septuagint', () => {
    expect(detectPsalms(psalter({ 9: 39, 116: 2 }))).toBe('lxx');
  });

  it('reads a short ninth psalm as Masoretic', () => {
    expect(detectPsalms(psalter({ 9: 20, 117: 2 }))).toBe('masoretic');
    expect(detectPsalms(psalter({ 9: 21, 117: 2 }))).toBe('masoretic');
  });

  it('falls back to the shortest psalm when the ninth is missing', () => {
    expect(detectPsalms(psalter({ 116: 2 }))).toBe('lxx');
    expect(detectPsalms(psalter({ 117: 2 }))).toBe('masoretic');
  });

  it('says nothing about a file with no psalms to measure', () => {
    expect(detectPsalms(psalter({}))).toBeNull();
    expect(detectPsalms({ format: 'usx', name: '', books: [] })).toBeNull();
  });
});
