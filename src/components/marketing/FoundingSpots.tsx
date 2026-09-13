'use client';

import { FoundingLadder, type LadderColors } from '@/components/billing/FoundingLadder';

import { useCadence } from './cadence';

const COLORS = {
  '--spot-taken': 'var(--color-site-ink)',
  '--spot-next': 'var(--color-site-accent)',
  '--spot-open': 'color-mix(in oklab, var(--color-site-ink) 4%, transparent)',
  '--spot-line': 'color-mix(in oklab, var(--color-site-ink) 30%, transparent)',
  '--ladder-strong': 'var(--color-site-ink)',
  '--ladder-faint': 'var(--color-site-faint)',
} satisfies LadderColors as React.CSSProperties;

export const FoundingSpots = ({ claimed, className = 'mt-12' }: { claimed: number; className?: string }) => {
  const [cadence] = useCadence();

  return (
    <section aria-label="Early pricing" style={COLORS}>
      <FoundingLadder claimed={claimed} cadence={cadence} className={className} />
    </section>
  );
};
