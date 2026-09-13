'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FoundingSpots } from '@/components/studio/settings/FoundingSpots';
import { supabase } from '@/lib/supabase/client';
import { gatesEnforced, planOf } from '@/lib/billing/entitlements';
import { FREE_LIMITS, LIMIT_LABELS, type LimitKey } from '@/lib/billing/limits';
import { plansFor } from '@/lib/billing/plans';
import { LIMIT_GROUPS, proLimitValue } from '@/lib/billing/table';
import { useAudio } from '@/lib/studio/AudioProvider';
import { useStudio } from '@/lib/studio/StudioProvider';

const BUILT: LimitKey[] = ['songs', 'playlists', 'audio_tracks', 'custom_templates', 'name_cards', 'custom_fonts'];

const readable = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

const STATES: Record<string, { tone: string; says: string }> = {
  active: { tone: 'text-studio-on', says: 'Active' },
  past_due: { tone: 'text-studio-danger', says: 'Payment failed' },
  on_hold: { tone: 'text-studio-danger', says: 'Payment failed' },
  paused: { tone: 'text-studio-muted', says: 'Paused' },
  cancelled: { tone: 'text-studio-muted', says: 'Cancelled' },
  expired: { tone: 'text-studio-muted', says: 'Ended' },
};

export const AccountSection = () => {
  const { email, isGuest, plan, billing, usage, claimedSpots } = useStudio();
  const router = useRouter();
  const { tracks, categories } = useAudio();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const plans = plansFor(claimedSpots);
  const current = plans[planOf(plan)];
  const free = current.id === 'free';
  const pro = plans.pro;

  const used = (key: LimitKey) =>
    key === 'audio_tracks' ? tracks.length : key === 'audio_categories' ? categories.length : usage[key];

  const state = STATES[billing.status] ?? { tone: 'text-studio-muted', says: billing.status };
  const renews = readable(billing.renewsAt);
  const troubled = billing.status === 'past_due' || billing.status === 'on_hold';

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

  const manage = (
    <button
      type="button"
      onClick={() => void go('/api/billing/portal')}
      disabled={busy}
      className="shrink-0 rounded-studio border border-studio-border px-3 py-1.5 text-xs transition-colors
        duration-150 hover:border-studio-faint disabled:opacity-60"
    >
      Manage subscription
    </button>
  );

  return (
    <div className="space-y-6 text-sm">
      <div className="rounded-studio border border-studio-divider p-4">
        <p className="text-xs text-studio-muted">{isGuest ? 'Trying it out as' : 'Signed in as'}</p>
        <p className="mt-1 break-all">{isGuest ? 'a guest, no account yet' : email || 'Unknown'}</p>
      </div>

      <div className="overflow-hidden rounded-studio border border-studio-divider">
        <div className="flex items-baseline justify-between gap-3 border-b border-studio-divider px-4 py-3">
          <div>
            <p className="text-xs text-studio-muted">Your plan</p>

            <p className="mt-0.5 flex items-baseline gap-2 text-lg leading-none">
              {current.name}
              {free ? null : <span className={`text-xs ${state.tone}`}>{state.says}</span>}
            </p>
          </div>

          <p className="shrink-0 text-xs text-studio-muted">
            <span className="text-studio-text">{current.price}</span> {current.cadence}
          </p>
        </div>

        <p className="px-4 py-3 text-xs leading-relaxed text-studio-muted">{current.blurb}</p>

        {gatesEnforced ? null : (
          <p className="mx-4 mb-3 rounded-studio bg-studio-surface px-3 py-2 text-xs text-studio-accent">
            Every ceiling below is off for everyone while the tiers are being settled.
          </p>
        )}

        {free && !isGuest ? (
          <table className="w-full border-t border-studio-divider text-xs">
            <thead>
              <tr className="text-studio-faint">
                <th className="px-4 py-2 text-left font-normal">
                  <span className="sr-only">What is being counted</span>
                </th>
                <th className="px-2 py-2 text-right font-normal">Free</th>
                <th className="px-4 py-2 text-right font-normal">Pro</th>
              </tr>
            </thead>

            <tbody>
              {LIMIT_GROUPS.map(group => (
                <Fragment key={group.title}>
                  <tr>
                    <th
                      colSpan={3}
                      scope="colgroup"
                      className="border-t border-studio-divider px-4 pt-4 pb-1 text-left text-[11px]
                        font-semibold tracking-wider text-studio-faint uppercase"
                    >
                      {group.title}
                    </th>
                  </tr>

                  {group.keys.map(key => {
                    const limit = FREE_LIMITS[key];
                    const count = used(key);
                    const full = gatesEnforced && limit > 0 && count !== undefined && count >= limit;

                    return (
                      <tr key={key} className="border-t border-studio-divider/60">
                        <td className="px-4 py-2 text-studio-text">
                          {LIMIT_LABELS[key].many}

                          {limit > 0 && count !== undefined ? (
                            <span className={full ? 'ml-2 text-studio-accent' : 'ml-2 text-studio-faint'}>
                              {full ? 'full' : `${count} used`}
                            </span>
                          ) : null}
                        </td>

                        <td className={`px-2 py-2 text-right ${full ? 'text-studio-accent' : 'text-studio-muted'}`}>
                          {limit === 0 ? 'Pro only' : limit}
                        </td>

                        <td className="px-4 py-2 text-right text-studio-text">{proLimitValue(key)}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="border-t border-studio-divider px-4 py-4">
            <p className="text-xs text-studio-text">
              {isGuest
                ? 'Every ceiling is off while you’re trying it out. Sign up when you’re ready to send this to a ' +
                  'real screen.'
                : 'Everything is unlimited, except three languages on a slide — which is how many fit before a ' +
                  'slide stops being readable, and not something we would charge for.'}
            </p>

            <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-4">
              {BUILT.map(key => (
                <div key={key}>
                  <dt className="text-[11px] leading-tight text-studio-faint">{LIMIT_LABELS[key].many}</dt>
                  <dd className="mt-0.5 text-lg leading-none text-studio-text">{used(key) ?? 0}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="border-t border-studio-divider px-4 py-4">
          {free ? (
            <>
              <FoundingSpots claimed={claimedSpots} />

              <button
                type="button"
                onClick={() =>
                  isGuest
                    ? void supabase()
                        .auth.signOut()
                        .then(() => router.push('/login?next=/upgrade'))
                    : void go('/api/billing/checkout')
                }
                disabled={busy}
                className="w-full rounded-studio bg-studio-accent px-3 py-2 text-sm font-medium text-studio-onaccent
                  transition-colors duration-150 hover:bg-studio-accent/85 disabled:opacity-60"
              >
                {isGuest ? 'Sign in to go Pro' : `Upgrade to Pro for ${pro.price}/month`}
              </button>

              <p className="mt-2 text-center text-[11px] leading-relaxed text-studio-faint">
                {isGuest
                  ? 'This demo room stays behind — signing in opens a real one.'
                  : 'Cancel whenever you like. Everything you have made stays yours, and stays where it is.'}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-studio-muted">
                {troubled
                  ? 'The last payment did not go through. Pro keeps working for now — update the card to keep it that way.'
                  : billing.ending && renews
                    ? `Ends ${renews}. Everything you have made stays yours.`
                    : renews
                      ? `Renews ${renews}.`
                      : 'Change the card, or cancel, whenever you like.'}
              </p>

              {manage}
            </div>
          )}

          {error ? <p className="mt-3 text-xs text-studio-danger">{error}</p> : null}
        </div>
      </div>

      <form action="/auth/signout" method="post">
        <button type="submit" className="text-xs text-studio-muted hover:text-studio-text">
          Sign out
        </button>
      </form>
    </div>
  );
};
