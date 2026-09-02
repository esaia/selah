import Link from 'next/link';

import { getUser } from '@/lib/supabase/server';

export default async function MarketingLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-ink-850 border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-brand-400 text-sm tracking-[0.25em] uppercase">
            Selah
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/pricing" className="text-ink-300 hover:text-white transition">
              Pricing
            </Link>
            <Link
              href={user ? '/studio' : '/login'}
              className="bg-ink-100 text-ink-950 hover:bg-white rounded-md px-3 py-1.5 font-medium transition"
            >
              {user ? 'Open console' : 'Sign in'}
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-ink-850 text-ink-700 border-t px-6 py-8 text-center text-xs">
        Selah — scripture on the screen, in three languages at once.
      </footer>
    </div>
  );
}
