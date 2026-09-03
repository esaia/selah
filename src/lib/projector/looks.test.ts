import { describe, expect, it } from 'vitest';

import { DEFAULT_LYRIC_LOOK, DEFAULT_VERSE_LOOK, LYRIC_LOOKS, VERSE_LOOKS, fitTo, lookOf } from './looks';

describe('lookOf', () => {
  it('finds a stored look', () => {
    expect(lookOf('corner', false).label).toBe('Reference in corner');
    expect(lookOf('lower', true).heightRatio).toBeLessThan(0.5);
  });

  it('falls back for a row written before the looks existed', () => {
    expect(lookOf('', false).value).toBe(DEFAULT_VERSE_LOOK);
    expect(lookOf(undefined, true).value).toBe(DEFAULT_LYRIC_LOOK);
  });

  it('falls back for a look this build does not have', () => {
    expect(lookOf('somethingelse', false).value).toBe(DEFAULT_VERSE_LOOK);
  });

  it('does not read a verse look as a lyric one', () => {
    // 'plate' is in both lists and must stay; 'chip' is verses only.
    expect(lookOf('chip', true).value).toBe(DEFAULT_LYRIC_LOOK);
    expect(lookOf('plate', true).value).toBe('plate');
  });
});

describe('fitTo', () => {
  const look = lookOf('fill', true);

  it('searches the whole band when the size is scaled both ways', () => {
    const { min, max } = fitTo(look, 1000, { min: 10, scale: 'both', size: 9 });

    expect(min).toBe(10);
    expect(max).toBe(250);
  });

  it('pins the size when nothing is scaled', () => {
    const { min, max } = fitTo(look, 1000, { min: 10, scale: 'none', size: 9 });

    expect(min).toBe(90);
    expect(max).toBe(90);
  });

  it('falls back to fitting when no size has been chosen', () => {
    expect(fitTo(look, 1000, { min: 10, scale: 'none', size: 0 }).max).toBe(250);
  });
});

describe('the look registries', () => {
  it('name each look once', () => {
    for (const looks of [VERSE_LOOKS, LYRIC_LOOKS]) {
      expect(new Set(looks.map(look => look.value)).size).toBe(looks.length);
    }
  });

  it('contain their own default', () => {
    expect(VERSE_LOOKS.some(look => look.value === DEFAULT_VERSE_LOOK)).toBe(true);
    expect(LYRIC_LOOKS.some(look => look.value === DEFAULT_LYRIC_LOOK)).toBe(true);
  });
});
