'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';

export interface AdminRow {
  id: string;
  email: string;
  createdAt: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const readable = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const Row = ({ row }: { row: AdminRow }) => {
  const [plan, setPlan] = useState(row.plan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const flip = async () => {
    const next = plan === 'pro' ? 'free' : 'pro';

    setBusy(true);
    setError('');

    const response = await fetch('/api/admin/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: row.id, plan: next }),
    });

    if (response.ok) {
      setPlan(next);
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? 'Something went wrong.');
    }

    setBusy(false);
  };

  return (
    <tr className="border-t border-studio-divider/60">
      <td className="px-4 py-2.5">
        <span className="block truncate text-studio-text">{row.email}</span>
        <span className="block text-[11px] text-studio-faint">Joined {readable(row.createdAt)}</span>
      </td>

      <td className="px-4 py-2.5">
        <span
          className={
            plan === 'pro'
              ? 'rounded-[4px] bg-studio-accent/12 px-1.5 py-0.5 text-[11px] font-medium text-studio-accent'
              : 'rounded-[4px] bg-studio-surface px-1.5 py-0.5 text-[11px] font-medium text-studio-faint'
          }
        >
          {plan === 'pro' ? 'Pro' : 'Free'}
        </span>
      </td>

      <td className="px-4 py-2.5 text-xs text-studio-muted">
        {row.status}
        {row.cancelAtPeriodEnd ? ' · cancels' : ''}
      </td>

      <td className="px-4 py-2.5 text-xs text-studio-muted">{readable(row.currentPeriodEnd)}</td>

      <td className="px-4 py-2.5 text-right">
        <Button size="sm" variant={plan === 'pro' ? 'ghost' : 'accent'} loading={busy} onClick={() => void flip()}>
          {plan === 'pro' ? 'Revert to Free' : 'Grant Pro'}
        </Button>

        {error ? <p className="mt-1 text-[11px] text-studio-danger">{error}</p> : null}
      </td>
    </tr>
  );
};

export const AdminTable = ({ rows }: { rows: AdminRow[] }) => (
  <div className="overflow-x-auto rounded-studio border border-studio-divider">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-studio-faint">
          <th className="px-4 py-2">Operator</th>
          <th className="px-4 py-2">Plan</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Renews / ends</th>
          <th className="px-4 py-2 text-right">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {rows.map(row => (
          <Row key={row.id} row={row} />
        ))}
      </tbody>
    </table>
  </div>
);
