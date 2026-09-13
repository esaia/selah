import { describe, expect, it } from 'vitest';

import {
  CADENCES,
  cadenceOf,
  FOUNDING_SPOTS,
  FOUNDING_TIERS,
  marks,
  monthlyEquivalent,
  priceOf,
  savingOf,
  soldOut,
  spotsInTier,
  spotsLeftInTier,
  tierForSeat,
  tierNow,
} from './founding';

describe('the ladder', () => {
  it('holds fifteen spots below the standard price', () => {
    expect(FOUNDING_SPOTS).toBe(15);
  });

  it('ends on a rung that never fills', () => {
    expect(FOUNDING_TIERS[FOUNDING_TIERS.length - 1].lastSeat).toBeNull();
  });

  it('prices a seat by which rung it lands on', () => {
    expect(tierForSeat(1).monthly.price).toBe('$9');
    expect(tierForSeat(10).monthly.price).toBe('$9');
    expect(tierForSeat(11).monthly.price).toBe('$14');
    expect(tierForSeat(15).monthly.price).toBe('$14');
    expect(tierForSeat(16).monthly.price).toBe('$19');
    expect(tierForSeat(4000).monthly.price).toBe('$19');
  });

  it('quotes the next church the rung after the spots already gone', () => {
    expect(tierNow(0).monthly.price).toBe('$9');
    expect(tierNow(9).monthly.price).toBe('$9');
    expect(tierNow(10).monthly.price).toBe('$14');
    expect(tierNow(14).monthly.price).toBe('$14');
    expect(tierNow(15).monthly.price).toBe('$19');
  });
});

describe('paying by the year', () => {
  it('prices a year on the rung the seat lands on', () => {
    expect(priceOf(tierForSeat(1), 'annual').price).toBe('$89');
    expect(priceOf(tierForSeat(11), 'annual').price).toBe('$139');
    expect(priceOf(tierForSeat(16), 'annual').price).toBe('$189');
  });

  it('asks less for a year than for twelve months, on every rung', () => {
    for (const tier of FOUNDING_TIERS) {
      expect(tier.annual.priceCents).toBeLessThan(tier.monthly.priceCents * 12);
    }
  });

  it('is two months free, give or take the rounding to a round price', () => {
    for (const tier of FOUNDING_TIERS) {
      expect(tier.annual.priceCents).toBeLessThanOrEqual(tier.monthly.priceCents * 10);
      expect(tier.annual.priceCents).toBeGreaterThanOrEqual(tier.monthly.priceCents * 10 - 100);
    }
  });

  it('says what a year saves, in whole dollars', () => {
    expect(savingOf(FOUNDING_TIERS[0])).toBe('$19');
    expect(savingOf(FOUNDING_TIERS[1])).toBe('$29');
    expect(savingOf(FOUNDING_TIERS[2])).toBe('$39');
  });

  it('says what a year works out at by the month', () => {
    expect(monthlyEquivalent(FOUNDING_TIERS[0])).toBe('$7.42');
    expect(monthlyEquivalent(FOUNDING_TIERS[2])).toBe('$15.75');
  });

  it('reads a cadence off a query string, and falls to the month', () => {
    expect(cadenceOf('annual')).toBe('annual');
    expect(cadenceOf('monthly')).toBe('monthly');
    expect(cadenceOf(undefined)).toBe('monthly');
    expect(cadenceOf('yearly')).toBe('monthly');
    expect(cadenceOf('ANNUAL')).toBe('monthly');
  });

  it('offers both cadences on every rung', () => {
    for (const tier of FOUNDING_TIERS) {
      for (const cadence of CADENCES) {
        expect(priceOf(tier, cadence).priceCents).toBeGreaterThan(0);
      }
    }
  });
});

describe('what the page counts down', () => {
  it('counts down the rung being sold, not the whole ladder', () => {
    expect(spotsLeftInTier(0)).toBe(10);
    expect(spotsLeftInTier(7)).toBe(3);
    expect(spotsLeftInTier(10)).toBe(5);
    expect(spotsLeftInTier(14)).toBe(1);
  });

  it('knows how big the rung being sold is', () => {
    expect(spotsInTier(0)).toBe(10);
    expect(spotsInTier(9)).toBe(10);
    expect(spotsInTier(10)).toBe(5);
    expect(spotsInTier(14)).toBe(5);
    expect(spotsInTier(15)).toBeNull();
  });

  it('stops counting once the ladder is spent', () => {
    expect(spotsLeftInTier(15)).toBeNull();
    expect(soldOut(14)).toBe(false);
    expect(soldOut(15)).toBe(true);
    expect(soldOut(200)).toBe(true);
  });
});

describe('the row of marks', () => {
  it('draws one mark per founding spot', () => {
    expect(marks(0)).toHaveLength(FOUNDING_SPOTS);
  });

  it('puts the yellow mark on the spot the reader would take', () => {
    const row = marks(7);

    expect(row.slice(0, 7).every(state => state === 'taken')).toBe(true);
    expect(row[7]).toBe('next');
    expect(row.slice(8).every(state => state === 'open')).toBe(true);
  });

  it('leaves no next mark once every spot is gone', () => {
    expect(marks(15).every(state => state === 'taken')).toBe(true);
  });
});
