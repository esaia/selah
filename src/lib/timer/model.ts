/**
 * The stage timer: its model, its transport, and the arithmetic the outputs
 * read it with.
 *
 * A ticking clock cannot be broadcast a frame at a time — that would be a
 * realtime message a second, and a screen on a slow connection would drift
 * visibly. So nothing here counts. What travels is the *shape* of the run:
 * which timer is armed, whether it is running, when it was last resumed and
 * how much had already elapsed before that. Every output derives the digits
 * from its own `Date.now()`, so they agree to within the clock skew between
 * the machines — and `sentAt` lets a reader take even that out (`withSkew`).
 *
 * Everything below is pure and tested, for the same reason the block
 * operations are: getting it wrong shows the wrong number rather than failing.
 */

export const MINUTE = 60_000;

/** How long an output holds the flash. */
export const FLASH_MS = 1600;

/** The last of a run, when the digits go red and start pulsing a second at a
 *  time. Ten seconds is what a stage manager counts out loud. */
export const FINAL_MS = 10_000;

export type TimerKind = "countdown" | "countup" | "clock";

export const TIMER_KINDS: { value: TimerKind; label: string }[] = [
  { value: "countdown", label: "Count down" },
  { value: "countup", label: "Count up" },
  { value: "clock", label: "Time of day" },
];

export type MessageColor = "white" | "green" | "red";

/** Message tints. Literals, because an output page has no console theme. */
export const MESSAGE_COLORS: Record<MessageColor, string> = {
  white: "#ffffff",
  green: "#4ade80",
  red: "#f87171",
};

/**
 * A label's tint. The operator's own colour-coding of the running order — a
 * label never reaches a screen, so these are console colours and there is no
 * reason for an output to know them.
 */
export type LabelColor = "amber" | "pink" | "blue" | "green" | "violet" | "slate";

export const LABEL_COLORS: Record<LabelColor, string> = {
  amber: "#f59e0b",
  pink: "#ec4899",
  blue: "#3b82f6",
  green: "#22c55e",
  violet: "#8b5cf6",
  slate: "#64748b",
};

export interface TimerLabel {
  id: string;
  text: string;
  color: LabelColor;
}

export interface StageTimer {
  id: string;
  name: string;
  /** Who is up. It goes to the stage beside the name. */
  speaker: string;
  /**
   * The operator's own note about the item — a cue, a reminder, what to do if
   * it overruns. It stays in the console: what the person on stage is meant to
   * read is a stage message, which is sent deliberately and one at a time.
   */
  notes: string;
  /** Console-side colour-coding, so a long running order can be read at speed. */
  labels: TimerLabel[];
  kind: TimerKind;
  duration: number;
  /** With this much left the digits turn amber. */
  wrapUp: number;
}

export interface TimerMessage {
  id: string;
  text: string;
  color: MessageColor;
  bold: boolean;
  caps: boolean;
  visible: boolean;
  /** Takes the whole output over, digits and all. */
  fullScreen: boolean;
  /** Bumped to `Date.now()` to blink this message once, wherever it is up. */
  flashAt: number;
}

export interface TimerState {
  timers: StageTimer[];
  activeId: string;
  /**
   * The last timer a run was actually *started* on.
   *
   * Not the same as `activeId`: arming the next item moves the pointer while
   * the thing that has just been given is still the last one anybody heard.
   * The agenda marks it, so a glance at the stage says what has been done as
   * well as what is up.
   */
  playedId: string;
  running: boolean;
  /** When the run was last resumed, on the clock of whoever resumed it. */
  startedAt: number | null;
  /** What had already run before that resume. */
  elapsedBefore: number;
  /** Where a count-up's target has been moved to by the ±1m buttons. A
   *  countdown moves its playhead instead, so it leaves this at zero. */
  adjustMs: number;
  messages: TimerMessage[];
  blackout: boolean;
  /** Bumped to `Date.now()` to make every output flash once. */
  flashAt: number;
  /** Armed onto the projector, where it takes the slide's place. */
  onProjector: boolean;
  /**
   * Up on the stage display, where it takes the slides' place.
   *
   * A flag rather than something read off the run, because stopping a timer is
   * not the same as being done with it: an operator pauses to let a speaker
   * finish a thought and still wants the count in front of them. It goes up
   * when a timer is started and comes down when Clear is pressed, and nothing
   * else moves it.
   */
  onStage: boolean;
  /** Stamped as the payload goes out, so a reader can correct for clock skew. */
  sentAt: number;
}

const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const newTimer = (overrides: Partial<StageTimer> = {}): StageTimer => ({
  id: uid(),
  name: "Timer",
  speaker: "",
  notes: "",
  labels: [],
  kind: "countdown",
  duration: 10 * MINUTE,
  wrapUp: MINUTE,
  ...overrides,
});

export const newLabel = (overrides: Partial<TimerLabel> = {}): TimerLabel => ({
  id: uid(),
  text: "",
  color: "amber",
  ...overrides,
});

export const newMessage = (
  overrides: Partial<TimerMessage> = {},
): TimerMessage => ({
  id: uid(),
  text: "",
  color: "white",
  bold: false,
  caps: false,
  visible: false,
  fullScreen: false,
  flashAt: 0,
  ...overrides,
});

export const emptyTimerState = (): TimerState => {
  const first = newTimer({ name: "Timer 1" });

  return {
    timers: [first],
    activeId: first.id,
    playedId: "",
    running: false,
    startedAt: null,
    elapsedBefore: 0,
    adjustMs: 0,
    // A blank card, so the panel opens with somewhere to type rather than with
    // a button to press first. It carries no text, so it shows on nothing.
    messages: [newMessage()],
    blackout: false,
    flashAt: 0,
    onProjector: false,
    onStage: false,
    sentAt: 0,
  };
};

const num = (value: unknown, fallback: number): number =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const isKind = (value: unknown): value is TimerKind =>
  TIMER_KINDS.some((kind) => kind.value === value);

/**
 * Take anything — a `session_state` row written by an older version, a payload
 * off the channel — and return a state the outputs can draw without checking a
 * single field. Both entry points go through here, so a malformed timer blanks
 * nothing.
 */
export const asTimerState = (raw: unknown): TimerState => {
  const base = emptyTimerState();

  if (!raw || typeof raw !== "object") return base;

  const input = raw as Partial<Record<keyof TimerState, unknown>>;

  const timers = (Array.isArray(input.timers) ? input.timers : [])
    .filter(
      (timer): timer is Record<string, unknown> =>
        Boolean(timer) && typeof timer === "object" && "id" in timer,
    )
    .map((timer): StageTimer => ({
      id: String(timer.id),
      name: typeof timer.name === "string" ? timer.name : "Timer",
      speaker: typeof timer.speaker === "string" ? timer.speaker : "",
      notes: typeof timer.notes === "string" ? timer.notes : "",
      labels: (Array.isArray(timer.labels) ? timer.labels : [])
        .filter(
          (label): label is Record<string, unknown> =>
            Boolean(label) && typeof label === "object" && "id" in label,
        )
        .map((label): TimerLabel => ({
          id: String(label.id),
          text: typeof label.text === "string" ? label.text : "",
          color:
            (label.color as LabelColor) in LABEL_COLORS
              ? (label.color as LabelColor)
              : "amber",
        })),
      kind: isKind(timer.kind) ? timer.kind : "countdown",
      duration: Math.max(0, num(timer.duration, 10 * MINUTE)),
      wrapUp: Math.max(0, num(timer.wrapUp, MINUTE)),
    }));

  const list = timers.length ? timers : base.timers;
  const activeId = list.some((timer) => timer.id === input.activeId)
    ? String(input.activeId)
    : list[0].id;

  const messages = (Array.isArray(input.messages) ? input.messages : [])
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && "id" in item,
    )
    .map((item): TimerMessage => ({
      id: String(item.id),
      text: typeof item.text === "string" ? item.text : "",
      color:
        (item.color as MessageColor) in MESSAGE_COLORS
          ? (item.color as MessageColor)
          : "white",
      bold: Boolean(item.bold),
      caps: Boolean(item.caps),
      visible: Boolean(item.visible),
      fullScreen: Boolean(item.fullScreen),
      flashAt: Math.max(0, num(item.flashAt, 0)),
    }));

  return {
    timers: list,
    activeId,
    // A timer that has since been deleted has not been played by any list this
    // state can be drawn against, so it reads back as nothing.
    playedId: list.some((timer) => timer.id === input.playedId)
      ? String(input.playedId)
      : "",
    running: Boolean(input.running),
    startedAt:
      input.startedAt === null || input.startedAt === undefined
        ? null
        : num(input.startedAt, 0),
    elapsedBefore: Math.max(0, num(input.elapsedBefore, 0)),
    adjustMs: num(input.adjustMs, 0),
    // Always at least one, for the same reason as the timers: a column with
    // nothing in it gives the operator nothing to write on.
    messages: messages.length ? messages : [newMessage()],
    blackout: Boolean(input.blackout),
    flashAt: Math.max(0, num(input.flashAt, 0)),
    onProjector: Boolean(input.onProjector),
    // A row written before the stage had a flag of its own says nothing about
    // it. A run that was going at the time was on the stage screen by the only
    // rule there was then, so that is what it is read back as — otherwise the
    // countdown comes up on a reload with a Clear button that thinks there is
    // nothing to clear.
    onStage: input.onStage === undefined ? Boolean(input.running) : Boolean(input.onStage),
    sentAt: Math.max(0, num(input.sentAt, 0)),
  };
};

/**
 * Put a payload's `startedAt` on the reader's own clock.
 *
 * `startedAt` is stamped by the machine that pressed play. Two screens whose
 * clocks differ by a few seconds would otherwise show different digits for the
 * same run, which is the one thing a stage timer must not do.
 *
 * Only readers do this. A console also publishes, and shifting the run on the
 * way in would mean it sent back something slightly different from what it
 * received — two consoles would push the run around between them forever.
 */
export const withSkew = (
  state: TimerState,
  receivedAt = Date.now(),
): TimerState => {
  if (!state.sentAt || state.startedAt === null) return state;

  // A stored row is read long after it was written. That is a stale stamp, not
  // a skewed clock, and correcting by it would throw the digits out by the age
  // of the row.
  if (Math.abs(receivedAt - state.sentAt) > 30_000) return state;

  return { ...state, startedAt: state.startedAt + (receivedAt - state.sentAt) };
};

export const activeTimer = (state: TimerState): StageTimer | null =>
  state.timers.find((timer) => timer.id === state.activeId) ?? null;

export const elapsedOf = (state: TimerState, now = Date.now()): number =>
  Math.max(
    0,
    state.elapsedBefore +
      (state.running && state.startedAt !== null ? now - state.startedAt : 0),
  );

/* -- Transport. Pure, so a second console adopting the state agrees with the
      first about what pressing play meant. -------------------------------- */

// Starting is also what puts the timer up: an operator who pressed play meant
// the stage to see it, and a second arming step would only be one more thing
// to forget. Taking it down is deliberate — that is what Clear is for.
export const startRun = (state: TimerState, now = Date.now()): TimerState =>
  state.running
    ? state
    : {
        ...state,
        running: true,
        startedAt: now,
        onStage: true,
        // Pressing play is what makes an item the one that was given; arming
        // it, or resetting it afterwards, is not.
        playedId: state.activeId,
      };

export const pauseRun = (state: TimerState, now = Date.now()): TimerState =>
  state.running
    ? {
        ...state,
        running: false,
        startedAt: null,
        elapsedBefore: elapsedOf(state, now),
      }
    : state;

export const toggleRun = (state: TimerState, now = Date.now()): TimerState =>
  state.running ? pauseRun(state, now) : startRun(state, now);

/** Back to the top, still armed and still stopped. */
export const resetRun = (state: TimerState): TimerState => ({
  ...state,
  running: false,
  startedAt: null,
  elapsedBefore: 0,
  adjustMs: 0,
});

/**
 * Move the run to a point on its own timeline, as dragging the scrubber does.
 *
 * A running timer keeps running from where it was dropped — the clock does not
 * stop because the operator reached for it — which is why the resume stamp is
 * taken again rather than left where it was.
 */
export const seekRun = (
  state: TimerState,
  elapsed: number,
  now = Date.now(),
): TimerState => ({
  ...state,
  elapsedBefore: Math.max(0, elapsed),
  startedAt: state.running ? now : null,
});

/** How long the armed timer runs for, this time round, with ± applied. */
export const totalOf = (state: TimerState): number => {
  const timer = activeTimer(state);

  return !timer || timer.kind === "clock"
    ? 0
    : Math.max(0, timer.duration + state.adjustMs);
};

/**
 * ±1m. It moves the playhead, not the length of the run.
 *
 * A countdown given a minute at 5:00 of 10:00 should read 6:00 with the same
 * ten minutes on the scrubber — the operator is buying the speaker a minute,
 * not redefining the slot — so the minute comes off what has elapsed and the
 * handle slides back along a track that keeps its length. Elapsed cannot go
 * below zero, so a countdown tops out at its own duration. A count-up has no
 * remaining to give, so there the minute still moves the target.
 */
export const adjustRun = (
  state: TimerState,
  deltaMs: number,
  now = Date.now(),
): TimerState => {
  if (activeTimer(state)?.kind === "countup")
    return { ...state, adjustMs: state.adjustMs + deltaMs };

  // Through `seekRun`, so a running timer is rebased the way dragging rebases
  // it: the elapsed time stays a positive number on the wire, which is what
  // every reader normalises it as.
  return seekRun(state, Math.max(0, elapsedOf(state, now) - deltaMs), now);
};

/**
 * Arm a timer. Switching starts it from the top — resuming into a different
 * duration half-elapsed is never what anyone means — while arming the one
 * already live leaves its run alone.
 */
export const armTimer = (state: TimerState, id: string): TimerState =>
  state.activeId === id ? state : { ...resetRun(state), activeId: id };

/** Next or previous in the running order, stopping at the ends. */
export const stepTimer = (state: TimerState, direction: number): TimerState => {
  const index = state.timers.findIndex((timer) => timer.id === state.activeId);
  const next =
    state.timers[
      Math.max(0, Math.min(state.timers.length - 1, index + direction))
    ];

  return next ? armTimer(state, next.id) : state;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** `M:SS` under an hour, `H:MM:SS` over it — the way a stage clock is read. */
export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return hours
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};

/**
 * The time of day. Seconds are optional because the two places it is read want
 * different things: a wall clock on a screen is read the way a clock on a wall
 * is — `16:32`, no ticking last pair to catch the eye — while the console's own
 * `NOW` is an operator's readout, where the seconds are the point.
 */
export const formatClock = (now = Date.now(), withSeconds = true): string => {
  const date = new Date(now);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return withSeconds ? `${time}:${pad(date.getSeconds())}` : time;
};

export const HOUR = 60 * MINUTE;

/**
 * How far into its hour `at` is.
 *
 * A wall clock's run is the hour it is in — the only span short enough to
 * watch move and long enough to mean something across a service. Taken off a
 * `Date` rather than by remainder, because a good many zones are offset by
 * half an hour and their hours do not line up with UTC's.
 */
export const intoHour = (at: number): number => {
  const date = new Date(at);

  return (
    date.getMinutes() * MINUTE +
    date.getSeconds() * 1_000 +
    date.getMilliseconds()
  );
};

/** Parse `10`, `10:00` or `1:02:30` into milliseconds; `null` if it is none of them. */
export const parseDuration = (input: string): number | null => {
  const text = input.trim();

  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(text)) return null;

  const parts = text.split(":").map(Number);

  // A bare number is minutes: typing "10" for ten minutes is the common case.
  const [hours, minutes, seconds] =
    parts.length === 1
      ? [0, parts[0], 0]
      : parts.length === 2
        ? [0, parts[0], parts[1]]
        : parts;

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * `warn` is the wrap-up the operator set, `final` is the last ten seconds and
 * `over` is past zero. The last two are both red — what separates them is that
 * `final` is still time the speaker has.
 */
export type Phase = "normal" | "warn" | "final" | "over";

export interface TimerReading {
  name: string;
  speaker: string;
  kind: TimerKind;
  text: string;
  /**
   * How much of the run has *gone*, 0–1 — `null` when there is no run to be
   * through, which is a count-up nobody gave a target.
   *
   * Elapsed rather than remaining so a bar drawn from it fills left to right
   * whichever way the digits are counting. A countdown whose bar drained
   * right-to-left had the moving edge travelling backwards past a room reading
   * it out of the corner of an eye.
   */
  progress: number | null;
  phase: Phase;
  overtime: boolean;
}

/**
 * Which colour a run is wearing, from how much of it is left. `null` is a run
 * with no target to be near the end of — a count-up nobody set a length for.
 */
const phaseOf = (remaining: number | null, wrapUp: number): Phase =>
  remaining === null
    ? "normal"
    : remaining <= FINAL_MS
      ? "final"
      : remaining <= wrapUp
        ? "warn"
        : "normal";

/** Everything an output needs to draw one frame. */
export const timerReading = (
  state: TimerState,
  now = Date.now(),
): TimerReading | null => {
  const timer = activeTimer(state);

  if (!timer) return null;

  const base = { name: timer.name, speaker: timer.speaker, kind: timer.kind };

  if (timer.kind === "clock") {
    return {
      ...base,
      text: formatClock(now, false),
      // Its run is the hour, so the line under it is the hour going by.
      progress: clamp01(intoHour(now) / HOUR),
      phase: "normal",
      overtime: false,
    };
  }

  const elapsed = elapsedOf(state, now);
  const total = Math.max(0, timer.duration + state.adjustMs);

  if (timer.kind === "countup") {
    const overtime = total > 0 && elapsed > total;

    return {
      ...base,
      text: formatDuration(elapsed),
      progress: total ? clamp01(elapsed / total) : null,
      phase: overtime
        ? "over"
        : phaseOf(total ? total - elapsed : null, timer.wrapUp),
      overtime,
    };
  }

  const remaining = total - elapsed;
  const overtime = remaining < 0;

  return {
    ...base,
    text: `${overtime ? "-" : ""}${formatDuration(Math.abs(remaining))}`,
    progress: total ? clamp01(elapsed / total) : 0,
    phase: overtime ? "over" : phaseOf(remaining, timer.wrapUp),
    overtime,
  };
};

/** When this run reaches zero, projected forward from wherever it is now. */
export const finishesAt = (
  state: TimerState,
  now = Date.now(),
): number | null => {
  const timer = activeTimer(state);

  if (!timer || timer.kind === "clock") return null;

  const total = Math.max(0, timer.duration + state.adjustMs);

  return total ? now + (total - elapsedOf(state, now)) : null;
};

/** The ink a phase is drawn in, on an output and in the console preview. */
export const PHASE_COLOR: Record<Phase, string> = {
  normal: "#ffffff",
  warn: "#fbbf24",
  final: "#f87171",
  over: "#f87171",
};

export const PHASE_BAR: Record<Phase, string> = {
  normal: "#22c55e",
  warn: "#fbbf24",
  final: "#ef4444",
  over: "#ef4444",
};

export const visibleMessages = (state: TimerState): TimerMessage[] =>
  state.messages.filter((message) => message.visible && message.text.trim());

/** Whether the timer is putting anything in front of the room. */
export const onOutputs = (state: TimerState): boolean =>
  state.onProjector || state.onStage || visibleMessages(state).length > 0;

/**
 * Whether the stage screen gives itself over to the run.
 *
 * One flag, moved by two deliberate acts: play puts the timer up, Clear takes
 * it down. Stop does not, because stopping is a thing an operator does *to* a
 * running count and not a statement that the stage has finished with it.
 *
 * With it down the stage goes back to the slides on its own, and a note the
 * operator has up is shown there in its own box — the screen never has to be
 * reloaded to change its mind.
 */
export const timerIsLive = (state: TimerState): boolean => state.onStage;

/**
 * Take the timer off the outputs: off the stage screen, disarmed from the
 * projector, every note down, and the run itself back to the top.
 *
 * The run goes with it because Clear is the end of a segment and not a pause in
 * one — the operator who pressed it is done with this count, and a transport
 * still showing Pause over a timer nothing can see is a lie about the state of
 * the desk. Stopping without giving the screens back is what the transport is
 * for; giving the screens back without stopping is not a thing anyone asked
 * for twice.
 */
export const clearOutputs = (state: TimerState): TimerState =>
  onOutputs(state) || state.running
    ? {
        ...resetRun(state),
        onProjector: false,
        onStage: false,
        messages: state.messages.map((message) =>
          message.visible ? { ...message, visible: false } : message,
        ),
      }
    : state;
