import { NextResponse, type NextRequest } from 'next/server';

import { dodo, productFor, siteUrl } from '@/lib/billing/dodo';
import { cadenceOf } from '@/lib/billing/founding';
import { claimSeat } from '@/lib/billing/seats';
import { admin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const POST = async (request: NextRequest) => {
  const cadence = cadenceOf(
    await request
      .json()
      .then((body: { cadence?: string }) => body?.cadence)
      .catch(() => null),
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });

  if (user.is_anonymous) {
    return NextResponse.json(
      { error: 'Sign in with Google first — a demo room cannot hold a subscription.', code: 'anonymous' },
      { status: 401 },
    );
  }

  if (!process.env.DODO_PAYMENTS_API_KEY) {
    return NextResponse.json({ error: 'billing is not configured yet' }, { status: 503 });
  }

  const db = admin();
  const { data: row } = await db
    .from('subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const client = dodo();
  let customer = row?.provider_customer_id ?? null;

  if (!customer) {
    const created = await client.customers.create({
      email: user.email ?? '',
      name: user.email ?? 'Operator',
      metadata: { user_id: user.id },
    });

    customer = created.customer_id;
    await db.from('subscriptions').update({ provider_customer_id: customer }).eq('user_id', user.id);
  }

  const { tier } = await claimSeat(user.id);
  const product = productFor(tier, cadence);

  if (!product) {
    return NextResponse.json({ error: 'billing is not configured yet' }, { status: 503 });
  }

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: product, quantity: 1 }],
    customer: { customer_id: customer },
    return_url: `${siteUrl()}/studio?upgraded=1`,
    metadata: { user_id: user.id },
  });

  if (!session.checkout_url) {
    return NextResponse.json({ error: 'could not open checkout' }, { status: 502 });
  }

  return NextResponse.json({ url: session.checkout_url });
};
