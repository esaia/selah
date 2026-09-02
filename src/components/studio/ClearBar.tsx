'use client';

import type { ReactNode } from 'react';
import { Music, Timer, Type, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAudio } from '@/lib/studio/AudioProvider';
import { useStudio } from '@/lib/studio/StudioProvider';
import { clearOutputs, onOutputs } from '@/lib/timer/model';

/**
 * One layer's clear key. Dead unless that layer is actually putting something
 * out, so a stab at it mid-service cannot be mistaken for one that did
 * something — and so the strip doubles as a read of what is live.
 */
const ClearKey = ({
  label,
  live,
  onClick,
  className,
  children,
}: {
  label: string;
  live: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={live ? `Clear the ${label.toLowerCase()}` : `No ${label.toLowerCase()} to clear`}
    aria-label={`Clear the ${label.toLowerCase()}`}
    disabled={!live}
    onClick={onClick}
    className={cn(
      'inline-flex h-6 min-w-0 items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium',
      'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      live ? 'bg-white/15 text-white hover:bg-studio-live' : 'cursor-not-allowed text-white/25',
      className,
    )}
  >
    {children}
    <span className="truncate">{label}</span>
  </button>
);

/**
 * Clear, one layer at a time, the way a presentation app hangs it off its
 * output preview.
 *
 * Three things can be in front of the room at once and they are cleared by
 * three different owners — the slide is a push, the timer is a state, the bed
 * is a fade — so one Clear button could only ever mean "all of it". During a
 * service that is rarely what is wanted: the bed keeps playing while the verse
 * comes down, the countdown stays up while the song ends. Hence a key each,
 * and one that takes the lot.
 */
export const ClearBar = ({ slideLive }: { slideLive: boolean }) => {
  const { clearProjector, timer, updateTimer } = useStudio();
  const { current, stop } = useAudio();

  const timerLive = onOutputs(timer);
  const audioLive = Boolean(current);
  const anythingLive = slideLive || timerLive || audioLive;

  const clearTimer = () => updateTimer(clearOutputs);

  const clearAll = () => {
    if (slideLive) clearProjector();
    if (timerLive) clearTimer();
    if (audioLive) stop();
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-t border-black/40 bg-studio-bar px-2">
      <span aria-hidden="true" className="mr-0.5 shrink-0 text-[10px] font-semibold tracking-wide text-white/35">
        CLEAR
      </span>

      <ClearKey label="Slide" live={slideLive} onClick={clearProjector}>
        <Type className="size-3 shrink-0" />
      </ClearKey>

      <ClearKey label="Timer" live={timerLive} onClick={clearTimer}>
        <Timer className="size-3 shrink-0" />
      </ClearKey>

      <ClearKey label="Audio" live={audioLive} onClick={stop}>
        <Music className="size-3 shrink-0" />
      </ClearKey>

      <span className="min-w-0 flex-1" />

      {/* The one every operator reaches for when the service has moved on and
          they are not looking at which layers are up. */}
      <ClearKey
        label="All"
        live={anythingLive}
        onClick={clearAll}
        className={cn('shrink-0', anythingLive && 'bg-studio-live/80 hover:bg-studio-live')}
      >
        <X className="size-3 shrink-0" />
      </ClearKey>
    </div>
  );
};
