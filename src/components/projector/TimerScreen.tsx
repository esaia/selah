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

const TICK_MS = 250;

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

const readClock = () => (clockSnapshot ||= Date.now());
const noClock = () => null;

export const useTimerNow = (): number | null =>
  useSyncExternalStore(subscribeClock, readClock, noClock);

const widthInEms = (text: string) =>
  [...text].reduce(
    (sum, char) => sum + (char === ":" ? 0.34 : char === "-" ? 0.42 : 0.62),
    0,
  );

const NAME = { size: 0.065, gap: 0.03, lead: 1.3 };

const SPEAKER = { size: 0.045, lead: 1.35 };
const CLOCK = { size: 0.05, gap: 0.04 };

const MESSAGE = { share: 0.45, gap: 0.04, cap: 0.3, takeover: 0.34 };

const BAR_HEIGHT = 0.035;

const DIGITS_MIN = 0.12;

const MIN_TYPE = 10;

const digitAnimation = (flashing: number, final: boolean, finalAt: number) =>
  flashAnimation(flashing) ??
  (final
    ? `timer-final 1000ms ease-in-out ${Math.max(1, Math.round(finalAt / 1000))}`
    : undefined);

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

  const reading = timerReading(state, now ?? state.startedAt ?? 0);

  const text =
    now === null && reading?.kind === "clock"
      ? "--:--"
      : (reading?.text ?? "0:00");

  const [frameRef, frame] = useBox();

  const unit = frame.height;

  const flashing = useFlash(state.flashAt, now);

  const messages = visibleMessages(state);
  const takeover = messages.filter((message) => message.fullScreen);

  const hasName = Boolean(showName && reading?.name);
  const hasSpeaker = Boolean(showName && reading?.speaker);

  const nameSize = hasName ? Math.max(MIN_TYPE, unit * NAME.size) : 0;
  const speakerSize = hasSpeaker ? Math.max(MIN_TYPE, unit * SPEAKER.size) : 0;
  const clockSize = showClock ? Math.max(MIN_TYPE, unit * CLOCK.size) : 0;

  const spent = unit
    ? (hasName ? (nameSize * NAME.lead) / unit : 0) +
      (hasSpeaker ? (speakerSize * SPEAKER.lead) / unit : 0) +
      (hasName || hasSpeaker ? NAME.gap : 0) +
      (showClock ? clockSize / unit + CLOCK.gap : 0) +
      (messages.length > 0 ? MESSAGE.gap + MESSAGE.share : 0)
    : 0;

  const notesHeight =
    takeover.length > 0 ? unit : Math.round(unit * MESSAGE.share);

  const notesRef = useRef<HTMLDivElement>(null);

  const said = messages
    .map((message) => `${message.text}|${message.caps}|${message.bold}`)
    .join("\u241f");

  useLayoutEffect(() => {
    const refit = () =>
      fitText(notesRef.current, notesHeight, {
        min: 4,
        max: Math.max(
          12,
          unit * (takeover.length > 0 ? MESSAGE.takeover : MESSAGE.cap),
        ),
      });

    refit();

    return refitOnFontLoad(refit);
  }, [notesHeight, said, takeover.length, unit]);

  const digitsHeight = Math.max(DIGITS_MIN, 1 - spent) * unit;
  const digitSize = Math.floor(
    Math.min(frame.width / widthInEms(text), digitsHeight),
  );

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
                screenFlashing={flashing}
                weight={message.bold ? 700 : 600}
              />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div
      className={cn("relative size-full px-[5%] pt-[6%] pb-[7%]", className)}
    >
      <div ref={frameRef} className="flex size-full flex-col justify-center">
        {hasName || hasSpeaker ? (
          <div className="shrink-0" style={{ marginBottom: unit * NAME.gap }}>
            {hasName ? (
              <div
                className="truncate text-center font-medium tracking-[0.2em] text-white/70 uppercase"
                style={{ fontSize: nameSize, lineHeight: NAME.lead }}
              >
                {reading?.name}
              </div>
            ) : null}

            {hasSpeaker ? (
              <div
                className="truncate text-center font-medium tracking-[0.16em] text-white/45 uppercase"
                style={{ fontSize: speakerSize, lineHeight: SPEAKER.lead }}
              >
                {reading?.speaker}
              </div>
            ) : null}
          </div>
        ) : null}

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
