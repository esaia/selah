import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getUser } from '@/lib/supabase/server';

import { GoogleButton } from './google-button';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, error } = await searchParams;
  const user = await getUser();

  if (user) redirect(typeof next === 'string' ? next : '/studio');

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-studio-accent text-sm tracking-[0.2em] uppercase">
          Selah
        </Link>

        <h1 className="mt-6 text-3xl">Sign in</h1>
        <p className="text-studio-muted mt-2 text-sm">
          Your passages, songs and projector look follow your account onto whichever machine is running the service.
        </p>

        {error ? (
          <div className="border-studio-live/40 bg-studio-live/10 mt-6 rounded-studio border px-3 py-2">
            <p className="text-studio-text text-sm">That sign-in did not complete.</p>
            {typeof error === 'string' && error !== '1' ? (
              <p className="text-studio-text mt-1 font-mono text-xs break-words">{error}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8">
          <GoogleButton next={typeof next === 'string' ? next : '/studio'} />
        </div>

        <p className="text-studio-faint mt-6 text-xs">Google is the only way in for now. Email sign-in is coming.</p>
      </div>
    </main>
  );
}
