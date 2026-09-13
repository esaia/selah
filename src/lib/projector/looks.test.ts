import { describe, expect, it } from 'vitest';

import {
  CUSTOM_LOOK,
  customLook,
  DEFAULT_LYRIC_LOOK,
  DEFAULT_VERSE_LOOK,
  LYRIC_LOOKS,
  isCustomLook,
  MAX_TEXT_SIZE,
  templateIdOf,
  VERSE_LOOKS,
  fitTo,
  lookOf,
} from './looks';

describe('lookOf', () => {
  it('finds a stored look', () => {
    expect(lookOf('chip', false).label).toBe('Reference chip');
    expect(lookOf('lower', true).heightRatio).toBeLessThan(0.5);
  });

  it('falls back for a look that has since been dropped', () => {
    expect(lookOf('corner', false).value).toBe(DEFAULT_VERSE_LOOK);
  });

  it('falls back for a row written before the looks existed', () => {
    expect(lookOf('', false).value).toBe(DEFAULT_VERSE_LOOK);
    expect(lookOf(undefined, true).value).toBe(DEFAULT_LYRIC_LOOK);
  });

  it('falls back for a look this build does not have', () => {
    expect(lookOf('somethingelse', false).value).toBe(DEFAULT_VERSE_LOOK);
  });

  it('does not read a verse look as a lyric one', () => {
    expect(lookOf('chip', true).value).toBe(DEFAULT_LYRIC_LOOK);
    expect(lookOf('plate', true).value).toBe('plate');
  });
});

describe('fitTo', () => {
  const look = lookOf('fill', true);

  it('takes the size as a ceiling while it is fitting', () => {
    const { min, max } = fitTo(look, 1000, { min: 10, scale: 'both', size: 9 });

    expect(min).toBe(10);
    expect(max).toBe(90);
  });

  it('lets the size raise the look past its own ceiling', () => {
    expect(fitTo(look, 1000, { min: 10, scale: 'both', size: MAX_TEXT_SIZE }).max).toBe(300);
  });

  it('falls back to the look when no size has been chosen', () => {
    expect(fitTo(look, 1000, { min: 10, scale: 'both', size: 0 }).max).toBe(250);
  });

  it('ignores the pixel cap once a size is set, so a bigger screen scales', () => {
    expect(fitTo(look, 1000, { cap: 200, min: 10, scale: 'both', size: 0 }).max).toBe(200);
    expect(fitTo(look, 1000, { cap: 200, min: 10, scale: 'both', size: 25 }).max).toBe(250);
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

describe('a custom look', () => {
  it('names which of the operator\'s templates is on', () => {
    expect(customLook('abc')).toBe('custom:abc');
    expect(templateIdOf(customLook('abc'))).toBe('abc');
    expect(isCustomLook(customLook('abc'))).toBe(true);
  });

  it('reads a bare custom, which is a row written before the library', () => {
    expect(isCustomLook(CUSTOM_LOOK)).toBe(true);
    expect(templateIdOf(CUSTOM_LOOK)).toBe('');
  });

  it('is not a shipped look, however it is spelled', () => {
    expect(isCustomLook('plate')).toBe(false);
    expect(isCustomLook(undefined)).toBe(false);
  });

  it('fits like the custom row whichever template it names', () => {
    expect(lookOf(customLook('abc'), false).selfFit).toBe(true);
    expect(lookOf(customLook('abc'), true).selfFit).toBe(true);
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

describe('the custom look', () => {
  it('is offered for both kinds of slide, which keep separate templates', () => {
    expect(VERSE_LOOKS.some(look => look.value === CUSTOM_LOOK)).toBe(true);
    expect(LYRIC_LOOKS.some(look => look.value === CUSTOM_LOOK)).toBe(true);
  });

  it('fits itself, and is the only look that does', () => {
    expect(lookOf(CUSTOM_LOOK, false).selfFit).toBe(true);
    expect(lookOf(CUSTOM_LOOK, true).selfFit).toBe(true);
    expect([...VERSE_LOOKS, ...LYRIC_LOOKS].filter(look => look.selfFit)).toHaveLength(2);
  });

  it('is not what an empty or unknown look falls back to', () => {
    expect(lookOf('', false).value).toBe(DEFAULT_VERSE_LOOK);
    expect(lookOf('', true).value).toBe(DEFAULT_LYRIC_LOOK);
    expect(lookOf('nonsense', false).value).toBe(DEFAULT_VERSE_LOOK);
  });
});
