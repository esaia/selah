import { describe, expect, it } from 'vitest';

import { anyBlack, asBlackout, NO_BLACKOUT, toggleScreen } from './blackout';

describe('reading a blackout back', () => {
  it('takes only the two flags, and only when they are true', () => {
    expect(asBlackout({ audience: true, stage: false })).toEqual({ audience: true, stage: false });
    expect(asBlackout({ audience: 'yes', stage: 1 })).toEqual(NO_BLACKOUT);
  });

  // A row written before screens could be blacked says nothing about them, and
  // a screen nobody asked to black must come up showing what is live.
  it('is not black when there is nothing to read', () => {
    expect(asBlackout(null)).toEqual(NO_BLACKOUT);
    expect(asBlackout(undefined)).toEqual(NO_BLACKOUT);
    expect(asBlackout('black')).toEqual(NO_BLACKOUT);
  });
});

describe('the keys', () => {
  it('blacks one screen without touching the other', () => {
    const black = toggleScreen(NO_BLACKOUT, 'audience');

    expect(black).toEqual({ audience: true, stage: false });
    expect(toggleScreen(black, 'audience')).toEqual(NO_BLACKOUT);
    expect(toggleScreen(black, 'stage')).toEqual({ audience: true, stage: true });
  });

  it('says when anything is black', () => {
    expect(anyBlack(NO_BLACKOUT)).toBe(false);
    expect(anyBlack({ audience: false, stage: true })).toBe(true);
  });
});
