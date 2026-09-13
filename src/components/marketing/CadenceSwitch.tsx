'use client';

import { ANNUAL_BADGE, CADENCES, type Cadence } from '@/lib/billing/founding';

import { useCadence } from './cadence';

const LABELS: Record<Cadence, string> = { monthly: 'Monthly', annual: 'Yearly' };

export const CadenceSwitch = ({ className = '' }: { className?: string }) => {
  const [value, onChange] = useCadence();

  return (
    <div
      aria-label="How often you pay"
      role="group"
      className={`inline-flex items-center gap-1 rounded-full border border-site-rule bg-site-surface p-1 ${className}`}
    >
      {CADENCES.map(cadence => {
        const on = cadence === value;

        return (
          <button
            key={cadence}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(cadence)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors duration-150 ${
              on ? 'bg-site-ink font-medium text-white' : 'text-site-muted hover:text-site-ink'
            }`}
          >
            {LABELS[cadence]}

            {cadence === 'annual' ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] leading-none font-medium ${
                  on ? 'bg-site-accent text-site-onaccent' : 'bg-site-band text-site-muted'
                }`}
              >
                {ANNUAL_BADGE}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
