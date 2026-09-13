import { describe, expect, it } from 'vitest';

import { batched, rowsOf } from './rows';
import type { ParsedBible } from './types';

const bible: ParsedBible = {
  format: 'zefania',
  name: 'Our own edition',
  books: [
    {
      position: 1,
      chapters: [
        { number: 2, verses: [[1, 'Thus the heavens']] },
        { number: 1, verses: [[2, 'And the earth'], [1, 'In the beginning']] },
      ],
    },
    { position: 59, chapters: [{ number: 1, verses: [[1, 'James, a servant']] }] },
  ],
};

describe('a parsed Bible as rows', () => {
  it('stores the book id the language’s own requests carry', () => {
    expect(rowsOf(bible, 'eng', 't1').map(row => row.book)).toEqual([4, 4, 62]);
    expect(rowsOf(bible, 'geo', 't1').map(row => row.book)).toEqual([4, 4, 48]);
  });

  it('stamps wigni the way every mirrored row has it', () => {
    for (const row of rowsOf(bible, 'eng', 't1')) expect(row.wigni).toBe(row.book - 3);
  });

  it('says how many chapters the book has here, not how many it should', () => {
    expect(rowsOf(bible, 'eng', 't1').map(row => row.chapters)).toEqual([2, 2, 1]);
  });

  it('puts the verses of a chapter in order', () => {
    expect(rowsOf(bible, 'eng', 't1')[1].verses).toEqual([
      [1, 'In the beginning'],
      [2, 'And the earth'],
    ]);
  });

  it('carries the translation it belongs to on every row', () => {
    expect(rowsOf(bible, 'eng', 't1').every(row => row.translation_id === 't1')).toBe(true);
  });

  it('writes no row for a chapter with nothing in it', () => {
    const empty: ParsedBible = { ...bible, books: [{ position: 1, chapters: [{ number: 1, verses: [] }] }] };

    expect(rowsOf(empty, 'eng', 't1')).toEqual([]);
  });
});

describe('batching', () => {
  it('splits a Bible into round trips and loses nothing', () => {
    const rows = Array.from({ length: 250 }, (_, index) => index);

    expect(batched(rows).map(batch => batch.length)).toEqual([100, 100, 50]);
    expect(batched(rows).flat()).toEqual(rows);
  });

  it('has nothing to send when there is nothing', () => {
    expect(batched([])).toEqual([]);
  });
});
