'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase/client';
import { loadTurnstile } from '@/lib/turnstile';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const TryFreeButton = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const widgetEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const resolveToken = useRef<((token: string | undefined) => void) | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;

    let cancelled = false;

    void loadTurnstile().then(turnstile => {
      if (cancelled || !widgetEl.current || widgetId.current) return;

      widgetId.current = turnstile.render(widgetEl.current, {
        sitekey: SITE_KEY,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: token => resolveToken.current?.(token),
        'error-callback': () => resolveToken.current?.(undefined),
      });
    });

    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    };
  }, []);

  const captchaToken = () =>
    new Promise<string | undefined>(resolve => {
      if (!widgetId.current || !window.turnstile) return resolve(undefined);

      resolveToken.current = resolve;
      window.turnstile.execute(widgetId.current);
    });

  const start = async () => {
    setBusy(true);
    setFailed(false);

    const {
      data: { user },
    } = await supabase().auth.getUser();

    if (!user) {
      const captchaTokenValue = await captchaToken();
      const { error } = await supabase().auth.signInAnonymously(
        captchaTokenValue ? { options: { captchaToken: captchaTokenValue } } : undefined,
      );

      if (error) {
        console.error('signInAnonymously failed', error);
        setBusy(false);
        setFailed(true);
        return;
      }
    }

    router.push('/studio');
  };

  return (
    <span className="flex flex-col gap-2">
      <button type="button" onClick={start} disabled={busy} className={className}>
        {busy ? 'Opening the console…' : children}
      </button>

      <div ref={widgetEl} />

      {failed ? <span className="text-sm text-site-muted">Could not start a session. Please try again.</span> : null}
    </span>
  );
};
