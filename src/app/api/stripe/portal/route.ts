import { NextResponse } from 'next/server';

import { siteUrl, stripe } from '@/lib/billing/stripe';
import { admin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Send the operator to Stripe to change or cancel their plan. */
export const POST = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });

  const { data: subscription } = await admin()
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: 'no subscription to manage' }, { status: 400 });
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${siteUrl()}/studio`,
  });

  return NextResponse.json({ url: session.url });
};
