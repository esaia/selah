'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Cadence } from '@/lib/billing/founding';
import { supabase } from '@/lib/supabase/client';

export const StartCheckout = ({
  billing,
  price,
  cadence,
}: {
  billing: Cadence;
  price: string;
  cadence: string;
}) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);

  const start = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cadence: billing }),
      });
      const body = (await res.json()) as { url?: string; error?: string; code?: string };

      if (res.ok && body.url) {
        window.location.replace(body.url);
        return;
      }

      if (body.code === 'anonymous') {
        await supabase().auth.signOut();
        router.push('/login?next=/upgrade');
        return;
      }

      setError(body.error ?? 'Checkout would not open.');
    } catch {
      setError('Checkout would not open.');
    }
  }, [billing, router]);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void start();
  }, [start]);

  return (
    <main className="grid min-h-dvh place-items-center bg-studio-bg px-6">
      <div className="w-full max-w-sm text-center">
        {error ? (
          <>
            <h1 className="text-2xl text-studio-text">Not this time</h1>
            <p className="mt-2 text-sm leading-relaxed text-studio-muted">{error}</p>

            <button
              type="button"
              onClick={() => void start()}
              className="mt-6 w-full rounded-studio bg-studio-accent px-4 py-2.5 text-sm font-medium
                text-studio-onaccent transition-colors duration-150 hover:bg-studio-accent/85"
            >
              Try again
            </button>

            <Link href="/studio" className="mt-4 inline-block text-sm text-studio-muted underline underline-offset-4">
              Back to the console
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl text-studio-text">Opening checkout…</h1>
            <p className="mt-2 text-sm leading-relaxed text-studio-muted">
              Pro is {price} {cadence}. Cancel whenever you like — everything you have made stays yours, and stays
              where it is.
            </p>
          </>
        )}
      </div>
    </main>
  );
};
