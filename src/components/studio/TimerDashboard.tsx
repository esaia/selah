'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Minus, Pause, Play, Plus, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

import { TimerScreen, useTimerNow } from '@/components/projector/TimerScreen';

import { TimerScrubber } from './TimerScrubber';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import { MINUTE, adjustRun, finishesAt, formatClock, resetRun, stepTimer, toggleRun } from '@/lib/timer/model';

const TONES = {
  default: 'bg-[#2a2e37] text-white hover:bg-[#3a3f4a]',
  go: 'bg-studio-go text-white hover:bg-[#19643f]',
  stop: 'bg-studio-danger text-white hover:bg-[#b91c1c]',
} as const;

const KEY_BASE =
  'inline-flex h-10 items-center justify-center gap-1 text-xs font-semibold transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40';

/** The transport buttons, sized for a hand rather than for a mouse. */
const Key = ({
  label,
  tone = 'default',
  className,
  onClick,
  children,
}: {
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={cn(KEY_BASE, TONES[tone], className)}
  >
    {children}
  </button>
);

/**
 * The amounts the ± buttons offer. A minute covers most of it, which is why it
 * stays on the face of the button; the rest are a click away, because "give
 * them another ten" and "we are thirty seconds over" are both real and neither
 * is worth pressing the same key ten times for.
 */
const STEPS = [1_000, 10_000, 30_000, MINUTE, 5 * MINUTE, 10 * MINUTE, 20 * MINUTE, 30 * MINUTE];

const stepLabel = (ms: number) => (ms < MINUTE ? `${ms / 1000}s` : `${ms / MINUTE}m`);

/**
 * Add or take off time: a minute on the button itself, any of the other
 * amounts from the caret beside it. Picking from the list applies it there and
 * then rather than arming the button — the operator opened it because the
 * speaker needs the time now.
 */
const AdjustGroup = ({ sign }: { sign: 1 | -1 }) => {
  const { updateTimer } = useStudio();

  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const apply = (ms: number) => {
    updateTimer(state => adjustRun(state, sign * ms));
    setOpen(false);
  };

  const word = sign > 0 ? 'Add' : 'Take off';
  const Icon = sign > 0 ? Plus : Minus;

  return (
    <div ref={box} className="relative flex min-w-0 max-w-[150px] flex-1">
      {/* One split key, not two buttons side by side: the rounding belongs to
          the group, and the halves are told apart by a hairline. */}
      <div className="flex w-full overflow-hidden rounded-studio">
        <Key label={`${word} a minute`} className="min-w-0 flex-1 px-2" onClick={() => apply(MINUTE)}>
          <Icon className="size-3.5" />
          1m
        </Key>

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          title={`${word} another amount`}
          aria-label={`${word} another amount`}
          onClick={() => setOpen(current => !current)}
          className={cn(
            KEY_BASE,
            TONES.default,
            'w-6 shrink-0 border-white/15 px-0',
            sign > 0 ? 'order-first border-r' : 'border-l',
          )}
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-30 mt-1 min-w-[92px] overflow-hidden rounded-studio border border-studio-border',
            'bg-white py-1 shadow-studio-panel',
            sign > 0 ? 'left-0' : 'right-0',
          )}
        >
          {STEPS.map(step => (
            <button
              key={step}
              type="button"
              role="menuitem"
              onClick={() => apply(step)}
              className="block w-full px-3 py-1.5 text-left text-xs font-medium text-studio-text tabular-nums
                transition-colors duration-150 hover:bg-studio-surface focus:outline-none
                focus-visible:bg-studio-surface"
            >
              {sign > 0 ? '+' : '−'} {stepLabel(step)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/**
 * What the outputs are showing, and the controls for it — the pair kept
 * together the way a stage timer's dashboard does, so the operator never has to
 * look in two places to know what pressing play will do.
 *
 * It heads the running order, so what is armed and what it is doing are read
 * in one glance down the column.
 */
export const TimerDashboard = () => {
  const { timer, updateTimer } = useStudio();

  const now = useTimerNow();
  const finish = now === null ? null : finishesAt(timer, now);

  return (
    /* The screen at a size it is actually read at, and the controls taking the
       rest of the row: stacked under it they left the column half empty, and
       boxed in a panel of their own they read as furniture rather than as the
       instrument. */
    <section className="flex flex-wrap items-stretch gap-4">
      {/* What the projector draws when the timer is armed onto it, on a plain
          ground rather than the operator's background: the same component, the
          same proportions, the same furniture, and no wall clock — the
          projector leaves that off, so this does too. Not the `/timer` page in
          an iframe; that would be a second output joining the channel to tell
          the console what the console already knows. */}
      <div className="w-full shrink-0 overflow-hidden rounded-studio-lg bg-studio-slide sm:w-[300px]">
        <div className="aspect-video w-full">
          <TimerScreen state={timer} showClock={false} />
        </div>
      </div>

      <div className="flex min-w-[300px] flex-1 flex-col justify-between gap-2">
        <TimerScrubber />

        {/* Spread rather than bunched: the two amounts sit under the ends of
            the line they move, and the transport keeps the middle. */}
        <div className="flex items-stretch justify-between gap-2">
          <AdjustGroup sign={-1} />

          <div className="flex items-stretch gap-1">
            <Key
              label="Previous timer"
              className="w-10 shrink-0 rounded-studio"
              onClick={() => updateTimer(state => stepTimer(state, -1))}
            >
              <SkipBack className="size-4" />
            </Key>

            <Key
              label={timer.running ? 'Pause' : 'Start'}
              tone={timer.running ? 'stop' : 'go'}
              className="w-16 shrink-0 rounded-studio"
              onClick={() => updateTimer(state => toggleRun(state))}
            >
              {timer.running ? <Pause className="size-5" /> : <Play className="size-5" />}
            </Key>

            <Key
              label="Next timer"
              className="w-10 shrink-0 rounded-studio"
              onClick={() => updateTimer(state => stepTimer(state, 1))}
            >
              <SkipForward className="size-4" />
            </Key>
          </div>

          <AdjustGroup sign={1} />
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

          <dl className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-[10px] tracking-wider text-studio-faint uppercase">Now</dt>
              <dd className="text-xs font-medium tabular-nums text-studio-text">
                {now === null ? '—:—' : formatClock(now)}
              </dd>
            </div>

            <div className="flex items-baseline gap-1.5">
              <dt className="text-[10px] tracking-wider text-studio-faint uppercase">Ends</dt>
              <dd className="text-xs font-semibold tabular-nums text-studio-text">
                {finish === null ? '—:—' : formatClock(finish)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
};
