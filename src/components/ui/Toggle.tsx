'use client';

import { cn } from '@/lib/cn';

/** Small switch used to arm a language for the projector. */
export const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      checked ? 'bg-studio-accent' : 'bg-studio-border',
    )}
  >
    <span
      className={cn(
        'absolute top-0.5 h-4 w-4 rounded-full shadow-studio transition-all duration-150',
        // The track is yellow when armed and near-black when it is not, so the
        // knob takes the other end of the scale rather than a fixed colour.
        checked ? 'left-[18px] bg-studio-onaccent' : 'left-0.5 bg-studio-muted',
      )}
    />
  </button>
);
