"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { useBox } from "@/lib/projector/useBox";
import { flashAnimation, useFlash } from "@/lib/projector/useFlash";
import { fitText, refitOnFontLoad } from "@/lib/projector/fitText";
import {
  FINAL_MS,
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
 * The furniture, as fractions of the frame's height: how big each piece is and
 * the gap above it. The digits take whatever is left over.
 *
 * These are a table rather than numbers in the markup because they are read
 * twice — once to draw each piece, and once to work out what the digits may
 * have. The digits used to be sized from their own measured box, and an
 * observer only reports the smaller box *after* the message that shrank it has
 * been painted: one frame of full-height digits sitting on top of the words. A
 * budget taken from the frame — which does not change when a message goes up —
 * lands the new size on the same paint as the message.
 */
/**
 * `lead` is room under the letters rather than air the layout forgot about. A
 * line box the exact height of the font clips anything that hangs below the
 * baseline, which in Georgian is most of the alphabet — the name was coming up
 * with its tails cut off. It is budgeted at the height it is actually drawn,
 * like every other piece here.
 */
// A little larger than the wall clock under it: the name answers "what is
// this counting", which on the stage's rail — a box of digits beside the
// agenda — is asked before the number itself is any use.
const NAME = { size: 0.065, gap: 0.03, lead: 1.3 };

// Under the title rather than after it: two answers to two questions — what
// this is counting, and who is giving it — read faster stacked than run
// together on one line, and a long Georgian title no longer squeezes the name
// of the person off the end of the row.
const SPEAKER = { size: 0.045, lead: 1.35 };
const CLOCK = { size: 0.05, gap: 0.04 };

/**
 * What the notes get: a fixed share of the column and the gap above it, plus
 * the largest a note is ever set (`cap`) and the largest a full-screen one is.
 *
 * A share rather than a size, because the text is then fitted *into* it. A
 * size would have to guess how many lines the words wrap to, and guessing
 * wrong is what clipped a long note in half — the box it was given was set
 * from a line count nobody had measured.
 */
const MESSAGE = { share: 0.45, gap: 0.04, cap: 0.3, takeover: 0.34 };

/** The strip along the foot, as a fraction of the column's height. */
const BAR_HEIGHT = 0.035;

/** What the digits keep however much else is asking for room. */
const DIGITS_MIN = 0.12;

/**
 * The smallest the name and the wall clock are ever set, so they stay legible
 * in the console's 300px preview rather than becoming a grey smudge.
 *
 * It is a floor on the *drawn* size, which means on a small frame it is larger
 * than the share of the column those pieces were budgeted. Budget what is
 * actually drawn — see `spent` — or the column adds up to more than the frame
 * and the screen quietly clips its own foot.
 */
const MIN_TYPE = 10;

/**
 * What the digits are doing: blinking at a flash the operator sent, or beating
 * out the last stretch of the run, a second at a time for as long as that
 * stretch is set to. The flash wins — it was asked for, and two animations on
 * one element means the later one alone.
 */
const digitAnimation = (flashing: number, final: boolean, finalAt: number) =>
  flashAnimation(flashing) ??
  (final
    ? `timer-final 1000ms ease-in-out ${Math.max(1, Math.round(finalAt / 1000))}`
    : undefined);

/** One note on the screen. It blinks on its own stamp, and along with the
 *  screen when the whole output is flashed. */
const MessageLine = ({
  message,
  now,
  screenFlashing,
  weight,
}: {
  message: TimerMessage;
  now: number | null;
  screenFlashing: number;
  weight: number;
}) => {
  const own = useFlash(message.flashAt, now);

  return (
    // No size of its own: the block around it is fitted, and every note in it
    // is set at whatever size the whole lot fits at.
    <p
      className="leading-tight"
      style={{
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
      ? "--:--"
      : (reading?.text ?? "0:00");

  // One box, deliberately: the frame. Everything on the screen is a fraction of
  // it, the digits included, so nothing here waits on a second measurement that
  // can only arrive a paint late.
  const [frameRef, frame] = useBox();

  const unit = frame.height;

  const flashing = useFlash(state.flashAt, now);

  const messages = visibleMessages(state);
  const takeover = messages.filter((message) => message.fullScreen);

  const hasName = Boolean(showName && reading?.name);
  const hasSpeaker = Boolean(showName && reading?.speaker);

  // The pieces that have a floor are measured before they are budgeted: on a
  // small frame the floor is what gets drawn, and a budget taken from the
  // share alone would be short by the difference.
  const nameSize = hasName ? Math.max(MIN_TYPE, unit * NAME.size) : 0;
  const speakerSize = hasSpeaker ? Math.max(MIN_TYPE, unit * SPEAKER.size) : 0;
  const clockSize = showClock ? Math.max(MIN_TYPE, unit * CLOCK.size) : 0;

  // What the furniture is taking, as a fraction of the frame. The bar is not
  // in it — it lies in the margin below the column, not in the column.
  const spent = unit
    ? (hasName ? (nameSize * NAME.lead) / unit : 0) +
      (hasSpeaker ? (speakerSize * SPEAKER.lead) / unit : 0) +
      (hasName || hasSpeaker ? NAME.gap : 0) +
      (showClock ? clockSize / unit + CLOCK.gap : 0) +
      (messages.length > 0 ? MESSAGE.gap + MESSAGE.share : 0)
    : 0;

  // The notes' own box: a fixed height, whatever they say. A full-screen one
  // has the frame instead.
  const notesHeight =
    takeover.length > 0 ? unit : Math.round(unit * MESSAGE.share);

  /**
   * Fit the notes to the box, rather than the box to the notes.
   *
   * `fitText` writes the size straight onto the node, so a long note shrinks
   * to two or three lines without a re-render and without the digits moving —
   * the room was set aside for it either way. In a layout effect, so the size
   * is settled before the paint that first shows the words.
   */
  const notesRef = useRef<HTMLDivElement>(null);

  // Weight and capitals change how wide the words are, so they belong in what
  // the fit is keyed on alongside the words themselves.
  const said = messages
    .map((message) => `${message.text}|${message.caps}|${message.bold}`)
    .join("\u241f");

  useLayoutEffect(() => {
    const refit = () =>
      fitText(notesRef.current, notesHeight, {
        // No floor worth the name: a note that cannot be set at a readable
        // size in the box it has should come down in size, not out of it.
        min: 4,
        max: Math.max(
          12,
          unit * (takeover.length > 0 ? MESSAGE.takeover : MESSAGE.cap),
        ),
      });

    refit();

    return refitOnFontLoad(refit);
  }, [notesHeight, said, takeover.length, unit]);

  // The digits fit the room they are actually left, on the same frame the
  // message appears — no jump, and nothing to overlap.
  const digitsHeight = Math.max(DIGITS_MIN, 1 - spent) * unit;
  const digitSize = Math.floor(
    Math.min(frame.width / widthInEms(text), digitsHeight),
  );

  if (state.blackout)
    return <div className={cn("size-full bg-black", className)} />;

  // A full-screen message is the whole output for as long as it is up: the
  // person on stage should not have to find it under the digits.
  if (takeover.length > 0)
    return (
      <div className={cn("relative size-full px-[6%] py-[5%]", className)}>
        <div
          ref={frameRef}
          className="flex size-full items-center justify-center overflow-hidden"
        >
          <div ref={notesRef} className="w-full space-y-[0.12em] text-center">
            {takeover.map((message) => (
              <MessageLine
                key={message.id}
                message={message}
                now={now}
                // The same four blinks the digits wear, so Flash still reads.
                screenFlashing={flashing}
                weight={message.bold ? 700 : 600}
              />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    // The padding is the screen's own, not the caller's: the bar hangs below
    // it, flush with the bottom edge and corner to corner, the way a stage
    // clock draws it. The column inside is what gets measured, so `unit` stays
    // the room the digits actually have.
    <div
      className={cn("relative size-full px-[5%] pt-[6%] pb-[7%]", className)}
    >
      <div ref={frameRef} className="flex size-full flex-col justify-center">
        {hasName || hasSpeaker ? (
          <div className="shrink-0" style={{ marginBottom: unit * NAME.gap }}>
            {hasName ? (
              <div
                // The line box is the font size and a little under it, and the
                // budget above is taken from that same figure — normal leading
                // would spend a fifth again of the column that nothing accounted
                // for, and none at all cuts the descenders off.
                className="truncate text-center font-medium tracking-[0.2em] text-white/70 uppercase"
                style={{ fontSize: nameSize, lineHeight: NAME.lead }}
              >
                {reading?.name}
              </div>
            ) : null}

            {hasSpeaker ? (
              // Smaller and dimmer, on its own line under the title: the name
              // of the item is what the screen is *for*, and who is giving it
              // is the answer to a second question.
              <div
                className="truncate text-center font-medium tracking-[0.16em] text-white/45 uppercase"
                style={{ fontSize: speakerSize, lineHeight: SPEAKER.lead }}
              >
                {reading?.speaker}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* A note on the screen is what the room is being asked to read, so the
          digits give way to it: with one up they come down to about a third of
          the height and the words take the rest, rather than both settling for
          half. */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <span
            className="leading-none font-semibold whitespace-nowrap tabular-nums"
            style={{
              fontSize: digitSize || 1,
              color: PHASE_COLOR[reading?.phase ?? "normal"],
              transition: "color 300ms linear",
              animation: digitAnimation(
                flashing,
                reading?.phase === "final",
                reading?.finalAt ?? FINAL_MS,
              ),
            }}
          >
            {text}
          </span>
        </div>

        {messages.length > 0 ? (
          <div
            // A note is the point of the screen while it is up — the person
            // reading it is at the back of a hall, glancing — so it takes the
            // larger half and the digits give way. However long the words are,
            // they are set to this box: several notes, or one that runs to
            // three lines, come down in size rather than off the bottom.
            className="flex shrink-0 items-center justify-center overflow-hidden"
            style={{ height: notesHeight, marginTop: unit * MESSAGE.gap }}
          >
            <div
              ref={notesRef}
              className="w-full space-y-[0.12em] px-[2%] text-center"
            >
              {messages.map((message) => (
                <MessageLine
                  key={message.id}
                  message={message}
                  now={now}
                  // The screen's own flash is the digits' business; a note
                  // under them blinks only when it was the one flashed.
                  screenFlashing={0}
                  weight={message.bold ? 700 : 400}
                />
              ))}
            </div>
          </div>
        ) : null}

        {showClock ? (
          <div
            className="shrink-0 text-center leading-none tabular-nums text-white/40"
            style={{
              marginTop: unit * CLOCK.gap,
              fontSize: clockSize,
            }}
          >
            {now === null ? "--:--:--" : formatClock(now)}
          </div>
        ) : null}
      </div>

      {reading && reading.progress !== null ? (
        // Corner to corner along the very bottom, square and full bleed: the
        // run's own margin, read out of the corner of an eye and never in the
        // way of the words. It fills as the run goes and goes green, amber,
        // red with the digits.
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden bg-white/10"
          style={{ height: Math.max(4, unit * BAR_HEIGHT) }}
        >
          <div
            className="h-full"
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
