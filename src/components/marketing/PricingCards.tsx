'use client';

import Link from 'next/link';

import type { Cadence } from '@/lib/billing/founding';
import type { Plan, PlanId } from '@/lib/billing/plans';
import { COMPARISON, type ComparisonRow, type PlanCell } from '@/lib/billing/table';

import { useCadence } from './cadence';
import { CadenceSwitch } from './CadenceSwitch';
import { PlanPrice } from './PlanPrice';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const CARD = 'flex flex-col rounded-studio-lg border p-6 sm:p-8 lg:row-span-5 lg:grid lg:grid-rows-subgrid';

const Tick = ({ muted = false }: { muted?: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden
    focusable="false"
    className={`mt-[3px] size-3.5 shrink-0 ${muted ? 'text-site-faint' : 'text-site-ink'}`}
  >
    <path
      d="M3 8.5 6.2 12 13 4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Cross = () => (
  <svg viewBox="0 0 16 16" aria-hidden focusable="false" className="mt-[3px] size-3.5 shrink-0 text-site-faint">
    <path
      d="M4 4l8 8M12 4l-8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const wording = (row: ComparisonRow, cell: PlanCell) => {
  if (cell === false || cell === true) return { lead: '', value: '', tail: row.label };
  if (cell === 'Unlimited') return { lead: '', value: 'Unlimited', tail: ` ${row.label}` };

  return { lead: 'Up to ', value: cell, tail: ` ${cell === '1' ? (row.one ?? row.label) : row.label}` };
};

const Line = ({ row, plan }: { row: ComparisonRow; plan: PlanId }) => {
  const cell = row[plan];
  const has = cell !== false;
  const { lead, value, tail } = wording(row, cell);

  return (
    <li className="flex gap-2.5 py-[7px] text-[15px] leading-snug">
      {has ? <Tick muted={plan === 'free' && value === ''} /> : <Cross />}

      <span className={has ? 'text-site-ink' : 'text-site-faint line-through decoration-site-faint/60'}>
        {lead}
        {value && <span className="font-semibold">{value}</span>}
        {row.note
          ? (
              <span tabIndex={0} className="group/tip relative outline-none">
                <span className="border-b border-dotted border-site-faint/70">{tail}</span>

                <span
                  role="tooltip"
                  className="pointer-events-none invisible absolute bottom-full left-0 z-10 mb-2 w-64 rounded-studio
                    border border-site-rule bg-site-surface px-3 py-2 text-[13px] leading-relaxed text-site-muted
                    opacity-0 shadow-sm transition-opacity duration-150 group-hover/tip:visible
                    group-hover/tip:opacity-100 group-focus/tip:visible group-focus/tip:opacity-100"
                >
                  {row.note}
                </span>
              </span>
            )
          : tail}
      </span>
    </li>
  );
};

const SMALL_PRINT: Record<Cadence, string> = {
  monthly: 'Monthly subscription. Cancel any time.',
  annual: 'Billed once a year. Cancel any time.',
};

export const PricingCards = ({ plans }: { plans: Record<Cadence, Record<PlanId, Plan>> }) => {
  const [cadence] = useCadence();

  return (
    <>
      <div className="mt-14 flex justify-center">
        <CadenceSwitch />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto_auto] lg:gap-y-0">
        {Object.values(plans[cadence]).map((plan: Plan) => (
          <div
            key={plan.id}
            className={
              plan.id === 'pro'
                ? `${CARD} border-site-ink bg-site-surface shadow-sm`
                : `${CARD} border-site-rule bg-site-surface/60`
            }
          >
            <h2 className={`${DISPLAY} text-xl`}>{plan.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-site-muted">{plan.blurb}</p>

            <div className="mt-6 self-end">
              <PlanPrice plan={plan} size="text-5xl" display={DISPLAY} />
            </div>

            <div className="mt-6 self-end">
              <Link
                href={plan.cta.href}
                className={
                  plan.id === 'pro'
                    ? 'block rounded-studio bg-site-accent px-4 py-3 text-center text-sm font-medium text-site-onaccent transition-colors duration-150 hover:bg-site-accent/85'
                    : 'block rounded-studio border border-site-rule px-4 py-3 text-center text-sm text-site-ink transition-colors duration-150 hover:bg-site-band'
                }
              >
                {plan.cta.label}
              </Link>

              <p className="mt-3 text-center text-[13px] text-site-faint">
                {plan.id === 'pro' ? SMALL_PRINT[cadence] : 'No card required.'}
              </p>
            </div>

            <div className="mt-8 space-y-7">
              {COMPARISON.map(group => (
                <section key={group.title}>
                  <h3 className="border-b border-site-rule pb-2 text-[15px] font-semibold text-site-ink">
                    {group.title}
                  </h3>

                  <ul className="mt-2 pl-1">
                    {group.rows.map(row => (
                      <Line key={row.label} row={row} plan={plan.id} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
