'use client';

import { MonitorPlay, Tv, X, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import { clearOutputs, onOutputs, runUnderWay } from '@/lib/timer/model';

import { TimerDashboard } from './TimerDashboard';
import { TimerList } from './TimerList';
import { TimerMessages } from './TimerMessages';

const Heading = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 text-[11px] font-semibold tracking-wider text-studio-faint uppercase">{children}</h2>
);

/** A header button that is either on or off, and says which. */
const ToggleButton = ({
  active,
  label,
  tone = 'accent',
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  tone?: 'accent' | 'danger';
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={label}
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'inline-flex h-8 items-center gap-1.5 rounded-studio border px-2.5 text-xs font-medium transition-colors',
      'duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40 md:px-3',
      active
        ? tone === 'danger'
          ? 'border-studio-danger bg-studio-danger text-white'
          : 'border-studio-accent bg-studio-accent text-white'
        : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface',
    )}
  >
    {children}
  </button>
);

/**
 * The stage timer's console: the dashboard on the left, the running order in
 * the middle, the messages on the right — the arrangement a timer is operated
 * in, kept the same here so muscle memory from one carries to the other.
 *
 * Nothing in this panel touches the verse on the projector unless the operator
 * arms the timer onto it, so a countdown can run on the speaker's monitor
 * through the whole service while the room goes on seeing scripture.
 */
export const TimerPanel = () => {
  const { timer, updateTimer } = useStudio();

  // Dead unless the timer is actually putting something out, so a stab at it
  // between services cannot be mistaken for one that did something — and so
  // the button doubles as a read of whether the stage is on the timer.
  // A count on the stage's rail is as much "showing" as one filling the screen,
  // so Clear answers for it too.
  const live = onOutputs(timer) || runUnderWay(timer);

  return (
    <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4">
        {/* Pinned: Flash and Clear are what an operator reaches for
            without looking, and scrolling down the running order used to take
            them off the screen. It bleeds through the column's own padding so
            nothing shows past its edges as the list runs under it. */}
        <div
          className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex flex-wrap items-center justify-between gap-x-3
            gap-y-2 border-b border-studio-divider bg-studio-bg px-4 pt-4 pb-3"
        >
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-studio-text">Stage timer</h1>
            {/* Capped: the header is a flex row, and a subtitle allowed to
                run the width of a wide console pushes the controls it shares
                the row with off the end of it. */}
            <p className="max-w-[46ch] truncate text-xs text-studio-muted">
              Runs beside the slides, or takes the stage screen over.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* The projector is a second screen for the same face, so it is
                only on offer once the stage is showing it. */}
            {timer.onStage ? (
              <ToggleButton
                active={timer.onProjector}
                label="Put the timer on the projector, in place of the slide"
                onClick={() => updateTimer(current => ({ ...current, onProjector: !current.onProjector }))}
              >
                <Tv className="size-3.5" />
                On projector
              </ToggleButton>
            ) : null}

            {/* Which face the stage is showing. Starting a count no longer
                decides it: with the slides up a run appears in the box at the
                foot of the stage's rail, and the person standing there keeps
                the verse in front of them. */}
            <ToggleButton
              active={timer.onStage}
              label="Give the stage screen over to the timer, in place of the slides"
              onClick={() =>
                updateTimer(current => ({
                  ...current,
                  onStage: !current.onStage,
                  // The projector follows the stage off: its own button goes
                  // with it, and a timer left on the wall with no way to take
                  // it down is not a state to leave an operator in.
                  onProjector: current.onStage ? false : current.onProjector,
                }))
              }
            >
              <MonitorPlay className="size-3.5" />
              Timer on stage
            </ToggleButton>

            {/* What takes the timer back off the screens and the run back to
                the top. Nothing about the run itself does it — pausing a count
                is not the same as being finished with it. */}
            <button
              type="button"
              disabled={!live}
              title={live ? 'Take the timer off the screens' : 'The timer is not on any screen'}
              onClick={() => updateTimer(clearOutputs)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-studio border px-2.5 text-xs font-medium',
                'transition-colors duration-150 focus:outline-none focus-visible:ring-2',
                'focus-visible:ring-studio-accent/40 md:px-3',
                live
                  ? 'border-studio-border bg-white text-studio-text hover:bg-studio-surface'
                  : 'cursor-not-allowed border-studio-border/60 bg-white text-studio-faint',
              )}
            >
              <X className="size-3.5" />
              Clear timer
            </button>

            <button
              type="button"
              title="Flash every timer screen once, to catch an eye"
              onClick={() => updateTimer(current => ({ ...current, flashAt: Date.now() }))}
              className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border bg-white
                px-2.5 text-xs font-medium text-studio-text transition-colors duration-150 hover:bg-studio-surface
                focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40 md:px-3"
            >
              <Zap className="size-3.5" />
              Flash
            </button>

          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-w-0 space-y-5">
            <div>
              <Heading>Dashboard</Heading>
              <TimerDashboard />
            </div>

            <div>
              <Heading>Timers</Heading>
              <TimerList />
            </div>
          </div>

          {/* Pinned beside the running order, once there is a column of its own
              to pin it in: the notes are written against the list, and scrolling
              down to timer twelve used to take them off the screen. It stops
              under the header the panel already pins, and scrolls within itself
              rather than growing past the foot of the window. */}
          <div
            className="min-w-0 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto
              lg:studio-scroll lg:pb-2"
          >
            <Heading>Messages</Heading>
            <TimerMessages />
          </div>
        </div>
      </div>
    </div>
  );
};
