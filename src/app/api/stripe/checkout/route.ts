import { NextResponse } from 'next/server';

import { siteUrl, stripe } from '@/lib/billing/stripe';
import { admin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/** Start a Pro subscription for the signed-in operator. */
export const POST = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });

  const price = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;

  if (!price) return NextResponse.json({ error: 'billing is not configured yet' }, { status: 503 });

  const db = admin();
  const { data: subscription } = await db
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const client = stripe();
  let customer = subscription?.stripe_customer_id ?? null;

  if (!customer) {
    const created = await client.customers.create({ email: user.email, metadata: { user_id: user.id } });

    customer = created.id;
    await db.from('subscriptions').update({ stripe_customer_id: customer }).eq('user_id', user.id);
  }

  const session = await client.checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price, quantity: 1 }],
    success_url: `${siteUrl()}/studio?upgraded=1`,
    cancel_url: `${siteUrl()}/pricing`,
    // The webhook is the source of truth, and it needs to know whose row to update.
    subscription_data: { metadata: { user_id: user.id } },
  });

  return NextResponse.json({ url: session.url });
};
