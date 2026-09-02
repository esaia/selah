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
        <Link href="/" className="text-brand-400 text-sm tracking-[0.2em] uppercase">
          Selah
        </Link>

        <h1 className="mt-6 text-3xl">Sign in</h1>
        <p className="text-ink-500 mt-2 text-sm">
          Your passages, songs and projector look follow your account onto whichever machine is running the service.
        </p>

        {error ? (
          <p className="border-live/40 bg-live/10 text-ink-100 mt-6 rounded-lg border px-3 py-2 text-sm">
            That sign-in did not complete. Try once more.
          </p>
        ) : null}

        <div className="mt-8">
          <GoogleButton next={typeof next === 'string' ? next : '/studio'} />
        </div>

        <p className="text-ink-700 mt-6 text-xs">Google is the only way in for now. Email sign-in is coming.</p>
      </div>
    </main>
  );
}
