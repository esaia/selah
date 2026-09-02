import Link from 'next/link';

import { PLANS } from '@/lib/billing/plans';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl">Pricing</h1>
      <p className="text-studio-muted mt-4">
        Free covers a congregation putting verses on a screen. Pro is for teams running the whole service.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {Object.values(PLANS).map(plan => (
          <div
            key={plan.id}
            className={
              plan.id === 'pro'
                ? 'border-studio-accent/50 bg-white rounded-studio-lg border p-6'
                : 'border-studio-divider rounded-studio-lg border p-6'
            }
          >
            <h2 className="text-sm tracking-[0.2em] uppercase">{plan.name}</h2>

            <p className="mt-4">
              <span className="text-4xl">{plan.price}</span>
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
                  ? 'bg-studio-accent text-white hover:bg-studio-accent mt-8 block rounded-studio px-4 py-2.5 text-center text-sm font-medium transition'
                  : 'border-studio-border hover:border-studio-faint mt-8 block rounded-studio border px-4 py-2.5 text-center text-sm transition'
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
