import Link from 'next/link';

import { PLANS } from '@/lib/billing/plans';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl">Pricing</h1>
      <p className="text-ink-500 mt-4">
        Free covers a congregation putting verses on a screen. Pro is for teams running the whole service.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {Object.values(PLANS).map(plan => (
          <div
            key={plan.id}
            className={
              plan.id === 'pro'
                ? 'border-brand-500/50 bg-ink-900 rounded-xl border p-6'
                : 'border-ink-850 rounded-xl border p-6'
            }
          >
            <h2 className="text-sm tracking-[0.2em] uppercase">{plan.name}</h2>

            <p className="mt-4">
              <span className="text-4xl">{plan.price}</span>
              <span className="text-ink-500 ml-2 text-sm">{plan.cadence}</span>
            </p>

            <p className="text-ink-500 mt-4 text-sm">{plan.blurb}</p>

            <ul className="text-ink-300 mt-6 space-y-2 text-sm">
              {plan.highlights.map(item => (
                <li key={item} className="flex gap-2">
                  <span className="text-brand-400">·</span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className={
                plan.id === 'pro'
                  ? 'bg-brand-500 text-ink-950 hover:bg-brand-400 mt-8 block rounded-lg px-4 py-2.5 text-center text-sm font-medium transition'
                  : 'border-ink-800 hover:border-ink-700 mt-8 block rounded-lg border px-4 py-2.5 text-center text-sm transition'
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
