'use client';

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { useTimerNow } from '@/components/projector/TimerScreen';
import { cn } from '@/lib/cn';
import {
  MINUTE,
  PHASE_BAR,
  activeTimer,
  elapsedOf,
  formatDuration,
  seekRun,
  timerReading,
  totalOf,
} from '@/lib/timer/model';
import { useStudio } from '@/lib/studio/StudioProvider';

/** Tick spacings, coarsest first match that still gives a readable count. */
const STEPS = [10_000, 30_000, MINUTE, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE, 15 * MINUTE, 30 * MINUTE, 60 * MINUTE];

/** The narrowest a labelled tick can be and still be read. */
const LABEL_ROOM = 58;

/**
 * The marks to draw, as offsets from the end of the run: a countdown is read
 * in whole minutes *left*, so the marks are anchored to zero and the ragged
 * one — the total, which is rarely round once a minute has been added — falls
 * at the start where the operator is already reading it.
 *
 * How many there are comes from the measured width, because the same bar is
 * 380px on a laptop and twice that on the desk machine.
 */
const ticksFor = (total: number, width: number) => {
  if (!total || !width) return [];

  const room = Math.max(1, Math.floor(width / LABEL_ROOM));
  const step = STEPS.find(candidate => total / candidate <= room) ?? total;

  const marks: number[] = [];

  for (let at = step; at < total; at += step) marks.push(at);

  return marks;
};

/**
 * The run as a line, with a handle on it.
 *
 * Reading how far through a talk the speaker is off a bare number is work; the
 * line answers it at a glance. Dragging is the only way to move a run to a
 * point — the ± buttons change its *length*, which is a different thing, and
 * using them to skip forward quietly leaves the timer ending somewhere else.
 */
export const TimerScrubber = () => {
  const { timer, updateTimer } = useStudio();

  const now = useTimerNow();
  const track = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = track.current;

    if (!node) return;

    const measure = () => setWidth(node.clientWidth);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const kind = activeTimer(timer)?.kind;
  const total = totalOf(timer);

  const elapsedAt = useCallback(
    (clientX: number) => {
      const box = track.current?.getBoundingClientRect();

      if (!box?.width) return 0;

      return Math.max(0, Math.min(1, (clientX - box.left) / box.width)) * total;
    },
    [total],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !total) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    // Held locally while the pointer is down, so the line follows the finger at
    // screen rate rather than at the rate the run is published.
    setDragging(elapsedAt(event.clientX));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging === null) return;

    setDragging(elapsedAt(event.clientX));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging === null) return;

    const elapsed = elapsedAt(event.clientX);

    setDragging(null);
    updateTimer(state => seekRun(state, elapsed));
  };

  // A wall clock has no run to scrub, and a timer with no length has no line.
  if (kind === 'clock' || !total) return null;

  const reading = timerReading(timer, now ?? timer.startedAt ?? 0);
  const colour = PHASE_BAR[reading?.phase ?? 'normal'];

  const elapsed = dragging ?? elapsedOf(timer, now ?? timer.startedAt ?? 0);
  const left = Math.max(0, Math.min(1, elapsed / total)) * 100;

  const up = kind === 'countup';
  const smooth = dragging === null && !up ? 'transition-[left] duration-200 ease-linear' : '';

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Move the timer"
      aria-valuemin={0}
      aria-valuemax={Math.round(total / 1000)}
      aria-valuenow={Math.round(elapsed / 1000)}
      aria-valuetext={formatDuration(up ? elapsed : total - elapsed)}
      onKeyDown={event => {
        const nudge = event.key === 'ArrowRight' ? 10_000 : event.key === 'ArrowLeft' ? -10_000 : 0;

        if (!nudge) return;

        event.preventDefault();
        updateTimer(state => seekRun(state, Math.min(total, elapsedOf(state) + nudge)));
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="group relative cursor-ew-resize touch-none pt-2 pb-1 select-none focus:outline-none"
    >
      <div
        ref={track}
        className="relative h-8 overflow-hidden rounded-studio border border-studio-border bg-studio-surface
          group-focus-visible:ring-2 group-focus-visible:ring-studio-accent/40"
      >
        {/* How far it has come, in the colour the digits are wearing. */}
        <span className="absolute inset-y-0 left-0 opacity-25" style={{ width: `${left}%`, backgroundColor: colour }} />

        {ticksFor(total, width)
          .map(mark => ({ mark, at: up ? mark / total : (total - mark) / total }))
          // The run's own total sits in the left corner; a mark landing on top
          // of it printed one number over the other.
          .filter(({ at }) => at * width >= LABEL_ROOM)
          .map(({ mark, at }) => (
            <span
              key={mark}
              className="absolute inset-y-0 border-l border-studio-border"
              style={{ left: `${at * 100}%` }}
            >
              <span className="absolute top-1/2 left-1.5 -translate-y-1/2 text-[10px] tabular-nums text-studio-faint">
                {formatDuration(mark)}
              </span>
            </span>
          ))}

        <span className="absolute top-1/2 left-1.5 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-studio-muted">
          {formatDuration(up ? 0 : total)}
        </span>

        <span
          className={cn('absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full', smooth)}
          style={{ left: `${left}%`, backgroundColor: colour }}
        />
      </div>

      {/* The grip sits proud of the track, so there is something to aim at. */}
      <span
        className={cn(
          'pointer-events-none absolute top-0 size-3 -translate-x-1/2 rounded-full border-2 border-white shadow-studio',
          smooth,
          dragging === null ? '' : 'scale-125',
        )}
        style={{ left: `${left}%`, backgroundColor: colour }}
      />
    </div>
  );
};
