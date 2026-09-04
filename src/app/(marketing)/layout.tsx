import Link from 'next/link';

import { Wordmark } from '@/components/brand/Wordmark';
import { getUser } from '@/lib/supabase/server';

const NAV = [
  { href: '/#room', label: 'How it works' },
  { href: '/#languages', label: 'Languages' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'Questions' },
];

/**
 * The pages a visitor sees before they sign in.
 *
 * Light, unlike everything else in this app: `.site` is the whole of that
 * decision — see the `--color-site-*` block in globals.css for why the console
 * goes the other way.
 */
export default async function MarketingLayout({ children }: LayoutProps<'/'>) {
  const user = await getUser();

  return (
    <div className="site flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-site-rule bg-site-bg/85 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5 sm:gap-8 sm:py-4">
          <Link
            href="/"
            aria-label="LlamaPresenter — home"
            className="rounded-studio focus:outline-none focus-visible:ring-2 focus-visible:ring-site-ink/30"
          >
            <Wordmark on="light" className="text-[16px] sm:text-[21px]" />
          </Link>

          <div className="ml-auto hidden items-center gap-7 text-sm md:flex">
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className="text-site-muted transition-colors hover:text-site-ink">
                {item.label}
              </Link>
            ))}
          </div>

          <Link
            href={user ? '/studio' : '/login'}
            className="ml-auto rounded-studio bg-site-ink px-3.5 py-2 text-sm font-medium whitespace-nowrap text-white
              transition-colors duration-150 hover:bg-site-ink/85 sm:px-4 md:ml-0"
          >
            {user ? 'Open console' : 'Sign in'}
          </Link>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-site-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Wordmark on="light" className="text-[17px] sm:text-[19px]" />
            <p className="mt-2 max-w-sm text-sm text-site-muted">
              Scripture and songs on the projector, the stream and the stage — from one browser tab.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-site-muted">
            <Link href="/pricing" className="transition-colors hover:text-site-ink">
              Pricing
            </Link>
            <Link href="/login" className="transition-colors hover:text-site-ink">
              Sign in
            </Link>
            <a href="mailto:hello@llamapresenter.com" className="transition-colors hover:text-site-ink">
              hello@llamapresenter.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
