import Link from 'next/link';

import { PLANS } from '@/lib/billing/plans';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl text-studio-text">Pricing</h1>
      <p className="text-studio-muted mt-4">
        Free covers a congregation putting verses on a screen. Pro is for teams running the whole service.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {Object.values(PLANS).map(plan => (
          <div
            key={plan.id}
            className={
              plan.id === 'pro'
                ? 'rounded-studio-lg border border-studio-accent/50 bg-studio-surface p-6 shadow-studio-panel'
                : 'rounded-studio-lg border border-studio-divider p-6'
            }
          >
            <h2 className="text-sm tracking-[0.2em] text-studio-muted uppercase">{plan.name}</h2>

            <p className="mt-4">
              <span className="text-4xl text-studio-text">{plan.price}</span>
              <span className="text-studio-muted ml-2 text-sm">{plan.cadence}</span>
            </p>

            <p className="text-studio-muted mt-4 text-sm">{plan.blurb}</p>

            <ul className="text-studio-text mt-6 space-y-2 text-sm">
              {plan.highlights.map(item => (
                <li key={item} className="flex gap-2">
                  <span className="text-studio-accent">·</span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className={
                plan.id === 'pro'
                  ? 'mt-8 block rounded-studio bg-studio-accent px-4 py-2.5 text-center text-sm font-medium text-studio-onaccent transition-colors duration-150 hover:bg-[#ffe97a]'
                  : 'mt-8 block rounded-studio border border-studio-border px-4 py-2.5 text-center text-sm text-studio-text transition-colors duration-150 hover:border-studio-faint hover:bg-studio-surface'
              }
            >
              {plan.id === 'pro' ? 'Start with Pro' : 'Start free'}
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
