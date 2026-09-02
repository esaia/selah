import { describe, expect, it } from "vitest";

import {
  MINUTE,
  adjustRun,
  armTimer,
  FINAL_MS,
  asTimerState,
  clearOutputs,
  elapsedOf,
  emptyTimerState,
  finishesAt,
  formatDuration,
  newMessage,
  newTimer,
  onOutputs,
  parseDuration,
  pauseRun,
  resetRun,
  runUnderWay,
  seekRun,
  startRun,
  stepTimer,
  timerIsLive,
  timerReading,
  totalOf,
  visibleMessages,
  withSkew,
  type TimerState,
} from "./model";

/** A ten-minute countdown with a one-minute wrap-up, stopped at the top. */
const state = (): TimerState => {
  const base = emptyTimerState();

  return {
    ...base,
    timers: [{ ...base.timers[0], duration: 10 * MINUTE, wrapUp: MINUTE }],
  };
};

describe("parseDuration", () => {
  it("reads a bare number as minutes", () => {
    expect(parseDuration("10")).toBe(10 * MINUTE);
  });

  it("reads minutes and hours", () => {
    expect(parseDuration("10:30")).toBe(630_000);
    expect(parseDuration("1:02:30")).toBe(3_750_000);
  });

  it("refuses anything else rather than guessing", () => {
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("10:30:00:00")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("drops the hour until there is one", () => {
    expect(formatDuration(600_000)).toBe("10:00");
    expect(formatDuration(5_500)).toBe("0:05");
    expect(formatDuration(3_750_000)).toBe("1:02:30");
  });
});

describe("a countdown run", () => {
  const t0 = 1_000_000;

  it("counts from the duration and turns amber inside the wrap-up", () => {
    const running = startRun(state(), t0);

    expect(timerReading(running, t0)?.text).toBe("10:00");
    expect(timerReading(running, t0 + 65_000)?.text).toBe("8:55");
    expect(timerReading(running, t0 + 65_000)?.phase).toBe("normal");
    expect(timerReading(running, t0 + 9.5 * MINUTE)?.phase).toBe("warn");
  });

  it("goes negative rather than stopping at zero", () => {
    const over = timerReading(startRun(state(), t0), t0 + 10.5 * MINUTE);

    expect(over?.text).toBe("-0:30");
    expect(over?.phase).toBe("over");
    expect(over?.overtime).toBe(true);
  });

  it("holds while paused and carries on from there", () => {
    const paused = pauseRun(startRun(state(), t0), t0 + 60_000);

    expect(elapsedOf(paused, t0 + 999_999)).toBe(60_000);
    expect(timerReading(paused, t0 + 999_999)?.text).toBe("9:00");

    const resumed = startRun(paused, 5_000_000);

    expect(timerReading(resumed, 5_060_000)?.text).toBe("8:00");
  });

  it("takes a minute added mid-run, and gives it back on reset", () => {
    const resumed = startRun(
      pauseRun(startRun(state(), t0), t0 + 60_000),
      5_000_000,
    );
    const added = adjustRun(resumed, MINUTE, 5_000_000);

    expect(timerReading(added, 5_060_000)?.text).toBe("9:00");
    expect(timerReading(resetRun(added), 9_999_999)?.text).toBe("10:00");
    expect(resetRun(added).running).toBe(false);
  });

  it("moves the playhead rather than the length of the run", () => {
    const running = startRun(state(), t0);
    const added = adjustRun(running, MINUTE, t0 + 5 * MINUTE);

    // Six minutes left of the same ten: only the elapsed time moved.
    expect(timerReading(added, t0 + 5 * MINUTE)?.text).toBe("6:00");
    expect(totalOf(added)).toBe(totalOf(running));

    // And it stops at the top rather than running past the start.
    expect(
      timerReading(
        adjustRun(added, 10 * MINUTE, t0 + 5 * MINUTE),
        t0 + 5 * MINUTE,
      )?.text,
    ).toBe("10:00");
  });

  it("still moves the target of a count-up", () => {
    const up = armTimer(
      {
        ...state(),
        timers: [
          ...state().timers,
          newTimer({ id: "up", kind: "countup", duration: 10 * MINUTE }),
        ],
      },
      "up",
    );

    expect(totalOf(adjustRun(up, MINUTE))).toBe(11 * MINUTE);
  });

  it("projects when it will reach zero", () => {
    expect(finishesAt(startRun(state(), t0), t0 + 60_000)).toBe(
      t0 + 60_000 + 9 * MINUTE,
    );
  });
});

describe("seekRun", () => {
  const t0 = 1_000_000;

  it("drops a stopped timer at the point it was dragged to", () => {
    const sought = seekRun(state(), 4 * MINUTE, t0);

    expect(timerReading(sought, t0 + 60_000)?.text).toBe("6:00");
    expect(sought.running).toBe(false);
  });

  it("keeps a running timer running from there", () => {
    const sought = seekRun(startRun(state(), t0), 4 * MINUTE, t0 + 30_000);

    expect(sought.running).toBe(true);
    expect(timerReading(sought, t0 + 90_000)?.text).toBe("5:00");
  });
});

describe("arming", () => {
  const two = (): TimerState => {
    const base = state();

    return {
      ...base,
      timers: [
        ...base.timers,
        newTimer({ id: "second", name: "Second", duration: 5 * MINUTE }),
      ],
    };
  };

  it("leaves the run alone when the timer is already armed", () => {
    const running = startRun(two(), 1_000);

    expect(armTimer(running, running.activeId).running).toBe(true);
  });

  it("starts a different timer from the top", () => {
    const next = stepTimer(startRun(two(), 1_000), 1);

    expect(next.activeId).toBe("second");
    expect(next.running).toBe(false);
    expect(timerReading(next, 9_999_999)?.text).toBe("5:00");
  });

  it("remembers the last timer a run was started on", () => {
    const running = startRun(two(), 1_000);

    expect(running.playedId).toBe(running.activeId);

    // Arming the next item moves the pointer; what was given stays what was
    // given, and a reset afterwards does not take it back either.
    const armed = armTimer(pauseRun(running, 2_000), "second");

    expect(armed.activeId).toBe("second");
    expect(armed.playedId).toBe(running.activeId);
    expect(resetRun(armed).playedId).toBe(running.activeId);
  });

  it("stops at the ends of the running order", () => {
    const running = startRun(two(), 1_000);

    expect(stepTimer(running, -1).activeId).toBe(running.activeId);
    expect(stepTimer(stepTimer(running, 1), 1).activeId).toBe("second");
  });
});

describe("the other two kinds", () => {
  it("counts up, and past its target", () => {
    const base = state();
    const up = startRun(
      { ...base, timers: [{ ...base.timers[0], kind: "countup" }] },
      0,
    );

    expect(timerReading(up, 90_000)?.text).toBe("1:30");
    expect(timerReading(up, 11 * MINUTE)?.overtime).toBe(true);
  });

  it("reads a wall clock to the minute, and its run is the hour", () => {
    const base = state();
    const clock = {
      ...base,
      timers: [{ ...base.timers[0], kind: "clock" as const }],
    };

    // Local time, built the same way the reading does, so the assertion holds
    // wherever the tests run.
    const at = new Date(2026, 0, 1, 16, 15, 30).getTime();
    const reading = timerReading(clock, at);

    expect(reading?.text).toBe("16:15");
    expect(reading?.progress).toBeCloseTo(15.5 / 60, 5);
    expect(reading?.phase).toBe("normal");
  });
});

describe("withSkew", () => {
  const sent = (): TimerState => ({
    ...startRun(state(), 1_000),
    sentAt: 1_500,
  });

  it("moves the run onto the reader's clock", () => {
    expect(withSkew(sent(), 1_700).startedAt).toBe(1_200);
  });

  it("leaves a stale stamp alone, because that is age and not skew", () => {
    expect(withSkew(sent(), 61_500).startedAt).toBe(1_000);
  });
});

describe("asTimerState", () => {
  it("survives a malformed row rather than blanking the screen", () => {
    const parsed = asTimerState({
      timers: "nope",
      activeId: "ghost",
      messages: [{ id: "a", color: "purple" }],
    });

    expect(parsed.timers).toHaveLength(1);
    expect(parsed.activeId).toBe(parsed.timers[0].id);
    expect(parsed.messages[0].color).toBe("white");
  });

  it("falls back completely on nothing at all", () => {
    expect(asTimerState(null).timers).toHaveLength(1);
    expect(asTimerState(undefined).running).toBe(false);
  });

  it("always keeps a message to write in, and never shows a blank one", () => {
    expect(emptyTimerState().messages).toHaveLength(1);
    expect(asTimerState({ messages: [] }).messages).toHaveLength(1);
    expect(visibleMessages(emptyTimerState())).toHaveLength(0);
  });
});

describe("clearOutputs", () => {
  const showing = (): TimerState => ({
    ...state(),
    onProjector: true,
    messages: [
      newMessage({ id: "up", text: "Wrap up", visible: true }),
      newMessage({ id: "down", text: "Five minutes" }),
    ],
  });

  it("takes the timer off the projector and every message down", () => {
    const cleared = clearOutputs(showing());

    expect(cleared.onProjector).toBe(false);
    expect(visibleMessages(cleared)).toEqual([]);
    expect(onOutputs(cleared)).toBe(false);
  });

  it("takes the run back to the top with the screens", () => {
    const cleared = clearOutputs(startRun(showing(), 1_000));

    expect(cleared.running).toBe(false);
    expect(cleared.startedAt).toBe(null);
    expect(elapsedOf(cleared, 4_000)).toBe(0);
  });

  it("is the same object when nothing is on the outputs", () => {
    const idle = state();

    expect(clearOutputs(idle)).toBe(idle);
    expect(onOutputs(idle)).toBe(false);
  });

  it("counts a message with no text as nothing to clear", () => {
    const blank: TimerState = {
      ...state(),
      messages: [newMessage({ text: "   ", visible: true })],
    };

    expect(onOutputs(blank)).toBe(false);
  });
});

describe("the last ten seconds", () => {
  /** A ten-minute countdown, started at t=0 and read `left` from the end. */
  const at = (left: number) =>
    timerReading(startRun(state(), 0), 10 * MINUTE - left);

  it("goes red inside the final ten", () => {
    expect(at(FINAL_MS + 1_000)?.phase).toBe("warn");
    expect(at(FINAL_MS)?.phase).toBe("final");
    expect(at(1_000)?.phase).toBe("final");
  });

  it("hands over to overtime at zero", () => {
    expect(at(0)?.phase).toBe("final");
    expect(at(-1_000)?.phase).toBe("over");
  });

  it("leaves a count-up with no target alone", () => {
    const base = state();
    const open = startRun(
      {
        ...base,
        timers: [{ ...base.timers[0], kind: "countup", duration: 0 }],
      },
      0,
    );

    expect(timerReading(open, 60_000)?.phase).toBe("normal");
  });
});

describe("timerIsLive", () => {
  const switched = (): TimerState => ({ ...emptyTimerState(), onStage: true });

  it("leaves the stage screen to the slides until it is switched over", () => {
    expect(timerIsLive(emptyTimerState())).toBe(false);
  });

  it("is the operator's switch, and not something starting a run decides", () => {
    const started = startRun(emptyTimerState(), 1_000);

    expect(timerIsLive(started)).toBe(false);
    expect(runUnderWay(started)).toBe(true);
  });

  it("stays up through stop and reset once it has been switched", () => {
    const started = startRun(switched(), 1_000);

    expect(timerIsLive(started)).toBe(true);
    expect(timerIsLive(pauseRun(started, 5_000))).toBe(true);
    expect(timerIsLive(resetRun(started))).toBe(true);
  });

  it("puts a run on the rail while it is going, and only while it is going", () => {
    const started = startRun(emptyTimerState(), 1_000);

    expect(runUnderWay(emptyTimerState())).toBe(false);
    expect(runUnderWay(pauseRun(started, 5_000))).toBe(true);
    expect(runUnderWay(resetRun(started))).toBe(false);
  });

  it("reads a run stored before the flag existed as up, so Clear has something to do", () => {
    const stored = asTimerState({ ...emptyTimerState(), running: true, onStage: undefined });

    expect(timerIsLive(stored)).toBe(true);
    expect(onOutputs(stored)).toBe(true);
  });

  it("stops the run it takes down, so the transport does not offer to pause nothing", () => {
    const cleared = clearOutputs(startRun(switched(), 1_000));

    expect(cleared.running).toBe(false);
    expect(cleared.elapsedBefore).toBe(0);
    expect(timerIsLive(asTimerState(cleared))).toBe(false);
  });

  it("comes down only on clear", () => {
    const started = startRun(switched(), 1_000);

    expect(timerIsLive(clearOutputs(pauseRun(started, 5_000)))).toBe(false);
  });
});
