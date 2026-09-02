'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { cn } from '@/lib/cn';
import {
  FLASH_MS,
  MESSAGE_COLORS,
  PHASE_BAR,
  PHASE_COLOR,
  formatClock,
  timerReading,
  visibleMessages,
  type TimerState,
} from '@/lib/timer/model';

/**
 * One frame of the stage timer, drawn the same way everywhere it appears: the
 * `/timer` output, the projector when the timer is armed onto it, and the
 * console's own dashboard. Sharing the component is what keeps the operator's
 * preview honest — there is one place the digits are laid out, not three.
 *
 * It fills whatever box it is given and sizes itself to it, so the same
 * component is a 280px card in the console and a 4K screen in the hall.
 */

/** Tenths would only make the digits flicker; a quarter second lands each new
 *  second on time without a render per frame. */
const TICK_MS = 250;

/**
 * One clock, shared by every timer on the page — the dashboard, the preview and
 * the output would otherwise run three intervals that disagree by a frame.
 *
 * It reads `null` until the browser has it. The server has no clock the browser
 * will agree with, and a text mismatch makes React throw the whole tree away
 * and render it again; `useSyncExternalStore` is how that absence is declared
 * rather than papered over with a state update in an effect.
 */
const clockListeners = new Set<() => void>();

let clockSnapshot = 0;
let ticker: ReturnType<typeof setInterval> | null = null;

const subscribeClock = (listener: () => void) => {
  clockListeners.add(listener);

  ticker ??= setInterval(() => {
    clockSnapshot = Date.now();
    clockListeners.forEach(notify => notify());
  }, TICK_MS);

  return () => {
    clockListeners.delete(listener);

    if (clockListeners.size === 0 && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
};

// Cached, because a snapshot that changed on every call would re-render for
// ever. It moves on the tick and nowhere else.
const readClock = () => (clockSnapshot ||= Date.now());
const noClock = () => null;

export const useTimerNow = (): number | null => useSyncExternalStore(subscribeClock, readClock, noClock);

/**
 * Roughly how wide the digits are, in ems. Tabular figures are near enough a
 * fixed width and a colon is much narrower; measuring the text properly would
 * mean a layout pass per tick for a number that only changes when the digit
 * count does.
 */
const widthInEms = (text: string) =>
  [...text].reduce((sum, char) => sum + (char === ':' ? 0.34 : char === '-' ? 0.42 : 0.62), 0);

/**
 * Watch one box. Only the box is observed — the sizes are worked out during
 * render — so a digit changing every second does not tear down and rebuild a
 * ResizeObserver every second.
 */
const useBox = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = ref.current;

    if (!node) return;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();

      setBox(current => (current.width === width && current.height === height ? current : { width, height }));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [ref, box] as const;
};

export const TimerScreen = ({
  state,
  showClock = true,
  showName = true,
  className,
}: {
  state: TimerState;
  showClock?: boolean;
  showName?: boolean;
  className?: string;
}) => {
  const now = useTimerNow();

  // Before the clock arrives, the run is read as it stood at its last resume:
  // a stopped timer is exact that way — which is most of them, most of the
  // time — and a running one is right again within a tick.
  const reading = timerReading(state, now ?? state.startedAt ?? 0);

  // A wall clock is the one reading that has nothing sensible to show without
  // the real time, so it says so rather than flashing the epoch.
  const text = now === null && reading?.kind === 'clock' ? '--:--:--' : (reading?.text ?? '0:00');

  // Two boxes, deliberately. Everything around the digits is sized from the
  // *whole* screen and only the digits from what is left over; sizing the
  // furniture from the digits instead would have each one feeding the other,
  // and the observer would never settle.
  const [frameRef, frame] = useBox();
  const [digitsRef, digits] = useBox();

  const unit = frame.height;
  const digitSize =
    digits.width && digits.height ? Math.floor(Math.min(digits.width / widthInEms(text), digits.height)) : 0;

  // A flash is an event, not a state: the console bumps `flashAt`, and every
  // screen that sees a *new* value plays it once. Taken during render rather
  // than in an effect, so the pulse lands on the same paint as the payload.
  const [seenFlash, setSeenFlash] = useState(state.flashAt);
  const [flashingAt, setFlashingAt] = useState(0);

  if (state.flashAt !== seenFlash) {
    setSeenFlash(state.flashAt);

    // Only worth playing if it was fired within living memory: a screen opening
    // mid-service reads the stored run, and must not strobe at a flash from ten
    // minutes ago.
    setFlashingAt(now !== null && now - state.flashAt <= FLASH_MS * 4 ? state.flashAt : 0);
  }

  useEffect(() => {
    if (!flashingAt) return;

    const id = setTimeout(() => setFlashingAt(0), FLASH_MS);

    return () => clearTimeout(id);
  }, [flashingAt]);

  const messages = visibleMessages(state);

  if (state.blackout) return <div className={cn('size-full bg-black', className)} />;

  return (
    <div ref={frameRef} className={cn('relative flex size-full flex-col justify-center', className)}>
      {showName && reading?.name ? (
        <div
          className="shrink-0 truncate text-center font-medium tracking-[0.2em] text-white/70 uppercase"
          style={{
            fontSize: Math.max(10, unit * 0.05),
            marginBottom: unit * 0.03,
          }}
        >
          {reading.name}
        </div>
      ) : null}

      <div ref={digitsRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <span
          className="leading-none font-semibold whitespace-nowrap tabular-nums"
          style={{
            fontSize: digitSize || 1,
            color: PHASE_COLOR[reading?.phase ?? 'normal'],
            transition: 'color 300ms linear',
            // Four blinks over the flash, on the digits themselves.
            animation: flashingAt ? `timer-flash ${FLASH_MS / 4}ms ease-in-out 4` : undefined,
          }}
        >
          {text}
        </span>
      </div>

      {reading && reading.progress !== null ? (
        <div
          className="shrink-0 overflow-hidden rounded-full bg-white/15"
          style={{ height: Math.max(4, unit * 0.025), marginTop: unit * 0.04 }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${reading.progress * 100}%`,
              backgroundColor: PHASE_BAR[reading.phase],
              transition: 'width 250ms linear, background-color 300ms linear',
            }}
          />
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div
          // A message is the point of the screen while it is up — the person
          // reading it is at the back of a hall, glancing — so it is set as
          // large as the digits, and takes its room from them. Several at once
          // share the space rather than overflowing it.
          className="max-h-[45%] shrink-0 space-y-1 overflow-hidden text-center"
          style={{
            marginTop: unit * 0.04,
            fontSize: Math.max(14, unit * (messages.length > 1 ? 0.12 : 0.2)),
          }}
        >
          {messages.map(message => (
            <p
              key={message.id}
              className="leading-tight"
              style={{
                color: MESSAGE_COLORS[message.color],
                fontWeight: message.bold ? 700 : 400,
                textTransform: message.caps ? 'uppercase' : 'none',
              }}
            >
              {message.text}
            </p>
          ))}
        </div>
      ) : null}

      {showClock ? (
        <div
          className="shrink-0 text-center tabular-nums text-white/40"
          style={{
            marginTop: unit * 0.04,
            fontSize: Math.max(10, unit * 0.05),
          }}
        >
          {now === null ? '--:--:--' : formatClock(now)}
        </div>
      ) : null}
    </div>
  );
};
