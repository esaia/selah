import { NextResponse } from 'next/server';

import { dodo } from '@/lib/billing/dodo';
import { admin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const POST = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'sign in first' }, { status: 401 });

  const { data: row } = await admin()
    .from('subscriptions')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row?.provider_customer_id) {
    return NextResponse.json({ error: 'no subscription to manage' }, { status: 400 });
  }

  const session = await dodo().customers.customerPortal.create(row.provider_customer_id);

  return NextResponse.json({ url: session.link });
};
