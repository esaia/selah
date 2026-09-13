'use client';

import Link from 'next/link';

import { CountingPrice } from '@/components/billing/CountingPrice';
import type { Cadence } from '@/lib/billing/founding';
import type { Plan, PlanId } from '@/lib/billing/plans';

import { useCadence } from './cadence';
import { CadenceSwitch } from './CadenceSwitch';
import { PlanPrice } from './PlanPrice';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

export const HomePlanCards = ({ plans }: { plans: Record<Cadence, Record<PlanId, Plan>> }) => {
  const [cadence] = useCadence();

  return (
    <div>
      <div className="flex sm:justify-end">
        <CadenceSwitch />
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {Object.values(plans[cadence]).map((plan: Plan) => (
          <div
            key={plan.id}
            className={
              plan.id === 'pro'
                ? 'flex flex-col rounded-studio-lg border border-site-ink bg-site-surface p-6 shadow-sm'
                : 'flex flex-col rounded-studio-lg border border-site-rule bg-site-bg p-6'
            }
          >
            <h3 className="text-sm text-site-muted">{plan.name}</h3>

            <div className="mt-3">
              <PlanPrice plan={plan} size="text-4xl" display={DISPLAY} />
            </div>

            <ul className="mt-4 flex-1 space-y-2 text-[15px] text-site-muted">
              {plan.highlights.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <Link
              href={plan.cta.href}
              className={
                plan.id === 'pro'
                  ? `mt-8 block rounded-studio bg-site-accent px-4 py-2.5 text-center text-[15px] font-medium
                     text-site-onaccent transition-colors duration-150 hover:bg-site-accent/85`
                  : `mt-8 block rounded-studio border border-site-rule px-4 py-2.5 text-center text-[15px]
                     text-site-ink transition-colors duration-150 hover:bg-site-band`
              }
            >
              {plan.id === 'pro' ? (
                <>
                  {plan.cta.label} — <CountingPrice value={plan.price} /> {plan.cadence}
                </>
              ) : (
                plan.cta.label
              )}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
