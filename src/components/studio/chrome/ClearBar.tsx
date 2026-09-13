'use client';

import type { ReactNode } from 'react';
import { Music, Timer, Type, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAudio } from '@/lib/studio/AudioProvider';
import { useStudio } from '@/lib/studio/StudioProvider';
import { clearOutputs, onOutputs } from '@/lib/timer/model';

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
