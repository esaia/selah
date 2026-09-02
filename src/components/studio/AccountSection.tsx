'use client';

import { useState } from 'react';

import { PLANS } from '@/lib/billing/plans';
import { gatesEnforced, planOf } from '@/lib/billing/entitlements';
import { useStudio } from '@/lib/studio/StudioProvider';

/** Plan, upgrade, and the way out of the account. */
export const AccountSection = () => {
  const { plan } = useStudio();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const current = PLANS[planOf(plan)];

  const go = async (path: string) => {
    setBusy(true);
    setError('');

    const response = await fetch(path, { method: 'POST' });
    const body = await response.json();

    if (body.url) {
      window.location.href = body.url;
      return;
    }

    setError(body.error ?? 'Something went wrong.');
    setBusy(false);
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="border-ink-850 rounded-lg border p-4">
        <p className="text-ink-500 text-xs">Your plan</p>
        <p className="mt-1 text-lg">{current.name}</p>
        <p className="text-ink-500 mt-2 text-xs">{current.blurb}</p>

        {gatesEnforced ? null : (
          <p className="text-brand-400 mt-3 text-xs">
            Every feature is unlocked for everyone while the tiers are being settled.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {current.id === 'free' ? (
            <button
              type="button"
              onClick={() => void go('/api/stripe/checkout')}
              disabled={busy}
              className="bg-brand-500 text-ink-950 hover:bg-brand-400 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-60"
            >
              Upgrade to Pro
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void go('/api/stripe/portal')}
              disabled={busy}
              className="border-ink-800 hover:border-ink-700 rounded-md border px-3 py-1.5 text-xs transition disabled:opacity-60"
            >
              Manage subscription
            </button>
          )}
        </div>

        {error ? <p className="text-live mt-3 text-xs">{error}</p> : null}
      </div>

      <form action="/auth/signout" method="post">
        <button type="submit" className="text-ink-500 text-xs hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
};
