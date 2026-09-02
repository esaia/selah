import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';

import { stripe } from '@/lib/billing/stripe';
import { admin } from '@/lib/supabase/admin';

/**
 * Stripe's view of a subscription, written into ours.
 *
 * The signature is what authorises this route, so it runs with the service role
 * and never trusts the body until `constructEvent` has verified it. Everything
 * about a plan is decided here rather than at checkout, because a subscription
 * also ends, lapses on a failed payment, and resumes — none of which the
 * browser is present for.
 */
const RELEVANT = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export const POST = async (request: NextRequest) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');

  if (!secret || !signature) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  if (!RELEVANT.has(event.type)) return NextResponse.json({ received: true });

  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.user_id;
  const db = admin();

  // A subscription created outside checkout has no metadata; fall back to the
  // customer id we stored when the operator first upgraded.
  const target = userId
    ? { user_id: userId }
    : (await db
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', String(subscription.customer))
        .maybeSingle()).data;

  if (!target?.user_id) return NextResponse.json({ received: true });

  const active = ['active', 'trialing'].includes(subscription.status);
  const period = subscription.items.data[0]?.current_period_end;

  await db
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: String(subscription.customer),
      plan: active ? 'pro' : 'free',
      status: subscription.status,
      current_period_end: period ? new Date(period * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('user_id', target.user_id);

  return NextResponse.json({ received: true });
};
