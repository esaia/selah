import { redirect } from 'next/navigation';

import { planOf } from '@/lib/billing/entitlements';
import { cadenceOf } from '@/lib/billing/founding';
import { plansFor } from '@/lib/billing/plans';
import { claimedSpots } from '@/lib/billing/seats';
import { configured, createClient } from '@/lib/supabase/server';

import { StartCheckout } from './start-checkout';

export const metadata = { title: 'Upgrade to Pro' };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const cadence = cadenceOf((await searchParams).billing);

  if (!configured()) redirect('/login');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/upgrade');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle();

  if (planOf(subscription?.plan) === 'pro') redirect('/studio');

  const pro = plansFor(await claimedSpots(), cadence).pro;

  return <StartCheckout billing={cadence} price={pro.price} cadence={pro.cadence} />;
}
