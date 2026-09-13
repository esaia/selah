'use client';

import { MonitorPlay, Radio, Tv, X, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import { clearOutputs, onOutputs, runUnderWay } from '@/lib/timer/model';

import { TimerDashboard } from '@/components/studio/timer/TimerDashboard';
import { TimerList } from '@/components/studio/timer/TimerList';
import { TimerMessages } from '@/components/studio/timer/TimerMessages';

const Heading = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 text-[11px] font-semibold tracking-wider text-studio-faint uppercase">{children}</h2>
);

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
          : 'border-studio-accent bg-studio-accent text-studio-onaccent'
        : 'border-studio-border bg-studio-bg text-studio-text hover:bg-studio-surface',
    )}
  >
    {children}
  </button>
);

export const TimerPanel = () => {
  const { timer, updateTimer } = useStudio();

  const live = onOutputs(timer) || runUnderWay(timer);

  return (
    <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4">
        <div
          className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex flex-wrap items-center justify-between gap-x-3
            gap-y-2 border-b border-studio-divider bg-studio-bg px-4 pt-4 pb-3"
        >
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-studio-text">Stage timer</h1>
            <p className="max-w-[46ch] truncate text-xs text-studio-muted">
              Runs beside the slides, or takes the stage screen over.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

            {timer.onStage ? (
              <ToggleButton
                active={timer.onStream}
                label="Put the timer on the stream, in place of the lower third"
                onClick={() => updateTimer(current => ({ ...current, onStream: !current.onStream }))}
              >
                <Radio className="size-3.5" />
                On stream
              </ToggleButton>
            ) : null}

            <ToggleButton
              active={timer.onStage}
              label="Give the stage screen over to the timer, in place of the slides"
              onClick={() =>
                updateTimer(current => ({
                  ...current,
                  onStage: !current.onStage,
                  onProjector: current.onStage ? false : current.onProjector,
                  onStream: current.onStage ? false : current.onStream,
                }))
              }
            >
              <MonitorPlay className="size-3.5" />
              Timer on stage
            </ToggleButton>

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
                  ? 'border-studio-border bg-studio-bg text-studio-text hover:bg-studio-surface'
                  : 'cursor-not-allowed border-studio-border/60 bg-studio-bg text-studio-faint',
              )}
            >
              <X className="size-3.5" />
              Clear timer
            </button>

            <button
              type="button"
              title="Flash every timer screen once, to catch an eye"
              onClick={() => updateTimer(current => ({ ...current, flashAt: Date.now() }))}
              className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border bg-studio-bg
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
