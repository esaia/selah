'use client';

import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/cn';
import { SCREEN_LABELS } from '@/lib/live/blackout';
import { useStudio } from '@/lib/studio/StudioProvider';

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

export const OutputBar = () => {
  const { settings, update, blackout, toggleBlackout } = useStudio();

  const keys = [
    { id: 'projector', label: SCREEN_LABELS.audience, blanked: blackout.audience, toggle: () => toggleBlackout('audience') },
    {
      id: 'stream',
      label: 'Stream',
      blanked: settings.obsHidden,
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
