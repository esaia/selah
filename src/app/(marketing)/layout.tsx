import Link from 'next/link';

import { AuthLink } from '@/components/marketing/AuthLink';
import { Wordmark } from '@/components/brand/Wordmark';
import { SOLUTIONS } from '@/lib/marketing/solutions';
import { USE_CASES } from '@/lib/marketing/useCases';

const NAV = [
  { href: '/solutions', label: 'Solutions' },
  { href: '/use-cases', label: 'Use cases' },
  { href: '/compare', label: 'Compare' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'Questions' },
];

const FOOTER = [
  {
    title: 'Product',
    links: [
              { href: '/pricing', label: 'Pricing' },
      { href: '/faq', label: 'Questions' },
    ],
  },
  {
    title: 'Compare',
    links: [
      { href: '/compare', label: 'All five, side by side' },
      { href: '/propresenter-alternative', label: 'vs ProPresenter' },
      { href: '/easyworship-alternative', label: 'vs EasyWorship' },
      { href: '/freeshow-alternative', label: 'vs FreeShow' },
      { href: '/proclaim-alternative', label: 'vs Proclaim' },
      { href: '/stagetimer-alternative', label: 'vs StageTimer' },
      { href: '/propresenter-vs-easyworship', label: 'ProPresenter vs EasyWorship' },
    ],
  },
  {
    title: 'Used for',
    links: [
      ...USE_CASES.slice(0, 4).map(useCase => ({
        href: `/use-cases/${useCase.slug}`,
        label: useCase.name,
      })),
      { href: '/use-cases', label: 'Every use case' },
    ],
  },
  {
    title: 'Your church',
    links: [
      ...SOLUTIONS.slice(0, 4).map(solution => ({
        href: `/solutions/${solution.slug}`,
        label: solution.name,
      })),
      { href: '/solutions', label: 'Every kind of church' },
    ],
  },
];

export default function MarketingLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="site flex min-h-dvh flex-col">
      <header className="relative z-10">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3.5 sm:gap-8 sm:py-4">
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

          <AuthLink
            className="ml-auto rounded-studio bg-site-ink px-3.5 py-2 text-sm font-medium whitespace-nowrap text-white
              transition-colors duration-150 hover:bg-site-ink/85 sm:px-4 md:ml-0"
          />
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-site-rule">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] lg:gap-8">
            <div>
              <Wordmark on="light" className="text-[17px] sm:text-[19px]" />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-site-muted">
                Scripture and songs on the projector, the stream and the stage — from one browser tab.
              </p>
            </div>

            {FOOTER.map(column => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-[13px] font-semibold tracking-wide text-site-faint uppercase">{column.title}</h2>

                <ul className="mt-4 space-y-2.5">
                  {column.links.map(link => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-site-muted transition-colors hover:text-site-ink">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div
            className="mt-12 flex flex-col gap-3 border-t border-site-rule pt-6 text-sm text-site-muted
              sm:flex-row sm:items-center sm:justify-between"
          >
            <p>© {new Date().getFullYear()} LlamaPresenter</p>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <a href="mailto:hello@llamapresenter.com" className="transition-colors hover:text-site-ink">
                hello@llamapresenter.com
              </a>
              <AuthLink className="transition-colors hover:text-site-ink" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
