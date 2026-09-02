'use client';

import { Ban, ExternalLink, Tv, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

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
  const { session, timer, updateTimer } = useStudio();

  return (
    <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-studio-text">Stage timer</h1>
            <p className="text-xs text-studio-muted">Runs on its own screen, and on the projector when you arm it.</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <ToggleButton
              active={timer.onProjector}
              label="Put the timer on the projector, in place of the slide"
              onClick={() => updateTimer(current => ({ ...current, onProjector: !current.onProjector }))}
            >
              <Tv className="size-3.5" />
              On projector
            </ToggleButton>

            <ToggleButton
              tone="danger"
              active={timer.blackout}
              label="Black the timer screens without stopping the run"
              onClick={() => updateTimer(current => ({ ...current, blackout: !current.blackout }))}
            >
              <Ban className="size-3.5" />
              Blackout
            </ToggleButton>

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

            <a
              href={`/timer/${session.outputKey}`}
              target="_blank"
              rel="noreferrer"
              title="Open the timer output"
              className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border bg-white
                px-2.5 text-xs font-medium text-studio-text transition-colors duration-150 hover:bg-studio-surface
                md:px-3"
            >
              <ExternalLink className="size-3.5" />
              Open timer
            </a>
          </div>
        </div>

        <div
          className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]
            xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(240px,300px)]"
        >
          <div>
            <Heading>Dashboard</Heading>
            <TimerDashboard />
          </div>

          <div className="min-w-0">
            <Heading>Timers</Heading>
            <TimerList />
          </div>

          <div className="min-w-0 lg:col-span-2 xl:col-span-1">
            <Heading>Messages</Heading>
            <TimerMessages />
          </div>
        </div>
      </div>
    </div>
  );
};
