'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { supabase } from '@/lib/supabase/client';

export const AuthLink = ({ className }: { className?: string }) => {
  const [signedIn, setSignedIn] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(Boolean(data.session));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const href = signedIn ? '/studio' : '/login';

  return (
    <Link
      href={href}
      className={className}
      aria-disabled={pending}
      onClick={event => {
        event.preventDefault();
        startTransition(() => router.push(href));
      }}
    >
      {pending ? 'Opening…' : signedIn ? 'Open console' : 'Sign in'}
    </Link>
  );
};
