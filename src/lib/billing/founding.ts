
export type Cadence = 'monthly' | 'annual';

export const CADENCES: readonly Cadence[] = ['monthly', 'annual'];

export const cadenceOf = (value: string | null | undefined): Cadence =>
  value === 'annual' ? 'annual' : 'monthly';

export type FoundingTierId = 'founding' | 'early' | 'standard';

export interface TierPrice {
  priceCents: number;
  price: string;
  cadence: string;
  per: string;
}

export interface FoundingTier {
  id: FoundingTierId;
  lastSeat: number | null;
  monthly: TierPrice;
  annual: TierPrice;
}

export const FOUNDING_TIERS: readonly FoundingTier[] = [
  {
    id: 'founding',
    lastSeat: 10,
    monthly: { priceCents: 900, price: '$9', cadence: 'per month', per: 'a month' },
    annual: { priceCents: 8900, price: '$89', cadence: 'per year', per: 'a year' },
  },
  {
    id: 'early',
    lastSeat: 15,
    monthly: { priceCents: 1400, price: '$14', cadence: 'per month', per: 'a month' },
    annual: { priceCents: 13900, price: '$139', cadence: 'per year', per: 'a year' },
  },
  {
    id: 'standard',
    lastSeat: null,
    monthly: { priceCents: 1900, price: '$19', cadence: 'per month', per: 'a month' },
    annual: { priceCents: 18900, price: '$189', cadence: 'per year', per: 'a year' },
  },
];

export const priceOf = (tier: FoundingTier, cadence: Cadence): TierPrice => tier[cadence];

export const savingOf = (tier: FoundingTier): string =>
  `$${Math.round((tier.monthly.priceCents * 12 - tier.annual.priceCents) / 100)}`;

export const monthlyEquivalent = (tier: FoundingTier): string => {
  const cents = Math.round(tier.annual.priceCents / 12);

  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
};

export const ANNUAL_BADGE = '2 months free';

export const PER: Record<Cadence, string> = { monthly: '/month', annual: '/year' };

export const STANDARD_TIER = FOUNDING_TIERS[FOUNDING_TIERS.length - 1];

export const FOUNDING_SPOTS = FOUNDING_TIERS.reduce((last, tier) => tier.lastSeat ?? last, 0);

export const tierForSeat = (seat: number): FoundingTier =>
  FOUNDING_TIERS.find(tier => tier.lastSeat === null || seat <= tier.lastSeat) ?? STANDARD_TIER;

export const tierNow = (claimed: number): FoundingTier => tierForSeat(claimed + 1);

export const spotsLeftInTier = (claimed: number): number | null => {
  const { lastSeat } = tierNow(claimed);

  return lastSeat === null ? null : Math.max(0, lastSeat - claimed);
};

export const spotsInTier = (claimed: number): number | null => {
  const index = FOUNDING_TIERS.indexOf(tierNow(claimed));
  const tier = FOUNDING_TIERS[index];

  if (tier.lastSeat === null) return null;

  return tier.lastSeat - (index === 0 ? 0 : (FOUNDING_TIERS[index - 1].lastSeat ?? 0));
};

export const soldOut = (claimed: number): boolean => claimed >= FOUNDING_SPOTS;

export type MarkState = 'taken' | 'next' | 'open';

export const marks = (claimed: number): MarkState[] =>
  Array.from({ length: FOUNDING_SPOTS }, (_, index) =>
    index < claimed ? 'taken' : index === claimed ? 'next' : 'open',
  );

export const MARK_GROUPS: readonly FoundingTier[] = FOUNDING_TIERS.filter(tier => tier.lastSeat !== null);
