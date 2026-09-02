import Link from 'next/link';

import { getUser } from '@/lib/supabase/server';

export default async function MarketingLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-studio-divider border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-studio-accent text-sm tracking-[0.25em] uppercase">
            Selah
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/pricing" className="text-studio-text hover:text-studio-text transition">
              Pricing
            </Link>
            <Link
              href={user ? '/studio' : '/login'}
              className="rounded-studio bg-studio-accent px-3 py-1.5 font-medium text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
            >
              {user ? 'Open console' : 'Sign in'}
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-studio-divider text-studio-faint border-t px-6 py-8 text-center text-xs">
        Selah — scripture on the screen, in three languages at once.
      </footer>
    </div>
  );
}
