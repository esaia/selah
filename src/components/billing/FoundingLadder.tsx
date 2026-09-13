import { CountingPrice } from './CountingPrice';

import {
  FOUNDING_TIERS,
  MARK_GROUPS,
  marks,
  PER,
  priceOf,
  soldOut,
  spotsInTier,
  tierNow,
  type Cadence,
  type FoundingTierId,
} from '@/lib/billing/founding';

export interface SpotColors {
  '--spot-taken': string;
  '--spot-next': string;
  '--spot-open': string;
  '--spot-line': string;
}

export const GROUPS = MARK_GROUPS.map((tier, index) => ({
  tier,
  from: index === 0 ? 0 : (MARK_GROUPS[index - 1].lastSeat ?? 0),
  to: tier.lastSeat ?? 0,
}));

const STEP = 42;

const Mark = ({ state, delay, size }: { state: 'taken' | 'next' | 'open'; delay: number; size: number }) => (
  <span className="relative inline-flex">
    <span
      aria-hidden
      style={{ animationDelay: `${delay}ms`, width: size, height: size, borderRadius: Math.round(size / 5) }}
      className={`site-spot-in ${
        state === 'taken'
          ? 'bg-[var(--spot-taken)]'
          : state === 'next'
            ? 'bg-[var(--spot-next)] ring-1 ring-[var(--spot-line)]'
            : 'border border-[var(--spot-line)] bg-[var(--spot-open)]'
      }`}
    />

    {state === 'next' ? (
      <span
        aria-hidden
        style={{ animationDelay: `${delay + 220}ms`, borderRadius: Math.round(size / 5) }}
        className="site-spot-halo pointer-events-none absolute inset-0 ring-2 ring-[var(--spot-next)]"
      />
    ) : null}
  </span>
);

const gapFor = (size: number) => Math.max(4, Math.round(size / 2.8));

export const SpotGroup = ({
  claimed,
  from,
  to,
  size = 22,
  className = '',
}: {
  claimed: number;
  from: number;
  to: number;
  size?: number;
  className?: string;
}) => {
  const row = marks(claimed);

  return (
    <div aria-hidden className={`flex ${className}`} style={{ gap: gapFor(size) }}>
      {row.slice(from, to).map((state, index) => (
        <Mark key={from + index} state={state} delay={(from + index) * STEP} size={size} />
      ))}
    </div>
  );
};

export interface LadderColors extends SpotColors {
  '--ladder-strong': string;
  '--ladder-faint': string;
}

const GROUP_COPY: Record<FoundingTierId, string> = {
  founding: 'first 10 subscribers',
  early: 'next 5 subscribers',
  standard: 'after that',
};

const STRONG = 'text-[color:var(--ladder-strong)]';
const FAINT = 'text-[color:var(--ladder-faint)]';

const Rung = ({
  price,
  per,
  copy,
  forever,
  gone,
  size,
}: {
  price: string;
  per: string;
  copy: string;
  forever: boolean;
  gone: boolean;
  size: number;
}) => (
  <p className={gone || !forever ? FAINT : STRONG}>
    <CountingPrice
      value={price}
      className={`inline-block font-valera tracking-tight ${gone ? 'line-through' : ''}`}
      style={{ fontSize: size, lineHeight: 1.1 }}
    />

    <span className={`text-sm ${FAINT}`}>
      {per}
      {forever ? ' forever' : ''}
    </span>

    <span className={`mt-1 block text-[13px] leading-snug ${FAINT}`}>{copy}</span>
  </p>
);

export const FoundingLadder = ({
  claimed,
  cadence = 'monthly',
  compact = false,
  className = '',
}: {
  claimed: number;
  cadence?: Cadence;
  compact?: boolean;
  className?: string;
}) => {
  const standard = FOUNDING_TIERS[FOUNDING_TIERS.length - 1];

  if (soldOut(claimed)) {
    return (
      <p className={`max-w-prose leading-relaxed ${FAINT} ${compact ? 'text-xs' : 'text-[17px]'} ${className}`}>
        All 15 early spots are taken. Pro is {priceOf(standard, cadence).price} {priceOf(standard, cadence).per}
        from here.
      </p>
    );
  }

  const mark = compact ? 16 : 22;
  const price = compact ? 20 : 26;

  return (
    <div className={className}>
      <div className={`flex flex-wrap items-start ${compact ? 'gap-x-10 gap-y-5' : 'gap-x-14 gap-y-8'}`}>
        {GROUPS.map(({ tier, from, to }) => (
          <div key={tier.id}>
            <Rung
              price={priceOf(tier, cadence).price}
              per={PER[cadence]}
              copy={GROUP_COPY[tier.id]}
              forever
              gone={claimed >= to}
              size={price}
            />

            <SpotGroup claimed={claimed} from={from} to={to} size={mark} className={compact ? 'mt-2.5' : 'mt-3.5'} />
          </div>
        ))}

        <Rung
          price={priceOf(standard, cadence).price}
          per={PER[cadence]}
          copy={GROUP_COPY[standard.id]}
          forever={false}
          gone={false}
          size={price}
        />
      </div>

      <p className={`${STRONG} ${compact ? 'mt-4 text-sm' : 'mt-7 text-[17px]'}`}>
        Only {spotsInTier(claimed)} subscribers can get Pro for{' '}
        <CountingPrice value={`${priceOf(tierNow(claimed), cadence).price}${PER[cadence]}`} />.
      </p>
    </div>
  );
};
