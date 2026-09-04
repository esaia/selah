import { describe, expect, it } from 'vitest';

import type { ShowData, Verse } from '@/lib/types';

import { keepSame, sameVerse } from './keepSame';

const verse = (bv: string, muxli = 16): Verse[] => [{ bv, wigni: 43, tavi: 3, muxli }];

const geo = verse('რადგან ისე შეიყვარა ღმერთმა ქვეყნიერება');
const eng = verse('For God so loved the world');
const ru = verse('Ибо так возлюбил Бог мир');

describe('keeping identity across a payload that says nothing new', () => {
  it('hands back the object already on screen when the content matches', () => {
    const current = { eng } as ShowData;

    expect(keepSame(current, { eng: verse('For God so loved the world') } as ShowData)).toBe(current);
  });

  it('takes the new one when anything actually differs', () => {
    const current = { eng } as ShowData;
    const next = { eng: verse('For God so loved the world', 17) } as ShowData;

    expect(keepSame(current, next)).toBe(next);
  });
});

describe('the same verse, wearing a different set of languages', () => {
  // The operator disarms Georgian mid-service. The English line is word for
  // word the one already up, so the screen drops a line rather than blinking.
  it('is the same verse when a language is dropped', () => {
    expect(sameVerse({ geo, eng } as ShowData, { eng } as ShowData)).toBe(true);
  });

  it('is the same verse when one is added back', () => {
    expect(sameVerse({ eng } as ShowData, { geo, eng } as ShowData)).toBe(true);
  });

  it('is the same verse however many move at once', () => {
    expect(sameVerse({ geo, eng, ru } as ShowData, { eng } as ShowData)).toBe(true);
  });

  // The verse itself moved. That is a change the room should see.
  it('is not the same verse when a shared language reads differently', () => {
    expect(sameVerse({ geo, eng } as ShowData, { eng: verse('For God so loved the world', 17) } as ShowData)).toBe(
      false,
    );
  });

  // Nothing in common is a blank screen or a different passage, not "the same
  // verse with less of it" — both deserve the transition.
  it('is not the same verse when the two share no language', () => {
    expect(sameVerse({ geo } as ShowData, { eng } as ShowData)).toBe(false);
    expect(sameVerse({ eng } as ShowData, {} as ShowData)).toBe(false);
    expect(sameVerse({} as ShowData, {} as ShowData)).toBe(false);
  });

  // A song has no languages to arm, so its text changing is always a new slide.
  it('never applies to song slides', () => {
    const lyrics = { text: 'Amazing grace', title: 'Amazing grace' };

    expect(sameVerse({ lyrics } as ShowData, { lyrics } as ShowData)).toBe(false);
    expect(sameVerse({ eng } as ShowData, { eng, lyrics } as ShowData)).toBe(false);
  });

  // An empty language is not a shared one: `{ geo: [] }` says the operator has
  // it armed and there is nothing in it, which is not a line to keep.
  it('does not count a language that is present but empty', () => {
    expect(sameVerse({ geo, eng } as ShowData, { geo: [], eng: [] } as ShowData)).toBe(false);
  });
});
