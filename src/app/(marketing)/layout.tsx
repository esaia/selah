import Link from 'next/link';

import { Wordmark } from '@/components/brand/Wordmark';
import { getUser } from '@/lib/supabase/server';

export default async function MarketingLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser();

  return (
    <div className="flex min-h-dvh flex-col bg-studio-bg">
      {/* The header is the one band of chrome on the page, so it sits on the
          bar's deeper black rather than the page's own ground. */}
      <header className="border-b border-studio-divider bg-studio-bar">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="LlamaPresenter — home" className="rounded-studio focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40">
            <Wordmark className="text-lg" />
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/pricing" className="text-studio-muted transition-colors hover:text-studio-text">
              Pricing
            </Link>
            <Link
              href={user ? '/studio' : '/login'}
              className="rounded-studio bg-studio-accent px-3.5 py-1.5 font-medium text-studio-onaccent
                transition-colors duration-150 hover:bg-[#ffe97a]"
            >
              {user ? 'Open console' : 'Sign in'}
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-studio-divider px-6 py-10 text-center text-xs text-studio-faint">
        LlamaPresenter — scripture on the screen, in three languages at once.
      </footer>
    </div>
  );
}
