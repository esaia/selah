import { FoundingLadder, type LadderColors } from '@/components/billing/FoundingLadder';
import { soldOut } from '@/lib/billing/founding';

const COLORS = {
  '--spot-taken': 'var(--color-studio-text)',
  '--spot-next': 'var(--color-studio-accent)',
  '--spot-open': 'var(--color-studio-lift)',
  '--spot-line': 'var(--color-studio-raised)',
  '--ladder-strong': 'var(--color-studio-text)',
  '--ladder-faint': 'var(--color-studio-muted)',
} satisfies LadderColors as React.CSSProperties;

export const FoundingSpots = ({ claimed }: { claimed: number }) => {
  if (soldOut(claimed)) return null;

  return (
    <div className="mb-5" style={COLORS}>
      <FoundingLadder claimed={claimed} compact />
    </div>
  );
};
