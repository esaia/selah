import { unstable_cache } from 'next/cache';

import { admin } from '@/lib/supabase/admin';

import { FOUNDING_SPOTS, tierForSeat, type FoundingTier } from './founding';

const countSpots = async (): Promise<number> => {
  try {
    const { data, error } = await admin().rpc('founding_claimed');

    if (error || typeof data !== 'number') return 0;

    return Math.min(data, FOUNDING_SPOTS);
  } catch {
    return 0;
  }
};

export const claimedSpots = unstable_cache(countSpots, ['founding-claimed'], { revalidate: 60 });

export const claimSeat = async (userId: string): Promise<{ seat: number; tier: FoundingTier }> => {
  const { data, error } = await admin().rpc('claim_founding_seat', { uid: userId });

  if (error || typeof data !== 'number') {
    throw new Error(`could not take a founding spot: ${error?.message ?? 'no seat returned'}`);
  }

  return { seat: data, tier: tierForSeat(data) };
};
