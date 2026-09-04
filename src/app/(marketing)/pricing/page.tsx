import Link from 'next/link';

import { PLANS } from '@/lib/billing/plans';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-valera text-4xl tracking-tight text-site-ink">Pricing</h1>
      <p className="text-site-muted mt-4">
        Free covers a congregation putting verses on a screen. Pro is for teams running the whole service.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {Object.values(PLANS).map(plan => (
          <div
            key={plan.id}
            className={
              plan.id === 'pro'
                ? 'rounded-studio-lg border border-site-ink bg-site-surface p-6'
                : 'rounded-studio-lg border border-site-rule p-6'
            }
          >
            <h2 className="text-sm text-site-muted">{plan.name}</h2>

            <p className="mt-4">
              <span className="font-valera text-4xl tracking-tight text-site-ink">{plan.price}</span>
              <span className="text-site-muted ml-2 text-sm">{plan.cadence}</span>
            </p>

            <p className="text-site-muted mt-4 text-sm">{plan.blurb}</p>

            <ul className="mt-6 space-y-2 text-sm text-site-ink">
              {plan.highlights.map(item => (
                <li key={item} className="flex gap-2">
                  <span className="text-site-faint">·</span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className={
                plan.id === 'pro'
                  ? 'mt-8 block rounded-studio bg-site-accent px-4 py-2.5 text-center text-sm font-medium text-site-onaccent transition-transform duration-150 hover:-translate-y-px'
                  : 'mt-8 block rounded-studio border border-site-rule px-4 py-2.5 text-center text-sm text-site-ink transition-colors duration-150 hover:bg-site-band'
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
