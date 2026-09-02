"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { cn } from "@/lib/cn";
import {
  FLASH_MS,
  MESSAGE_COLORS,
  PHASE_BAR,
  PHASE_COLOR,
  formatClock,
  timerReading,
  visibleMessages,
  type TimerMessage,
  type TimerState,
} from "@/lib/timer/model";

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
    clockListeners.forEach((notify) => notify());
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

export const useTimerNow = (): number | null =>
  useSyncExternalStore(subscribeClock, readClock, noClock);

/**
 * Roughly how wide the digits are, in ems. Tabular figures are near enough a
 * fixed width and a colon is much narrower; measuring the text properly would
 * mean a layout pass per tick for a number that only changes when the digit
 * count does.
 */
const widthInEms = (text: string) =>
  [...text].reduce(
    (sum, char) => sum + (char === ":" ? 0.34 : char === "-" ? 0.42 : 0.62),
    0,
  );

/**
 * Watch one box. Only the box is observed — the sizes are worked out during
 * render — so a digit changing every second does not tear down and rebuild a
 * ResizeObserver every second.
 *
 * A callback ref rather than an effect: a full-screen message swaps the frame
 * for a different element and takes the digits away entirely, and an effect
 * that ran once at mount would be left watching a node that is no longer on
 * the page — the digits would come back measuring nothing, and size to
 * nothing with it.
 */
const useBox = () => {
  const watching = useRef<ResizeObserver | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  const ref = useCallback((node: HTMLDivElement | null) => {
    watching.current?.disconnect();
    watching.current = null;

    if (!node) return;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();

      setBox((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    watching.current = observer;
  }, []);

  return [ref, box] as const;
};

/**
 * A flash is an event, not a state: the console bumps a stamp, and every screen
 * that sees a *new* value plays it once. Read during render rather than in an
 * effect, so the pulse lands on the same paint as the payload.
 *
 * The run has one stamp and each message has its own, so an operator can blink
 * a single note without strobing the digits.
 */
const useFlash = (at: number, now: number | null) => {
  const [seen, setSeen] = useState(at);
  const [flashingAt, setFlashingAt] = useState(0);

  if (at !== seen) {
    setSeen(at);

    // Only worth playing if it was fired within living memory: a screen opening
    // mid-service reads the stored run, and must not strobe at a flash from ten
    // minutes ago.
    setFlashingAt(now !== null && now - at <= FLASH_MS * 4 ? at : 0);
  }

  useEffect(() => {
    if (!flashingAt) return;

    const id = setTimeout(() => setFlashingAt(0), FLASH_MS);

    return () => clearTimeout(id);
  }, [flashingAt]);

  return flashingAt > 0;
};

/** The blinks themselves, four over the flash. */
const flashAnimation = (lit: boolean) =>
  lit ? `timer-flash ${FLASH_MS / 4}ms ease-in-out 4` : undefined;

/** One note on the screen. It blinks on its own stamp, and along with the
 *  screen when the whole output is flashed. */
const MessageLine = ({
  message,
  now,
  screenFlashing,
  fontSize,
  weight,
}: {
  message: TimerMessage;
  now: number | null;
  screenFlashing: boolean;
  fontSize: number;
  weight: number;
}) => {
  const own = useFlash(message.flashAt, now);

  return (
    <p
      className="leading-tight"
      style={{
        fontSize,
        color: MESSAGE_COLORS[message.color],
        fontWeight: weight,
        textTransform: message.caps ? "uppercase" : "none",
        animation: flashAnimation(own || screenFlashing),
      }}
    >
      {message.text}
    </p>
  );
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
  const text =
    now === null && reading?.kind === "clock"
      ? "--:--:--"
      : (reading?.text ?? "0:00");

  // Two boxes, deliberately. Everything around the digits is sized from the
  // *whole* screen and only the digits from what is left over; sizing the
  // furniture from the digits instead would have each one feeding the other,
  // and the observer would never settle.
  const [frameRef, frame] = useBox();
  const [digitsRef, digits] = useBox();

  const unit = frame.height;
  const digitSize =
    digits.width && digits.height
      ? Math.floor(Math.min(digits.width / widthInEms(text), digits.height))
      : 0;

  const flashing = useFlash(state.flashAt, now);

  const messages = visibleMessages(state);
  const takeover = messages.filter((message) => message.fullScreen);

  if (state.blackout)
    return <div className={cn("size-full bg-black", className)} />;

  // A full-screen message is the whole output for as long as it is up: the
  // person on stage should not have to find it under the digits.
  if (takeover.length > 0)
    return (
      <div
        ref={frameRef}
        className={cn(
          "relative flex size-full flex-col items-center justify-center gap-[3%] px-[6%] text-center",
          className,
        )}
      >
        {takeover.map((message) => (
          <MessageLine
            key={message.id}
            message={message}
            now={now}
            // The same four blinks the digits wear, so Flash still reads.
            screenFlashing={flashing}
            fontSize={Math.max(16, unit * (takeover.length > 1 ? 0.14 : 0.2))}
            weight={message.bold ? 700 : 600}
          />
        ))}
      </div>
    );

  return (
    <div
      ref={frameRef}
      className={cn(
        "relative flex size-full flex-col justify-center",
        className,
      )}
    >
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

      <div
        ref={digitsRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        // A note on the screen is what the room is being asked to read, so the
        // digits give way to it: they keep a third of the height and the words
        // take the rest, rather than both settling for half.
        style={messages.length > 0 ? { maxHeight: unit * 0.34 } : undefined}
      >
        <span
          className="leading-none font-semibold whitespace-nowrap tabular-nums"
          style={{
            fontSize: digitSize || 1,
            color: PHASE_COLOR[reading?.phase ?? "normal"],
            transition: "color 300ms linear",
            // Four blinks over the flash, on the digits themselves.
            animation: flashAnimation(flashing),
          }}
        >
          {text}
        </span>
      </div>

      {messages.length > 0 ? (
        <div
          // A message is the point of the screen while it is up — the person
          // reading it is at the back of a hall, glancing — so it is set
          // larger than the digits, and takes its room from them. Several at
          // once share the space rather than overflowing it.
          className="max-h-[55%] shrink-0 space-y-1 overflow-hidden text-center"
          style={{ marginTop: unit * 0.04 }}
        >
          {messages.map((message) => (
            <MessageLine
              key={message.id}
              message={message}
              now={now}
              // The screen's own flash is the digits' business; a note under
              // them blinks only when it was the one flashed.
              screenFlashing={false}
              fontSize={Math.max(14, unit * (messages.length > 1 ? 0.16 : 0.3))}
              weight={message.bold ? 700 : 400}
            />
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
          {now === null ? "--:--:--" : formatClock(now)}
        </div>
      ) : null}

      {reading && reading.progress !== null ? (
        <div
          // Along the foot of the screen, under everything: the run's own
          // margin, read at a glance and never in the way of the words. It
          // goes green, amber, red with the digits.
          className="shrink-0 overflow-hidden rounded-full bg-white/15"
          style={{ height: Math.max(5, unit * 0.03), marginTop: unit * 0.05 }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${reading.progress * 100}%`,
              backgroundColor: PHASE_BAR[reading.phase],
              transition: "width 250ms linear, background-color 300ms linear",
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
