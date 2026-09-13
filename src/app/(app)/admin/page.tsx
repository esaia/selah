import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getAdminUser } from '@/lib/admin/guard';
import { admin } from '@/lib/supabase/admin';
import { Wordmark } from '@/components/brand/Wordmark';

import { AdminTable, type AdminRow } from './AdminTable';

export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const user = await getAdminUser();

  if (!user) redirect('/studio');

  const db = admin();
  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    db.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }),
    db.from('subscriptions').select('user_id, plan, status, current_period_end, cancel_at_period_end'),
  ]);

  const byUser = new Map((subscriptions ?? []).map(row => [row.user_id, row]));

  const rows: AdminRow[] = (profiles ?? [])
    .filter(profile => profile.email || profile.full_name)
    .map(profile => {
      const sub = byUser.get(profile.id);

      return {
        id: profile.id,
        email: profile.email ?? profile.full_name ?? profile.id,
        createdAt: profile.created_at,
        plan: sub?.plan ?? 'free',
        status: sub?.status ?? 'active',
        currentPeriodEnd: sub?.current_period_end ?? null,
        cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      };
    });

  return (
    <div className="min-h-dvh bg-studio-bg text-studio-text">
      <header
        className="flex h-12 shrink-0 items-center justify-between border-b border-studio-border bg-studio-bg px-4"
      >
        <Link href="/studio" aria-label="LlamaPresenter — the console">
          <Wordmark className="truncate text-base" />
        </Link>

        <p className="text-xs text-studio-muted">Admin · {user.email}</p>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-lg font-medium">Users</h1>
        <p className="mt-1 text-sm text-studio-muted">
          {rows.length} signed up · {rows.filter(row => row.plan === 'pro').length} on Pro
        </p>

        <div className="mt-6">
          <AdminTable rows={rows} />
        </div>
      </main>
    </div>
  );
}
