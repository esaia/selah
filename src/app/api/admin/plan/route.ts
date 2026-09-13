import { NextResponse, type NextRequest } from 'next/server';

import { getAdminUser } from '@/lib/admin/guard';
import { admin } from '@/lib/supabase/admin';

export const POST = async (request: NextRequest) => {
  const adminUser = await getAdminUser();

  if (!adminUser) return NextResponse.json({ error: 'not authorised' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { userId?: string; plan?: string } | null;
  const userId = body?.userId;
  const plan = body?.plan;

  if (!userId || (plan !== 'free' && plan !== 'pro')) {
    return NextResponse.json({ error: 'userId and plan (free|pro) are required' }, { status: 400 });
  }

  const db = admin();
  const { error } = await db.from('subscriptions').update({ plan, status: 'active' }).eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
