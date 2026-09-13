import DodoPayments from 'dodopayments';

import type { Cadence, FoundingTier, FoundingTierId } from './founding';

export const dodo = () => {
  const key = process.env.DODO_PAYMENTS_API_KEY;

  if (!key) throw new Error('DODO_PAYMENTS_API_KEY is not set');

  return new DodoPayments({
    bearerToken: key,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode' ? 'live_mode' : 'test_mode',
  });
};

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const PRO_STATUSES = new Set(['active', 'past_due', 'on_hold']);

export const planFromStatus = (status: string | null | undefined): 'free' | 'pro' =>
  status && PRO_STATUSES.has(status) ? 'pro' : 'free';

const products = (): Record<Cadence, Record<FoundingTierId, string | undefined>> => ({
  monthly: {
    founding: process.env.DODO_PAYMENTS_PRODUCT_PRO_FOUNDING,
    early: process.env.DODO_PAYMENTS_PRODUCT_PRO_EARLY,
    standard: process.env.DODO_PAYMENTS_PRODUCT_PRO_STANDARD || process.env.DODO_PAYMENTS_PRODUCT_PRO,
  },
  annual: {
    founding: process.env.DODO_PAYMENTS_PRODUCT_PRO_FOUNDING_ANNUAL,
    early: process.env.DODO_PAYMENTS_PRODUCT_PRO_EARLY_ANNUAL,
    standard: process.env.DODO_PAYMENTS_PRODUCT_PRO_STANDARD_ANNUAL || process.env.DODO_PAYMENTS_PRODUCT_PRO_ANNUAL,
  },
});

export const productFor = (tier: FoundingTier, cadence: Cadence): string | undefined =>
  products()[cadence][tier.id];
