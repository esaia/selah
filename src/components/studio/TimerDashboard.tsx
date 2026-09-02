'use client';

import { Minus, Pause, Play, Plus, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

import { TimerScreen, useTimerNow } from '@/components/projector/TimerScreen';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import { MINUTE, adjustRun, finishesAt, formatClock, resetRun, stepTimer, toggleRun } from '@/lib/timer/model';

import type { ReactNode } from 'react';

const TONES = {
  default: 'bg-[#2a2e37] text-white hover:bg-[#3a3f4a]',
  go: 'bg-studio-go text-white hover:bg-[#19643f]',
  stop: 'bg-studio-danger text-white hover:bg-[#b91c1c]',
} as const;

/** The transport buttons, sized for a hand rather than for a mouse. */
const Key = ({
  label,
  wide = false,
  tone = 'default',
  onClick,
  children,
}: {
  label: string;
  wide?: boolean;
  tone?: keyof typeof TONES;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={cn(
      'inline-flex h-10 items-center justify-center gap-1 rounded-studio text-sm font-semibold',
      'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      wide ? 'flex-[1.4]' : 'flex-1',
      TONES[tone],
    )}
  >
    {children}
  </button>
);

/**
 * What the outputs are showing, and the controls for it — the pair kept
 * together the way a stage timer's dashboard does, so the operator never has to
 * look in two places to know what pressing play will do.
 */
export const TimerDashboard = () => {
  const { timer, updateTimer } = useStudio();

  const now = useTimerNow();
  const finish = now === null ? null : finishesAt(timer, now);

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-studio-lg border border-studio-border bg-studio-slide">
        <div className="aspect-video w-full p-4">
          <TimerScreen state={timer} />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Key label="Take a minute off" onClick={() => updateTimer(state => adjustRun(state, -MINUTE))}>
          <Minus className="size-3.5" />
          1m
        </Key>

        <Key label="Previous timer" onClick={() => updateTimer(state => stepTimer(state, -1))}>
          <SkipBack className="size-4" />
        </Key>

        <Key
          wide
          label={timer.running ? 'Pause' : 'Start'}
          tone={timer.running ? 'stop' : 'go'}
          onClick={() => updateTimer(state => toggleRun(state))}
        >
          {timer.running ? <Pause className="size-5" /> : <Play className="size-5" />}
        </Key>

        <Key label="Next timer" onClick={() => updateTimer(state => stepTimer(state, 1))}>
          <SkipForward className="size-4" />
        </Key>

        <Key label="Add a minute" onClick={() => updateTimer(state => adjustRun(state, MINUTE))}>
          <Plus className="size-3.5" />
          1m
        </Key>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => updateTimer(resetRun)}
          className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border bg-white px-3
            text-xs font-medium text-studio-text transition-colors duration-150 hover:bg-studio-surface
            focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>

        <dl className="flex items-center gap-4 text-right">
          <div>
            <dt className="text-[10px] tracking-wider text-studio-faint uppercase">Now</dt>
            <dd className="text-xs font-medium tabular-nums text-studio-text">
              {now === null ? '—:—' : formatClock(now)}
            </dd>
          </div>

          <div>
            <dt className="text-[10px] tracking-wider text-studio-faint uppercase">Ends at</dt>
            <dd className="text-xs font-medium tabular-nums text-studio-text">
              {finish === null ? '—:—' : formatClock(finish)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
};
