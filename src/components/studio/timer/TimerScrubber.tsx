"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useTimerNow } from "@/components/projector/TimerScreen";
import { cn } from "@/lib/cn";
import {
  HOUR,
  MINUTE,
  PHASE_BAR,
  activeTimer,
  elapsedOf,
  formatClock,
  formatDuration,
  intoHour,
  seekRun,
  timerReading,
  totalOf,
} from "@/lib/timer/model";
import { useStudio } from "@/lib/studio/StudioProvider";

const STEPS = [
  10_000,
  30_000,
  MINUTE,
  2 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  60 * MINUTE,
];

const LABEL_ROOM = 38;

const ticksFor = (total: number, width: number) => {
  if (!total || !width) return [];

  const room = Math.max(1, Math.floor(width / LABEL_ROOM));
  const step = STEPS.find((candidate) => total / candidate <= room) ?? total;

  const marks: number[] = [];

  for (let at = step; at < total; at += step) marks.push(at);

  return marks;
};

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

  const isClock = kind === "clock";
  const total = isClock ? HOUR : totalOf(timer);

  const elapsedAt = useCallback(
    (clientX: number) => {
      const box = track.current?.getBoundingClientRect();

      if (!box?.width) return 0;

      return Math.max(0, Math.min(1, (clientX - box.left) / box.width)) * total;
    },
    [total],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !total || isClock) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

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
    updateTimer((state) => seekRun(state, elapsed));
  };

  if (!total) return null;

  const at = now ?? timer.startedAt ?? 0;

  const reading = timerReading(timer, at);
  const colour = PHASE_BAR[reading?.phase ?? "normal"];

  const elapsed = isClock ? intoHour(at) : (dragging ?? elapsedOf(timer, at));
  const left = Math.max(0, Math.min(1, elapsed / total)) * 100;

  const up = kind === "countup";
  const smooth =
    dragging === null && !up && !isClock
      ? "transition-[left] duration-200 ease-linear"
      : "";

  const struck = at - intoHour(at);

  const marks = isClock
    ? [10, 20, 30, 40, 50].map((minutes) => ({
        key: minutes,
        at: (minutes * MINUTE) / HOUR,
        label: formatClock(struck + minutes * MINUTE, false),
      }))
    : ticksFor(total, width).map((mark) => ({
        key: mark,
        at: up ? mark / total : (total - mark) / total,
        label: formatDuration(mark),
      }));

  return (
    <div
      {...(isClock
        ? { role: "img" as const, "aria-label": "How far the hour has gone" }
        : {
            role: "slider" as const,
            tabIndex: 0,
            "aria-label": "Move the timer",
            "aria-valuemin": 0,
            "aria-valuemax": Math.round(total / 1000),
            "aria-valuenow": Math.round(elapsed / 1000),
            "aria-valuetext": formatDuration(up ? elapsed : total - elapsed),
          })}
      onKeyDown={(event) => {
        if (isClock) return;

        const nudge =
          event.key === "ArrowRight"
            ? 10_000
            : event.key === "ArrowLeft"
              ? -10_000
              : 0;

        if (!nudge) return;

        event.preventDefault();
        updateTimer((state) =>
          seekRun(state, Math.min(total, elapsedOf(state) + nudge)),
        );
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "group relative touch-none pt-2 pb-1 select-none focus:outline-none",
        isClock ? "cursor-default" : "cursor-ew-resize",
      )}
    >
      <div
        ref={track}
        className="relative h-8 overflow-hidden rounded-studio border border-studio-border bg-studio-surface
          group-focus-visible:ring-2 group-focus-visible:ring-studio-accent/40"
      >
        <span
          className="absolute inset-y-0 left-0 opacity-25"
          style={{ width: `${left}%`, backgroundColor: colour }}
        />

        {marks
          .filter((mark) => mark.at * width >= LABEL_ROOM)
          .map((mark) => (
            <span
              key={mark.key}
              className="absolute inset-y-0 border-l border-studio-border"
              style={{ left: `${mark.at * 100}%` }}
            >
              <span className="absolute top-1/2 left-1.5 -translate-y-1/2 text-[10px] tabular-nums text-studio-faint">
                {mark.label}
              </span>
            </span>
          ))}

        <span className="absolute top-1/2 left-1.5 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-studio-muted">
          {isClock
            ? formatClock(struck, false)
            : formatDuration(up ? 0 : total)}
        </span>

        <span
          className={cn(
            "absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full",
            smooth,
          )}
          style={{ left: `${left}%`, backgroundColor: colour }}
        />
      </div>

      {isClock ? null : (
        <span
          className={cn(
            "pointer-events-none absolute top-0 size-3 -translate-x-1/2 rounded-full border-2 border-white shadow-studio",
            smooth,
            dragging === null ? "" : "scale-125",
          )}
          style={{ left: `${left}%`, backgroundColor: colour }}
        />
      )}
    </div>
  );
};
