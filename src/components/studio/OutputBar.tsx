'use client';

import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/cn';
import { SCREEN_LABELS } from '@/lib/live/blackout';
import { useStudio } from '@/lib/studio/StudioProvider';

/**
 * One output's switch: named, with a lamp, all three of them side by side.
 *
 * Lit green means that output is doing its job; out means it has been blanked.
 * Blanking is not clearing — the verse stays live underneath, the run keeps
 * counting, the Browser Source stays connected — and one more press puts the
 * output back exactly as it was.
 */
const OutputKey = ({ label, blanked, onClick }: { label: string; blanked: boolean; onClick: () => void }) => (
  <button
    type="button"
    aria-pressed={!blanked}
    title={blanked ? `Bring the ${label.toLowerCase()} back` : `Blank the ${label.toLowerCase()} — what is live stays live`}
    onClick={onClick}
    className={cn(
      'group/key inline-flex h-6 min-w-0 items-center gap-1.5 rounded-[4px] px-2 text-[11px] font-medium',
      'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      blanked ? 'bg-studio-live/20 text-white/55 hover:bg-studio-live/30' : 'bg-white/10 text-white hover:bg-white/20',
    )}
  >
    {/* The lamp is the state; the icon is what the press will do. Both, because
        a new operator reads the icon and an operator mid-service reads the
        lamp from the other side of the booth. */}
    <span
      aria-hidden
      className={cn(
        'size-2 shrink-0 rounded-full border transition-colors duration-150',
        blanked ? 'border-white/35' : 'border-studio-on bg-studio-on',
      )}
    />

    <span className="truncate">{label}</span>

    {blanked ? (
      <Eye className="size-3 shrink-0 text-white/50" />
    ) : (
      <EyeOff className="size-3 shrink-0 opacity-0 transition-opacity duration-150 group-hover/key:opacity-60" />
    )}
  </button>
);

/**
 * What each output is doing, and the switch that turns any of them off.
 *
 * A strip of its own under the preview rather than three lamps tucked into the
 * tab bar: an operator has to be able to see all three at once — that is the
 * question being asked, "is anything dark?" — and a control nobody can name is
 * a control nobody presses. It reads as the twin of the clear strip below it,
 * which is the other row of keys that answers for the outputs.
 */
export const OutputBar = () => {
  const { settings, update, blackout, toggleBlackout } = useStudio();

  const keys = [
    { id: 'projector', label: SCREEN_LABELS.audience, blanked: blackout.audience, toggle: () => toggleBlackout('audience') },
    {
      id: 'stream',
      label: 'Lower third',
      blanked: settings.obsHidden,
      // The same switch that used to sit in the sidebar under "Stream".
      // Blanking the overlay keeps OBS connected, which is exactly what
      // blanking does to a projector — so it belongs with the other two.
      toggle: () => update({ obsHidden: !settings.obsHidden }),
    },
    { id: 'stage', label: SCREEN_LABELS.stage, blanked: blackout.stage, toggle: () => toggleBlackout('stage') },
  ];

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-t border-black/40 bg-studio-bar px-2">
      <span aria-hidden className="mr-0.5 shrink-0 text-[10px] font-semibold tracking-wide text-white/35">
        OUTPUTS
      </span>

      {keys.map(({ id, label, blanked, toggle }) => (
        <OutputKey key={id} label={label} blanked={blanked} onClick={toggle} />
      ))}
    </div>
  );
};
