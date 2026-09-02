import { describe, expect, it } from 'vitest';

import {
  MINUTE,
  adjustRun,
  armTimer,
  asTimerState,
  elapsedOf,
  emptyTimerState,
  finishesAt,
  formatDuration,
  newTimer,
  parseDuration,
  pauseRun,
  resetRun,
  seekRun,
  startRun,
  stepTimer,
  timerReading,
  visibleMessages,
  withSkew,
  type TimerState,
} from './model';

/** A ten-minute countdown with a one-minute wrap-up, stopped at the top. */
const state = (): TimerState => {
  const base = emptyTimerState();

  return {
    ...base,
    timers: [{ ...base.timers[0], duration: 10 * MINUTE, wrapUp: MINUTE }],
  };
};

describe('parseDuration', () => {
  it('reads a bare number as minutes', () => {
    expect(parseDuration('10')).toBe(10 * MINUTE);
  });

  it('reads minutes and hours', () => {
    expect(parseDuration('10:30')).toBe(630_000);
    expect(parseDuration('1:02:30')).toBe(3_750_000);
  });

  it('refuses anything else rather than guessing', () => {
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('10:30:00:00')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('drops the hour until there is one', () => {
    expect(formatDuration(600_000)).toBe('10:00');
    expect(formatDuration(5_500)).toBe('0:05');
    expect(formatDuration(3_750_000)).toBe('1:02:30');
  });
});

describe('a countdown run', () => {
  const t0 = 1_000_000;

  it('counts from the duration and turns amber inside the wrap-up', () => {
    const running = startRun(state(), t0);

    expect(timerReading(running, t0)?.text).toBe('10:00');
    expect(timerReading(running, t0 + 65_000)?.text).toBe('8:55');
    expect(timerReading(running, t0 + 65_000)?.phase).toBe('normal');
    expect(timerReading(running, t0 + 9.5 * MINUTE)?.phase).toBe('warn');
  });

  it('goes negative rather than stopping at zero', () => {
    const over = timerReading(startRun(state(), t0), t0 + 10.5 * MINUTE);

    expect(over?.text).toBe('-0:30');
    expect(over?.phase).toBe('over');
    expect(over?.overtime).toBe(true);
  });

  it('holds while paused and carries on from there', () => {
    const paused = pauseRun(startRun(state(), t0), t0 + 60_000);

    expect(elapsedOf(paused, t0 + 999_999)).toBe(60_000);
    expect(timerReading(paused, t0 + 999_999)?.text).toBe('9:00');

    const resumed = startRun(paused, 5_000_000);

    expect(timerReading(resumed, 5_060_000)?.text).toBe('8:00');
  });

  it('takes a minute added mid-run, and gives it back on reset', () => {
    const resumed = startRun(pauseRun(startRun(state(), t0), t0 + 60_000), 5_000_000);
    const added = adjustRun(resumed, MINUTE);

    expect(timerReading(added, 5_060_000)?.text).toBe('9:00');
    expect(timerReading(resetRun(added), 9_999_999)?.text).toBe('10:00');
    expect(resetRun(added).running).toBe(false);
  });

  it('projects when it will reach zero', () => {
    expect(finishesAt(startRun(state(), t0), t0 + 60_000)).toBe(t0 + 60_000 + 9 * MINUTE);
  });
});

describe('seekRun', () => {
  const t0 = 1_000_000;

  it('drops a stopped timer at the point it was dragged to', () => {
    const sought = seekRun(state(), 4 * MINUTE, t0);

    expect(timerReading(sought, t0 + 60_000)?.text).toBe('6:00');
    expect(sought.running).toBe(false);
  });

  it('keeps a running timer running from there', () => {
    const sought = seekRun(startRun(state(), t0), 4 * MINUTE, t0 + 30_000);

    expect(sought.running).toBe(true);
    expect(timerReading(sought, t0 + 90_000)?.text).toBe('5:00');
  });
});

describe('arming', () => {
  const two = (): TimerState => {
    const base = state();

    return {
      ...base,
      timers: [...base.timers, newTimer({ id: 'second', name: 'Second', duration: 5 * MINUTE })],
    };
  };

  it('leaves the run alone when the timer is already armed', () => {
    const running = startRun(two(), 1_000);

    expect(armTimer(running, running.activeId).running).toBe(true);
  });

  it('starts a different timer from the top', () => {
    const next = stepTimer(startRun(two(), 1_000), 1);

    expect(next.activeId).toBe('second');
    expect(next.running).toBe(false);
    expect(timerReading(next, 9_999_999)?.text).toBe('5:00');
  });

  it('stops at the ends of the running order', () => {
    const running = startRun(two(), 1_000);

    expect(stepTimer(running, -1).activeId).toBe(running.activeId);
    expect(stepTimer(stepTimer(running, 1), 1).activeId).toBe('second');
  });
});

describe('the other two kinds', () => {
  it('counts up, and past its target', () => {
    const base = state();
    const up = startRun({ ...base, timers: [{ ...base.timers[0], kind: 'countup' }] }, 0);

    expect(timerReading(up, 90_000)?.text).toBe('1:30');
    expect(timerReading(up, 11 * MINUTE)?.overtime).toBe(true);
  });

  it('shows a wall clock with no progress bar', () => {
    const base = state();
    const clock = {
      ...base,
      timers: [{ ...base.timers[0], kind: 'clock' as const }],
    };

    expect(timerReading(clock, Date.now())?.progress).toBeNull();
  });
});

describe('withSkew', () => {
  const sent = (): TimerState => ({
    ...startRun(state(), 1_000),
    sentAt: 1_500,
  });

  it("moves the run onto the reader's clock", () => {
    expect(withSkew(sent(), 1_700).startedAt).toBe(1_200);
  });

  it('leaves a stale stamp alone, because that is age and not skew', () => {
    expect(withSkew(sent(), 61_500).startedAt).toBe(1_000);
  });
});

describe('asTimerState', () => {
  it('survives a malformed row rather than blanking the screen', () => {
    const parsed = asTimerState({
      timers: 'nope',
      activeId: 'ghost',
      messages: [{ id: 'a', color: 'purple' }],
    });

    expect(parsed.timers).toHaveLength(1);
    expect(parsed.activeId).toBe(parsed.timers[0].id);
    expect(parsed.messages[0].color).toBe('white');
  });

  it('falls back completely on nothing at all', () => {
    expect(asTimerState(null).timers).toHaveLength(1);
    expect(asTimerState(undefined).running).toBe(false);
  });

  it('always keeps a message to write in, and never shows a blank one', () => {
    expect(emptyTimerState().messages).toHaveLength(1);
    expect(asTimerState({ messages: [] }).messages).toHaveLength(1);
    expect(visibleMessages(emptyTimerState())).toHaveLength(0);
  });
});
