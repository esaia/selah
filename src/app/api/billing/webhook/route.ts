import { NextResponse, type NextRequest } from 'next/server';
import type { WebhookPayload } from 'dodopayments/resources';
import { Webhook } from 'standardwebhooks';

import { planFromStatus } from '@/lib/billing/dodo';
import { admin } from '@/lib/supabase/admin';

const RELEVANT = new Set([
  'subscription.active',
  'subscription.renewed',
  'subscription.on_hold',
  'subscription.past_due',
  'subscription.paused',
  'subscription.unpaused',
  'subscription.cancelled',
  'subscription.failed',
  'subscription.expired',
  'subscription.plan_changed',
  'subscription.updated',
]);

export const POST = async (request: NextRequest) => {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const body = await request.text();

  let event: WebhookPayload;

  try {
    new Webhook(secret).verify(body, {
      'webhook-id': request.headers.get('webhook-id') ?? '',
      'webhook-signature': request.headers.get('webhook-signature') ?? '',
      'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
    });

    event = JSON.parse(body) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  if (!RELEVANT.has(event.type) || event.data.payload_type !== 'Subscription') {
    return NextResponse.json({ received: true });
  }

  const subscription = event.data;
  const db = admin();

  const userId =
    (typeof subscription.metadata?.user_id === 'string' ? subscription.metadata.user_id : null) ??
    (
      await db
        .from('subscriptions')
        .select('user_id')
        .eq('provider_customer_id', subscription.customer.customer_id)
        .maybeSingle()
    ).data?.user_id;

  if (!userId) return NextResponse.json({ received: true });

  const plan = planFromStatus(subscription.status);

  await db
    .from('subscriptions')
    .update({
      provider: 'dodo',
      provider_subscription_id: subscription.subscription_id,
      provider_customer_id: subscription.customer.customer_id,
      plan,
      status: subscription.status,
      current_period_end: subscription.next_billing_date ?? null,
      cancel_at_period_end: subscription.cancel_at_next_billing_date,
      event_at: event.timestamp,
      ...(plan === 'pro' ? { founding_reserved_at: null } : {}),
    })
    .eq('user_id', userId)
    .or(`event_at.is.null,event_at.lte.${event.timestamp}`);

  return NextResponse.json({ received: true });
};
