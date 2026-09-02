import Stripe from 'stripe';

/**
 * Created lazily: the app has to build and run without Stripe keys while the
 * tiers are still being decided, and only the three billing routes need it.
 */
export const stripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

  return new Stripe(key);
};

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
