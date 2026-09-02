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

export type TimerKind = 'countdown' | 'countup' | 'clock';

export const TIMER_KINDS: { value: TimerKind; label: string }[] = [
  { value: 'countdown', label: 'Count down' },
  { value: 'countup', label: 'Count up' },
  { value: 'clock', label: 'Time of day' },
];

export type MessageColor = 'white' | 'green' | 'red';

/** Message tints. Literals, because an output page has no console theme. */
export const MESSAGE_COLORS: Record<MessageColor, string> = {
  white: '#ffffff',
  green: '#4ade80',
  red: '#f87171',
};

export interface StageTimer {
  id: string;
  name: string;
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
}

export interface TimerState {
  timers: StageTimer[];
  activeId: string;
  running: boolean;
  /** When the run was last resumed, on the clock of whoever resumed it. */
  startedAt: number | null;
  /** What had already run before that resume. */
  elapsedBefore: number;
  /** Time added or taken off this run by the ±1m buttons. */
  adjustMs: number;
  messages: TimerMessage[];
  blackout: boolean;
  /** Bumped to `Date.now()` to make every output flash once. */
  flashAt: number;
  /** Armed onto the projector, where it takes the slide's place. */
  onProjector: boolean;
  /** Stamped as the payload goes out, so a reader can correct for clock skew. */
  sentAt: number;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const newTimer = (overrides: Partial<StageTimer> = {}): StageTimer => ({
  id: uid(),
  name: 'Timer',
  kind: 'countdown',
  duration: 10 * MINUTE,
  wrapUp: MINUTE,
  ...overrides,
});

export const newMessage = (overrides: Partial<TimerMessage> = {}): TimerMessage => ({
  id: uid(),
  text: '',
  color: 'white',
  bold: false,
  caps: false,
  visible: false,
  ...overrides,
});

export const emptyTimerState = (): TimerState => {
  const first = newTimer({ name: 'Timer 1' });

  return {
    timers: [first],
    activeId: first.id,
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
    sentAt: 0,
  };
};

const num = (value: unknown, fallback: number): number => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const isKind = (value: unknown): value is TimerKind => TIMER_KINDS.some(kind => kind.value === value);

/**
 * Take anything — a `session_state` row written by an older version, a payload
 * off the channel — and return a state the outputs can draw without checking a
 * single field. Both entry points go through here, so a malformed timer blanks
 * nothing.
 */
export const asTimerState = (raw: unknown): TimerState => {
  const base = emptyTimerState();

  if (!raw || typeof raw !== 'object') return base;

  const input = raw as Partial<Record<keyof TimerState, unknown>>;

  const timers = (Array.isArray(input.timers) ? input.timers : [])
    .filter((timer): timer is Record<string, unknown> => Boolean(timer) && typeof timer === 'object' && 'id' in timer)
    .map((timer): StageTimer => ({
      id: String(timer.id),
      name: typeof timer.name === 'string' ? timer.name : 'Timer',
      kind: isKind(timer.kind) ? timer.kind : 'countdown',
      duration: Math.max(0, num(timer.duration, 10 * MINUTE)),
      wrapUp: Math.max(0, num(timer.wrapUp, MINUTE)),
    }));

  const list = timers.length ? timers : base.timers;
  const activeId = list.some(timer => timer.id === input.activeId) ? String(input.activeId) : list[0].id;

  const messages = (Array.isArray(input.messages) ? input.messages : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && 'id' in item)
    .map((item): TimerMessage => ({
      id: String(item.id),
      text: typeof item.text === 'string' ? item.text : '',
      color: (item.color as MessageColor) in MESSAGE_COLORS ? (item.color as MessageColor) : 'white',
      bold: Boolean(item.bold),
      caps: Boolean(item.caps),
      visible: Boolean(item.visible),
    }));

  return {
    timers: list,
    activeId,
    running: Boolean(input.running),
    startedAt: input.startedAt === null || input.startedAt === undefined ? null : num(input.startedAt, 0),
    elapsedBefore: Math.max(0, num(input.elapsedBefore, 0)),
    adjustMs: num(input.adjustMs, 0),
    // Always at least one, for the same reason as the timers: a column with
    // nothing in it gives the operator nothing to write on.
    messages: messages.length ? messages : [newMessage()],
    blackout: Boolean(input.blackout),
    flashAt: Math.max(0, num(input.flashAt, 0)),
    onProjector: Boolean(input.onProjector),
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
export const withSkew = (state: TimerState, receivedAt = Date.now()): TimerState => {
  if (!state.sentAt || state.startedAt === null) return state;

  // A stored row is read long after it was written. That is a stale stamp, not
  // a skewed clock, and correcting by it would throw the digits out by the age
  // of the row.
  if (Math.abs(receivedAt - state.sentAt) > 30_000) return state;

  return { ...state, startedAt: state.startedAt + (receivedAt - state.sentAt) };
};

export const activeTimer = (state: TimerState): StageTimer | null =>
  state.timers.find(timer => timer.id === state.activeId) ?? null;

export const elapsedOf = (state: TimerState, now = Date.now()): number =>
  Math.max(0, state.elapsedBefore + (state.running && state.startedAt !== null ? now - state.startedAt : 0));

/* -- Transport. Pure, so a second console adopting the state agrees with the
      first about what pressing play meant. -------------------------------- */

export const startRun = (state: TimerState, now = Date.now()): TimerState =>
  state.running ? state : { ...state, running: true, startedAt: now };

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
export const seekRun = (state: TimerState, elapsed: number, now = Date.now()): TimerState => ({
  ...state,
  elapsedBefore: Math.max(0, elapsed),
  startedAt: state.running ? now : null,
});

/** How long the armed timer runs for, this time round, with ± applied. */
export const totalOf = (state: TimerState): number => {
  const timer = activeTimer(state);

  return !timer || timer.kind === 'clock' ? 0 : Math.max(0, timer.duration + state.adjustMs);
};

/** ±1m. A countdown gains time; a count-up moves its target. */
export const adjustRun = (state: TimerState, deltaMs: number): TimerState => ({
  ...state,
  adjustMs: state.adjustMs + deltaMs,
});

/**
 * Arm a timer. Switching starts it from the top — resuming into a different
 * duration half-elapsed is never what anyone means — while arming the one
 * already live leaves its run alone.
 */
export const armTimer = (state: TimerState, id: string): TimerState =>
  state.activeId === id ? state : { ...resetRun(state), activeId: id };

/** Next or previous in the running order, stopping at the ends. */
export const stepTimer = (state: TimerState, direction: number): TimerState => {
  const index = state.timers.findIndex(timer => timer.id === state.activeId);
  const next = state.timers[Math.max(0, Math.min(state.timers.length - 1, index + direction))];

  return next ? armTimer(state, next.id) : state;
};

const pad = (value: number) => String(value).padStart(2, '0');

/** `M:SS` under an hour, `H:MM:SS` over it — the way a stage clock is read. */
export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

export const formatClock = (now = Date.now()): string => {
  const date = new Date(now);

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** Parse `10`, `10:00` or `1:02:30` into milliseconds; `null` if it is none of them. */
export const parseDuration = (input: string): number | null => {
  const text = input.trim();

  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(text)) return null;

  const parts = text.split(':').map(Number);

  // A bare number is minutes: typing "10" for ten minutes is the common case.
  const [hours, minutes, seconds] =
    parts.length === 1 ? [0, parts[0], 0] : parts.length === 2 ? [0, parts[0], parts[1]] : parts;

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export type Phase = 'normal' | 'warn' | 'over';

export interface TimerReading {
  name: string;
  kind: TimerKind;
  text: string;
  /** How much of the run is left, 0–1; `null` when the timer is a wall clock. */
  progress: number | null;
  phase: Phase;
  overtime: boolean;
}

/** Everything an output needs to draw one frame. */
export const timerReading = (state: TimerState, now = Date.now()): TimerReading | null => {
  const timer = activeTimer(state);

  if (!timer) return null;

  const base = { name: timer.name, kind: timer.kind };

  if (timer.kind === 'clock') {
    return {
      ...base,
      text: formatClock(now),
      progress: null,
      phase: 'normal',
      overtime: false,
    };
  }

  const elapsed = elapsedOf(state, now);
  const total = Math.max(0, timer.duration + state.adjustMs);

  if (timer.kind === 'countup') {
    const overtime = total > 0 && elapsed > total;

    return {
      ...base,
      text: formatDuration(elapsed),
      progress: total ? clamp01(elapsed / total) : null,
      phase: overtime ? 'over' : total && total - elapsed <= timer.wrapUp ? 'warn' : 'normal',
      overtime,
    };
  }

  const remaining = total - elapsed;
  const overtime = remaining < 0;

  return {
    ...base,
    text: `${overtime ? '-' : ''}${formatDuration(Math.abs(remaining))}`,
    progress: total ? clamp01(remaining / total) : 0,
    phase: overtime ? 'over' : remaining <= timer.wrapUp ? 'warn' : 'normal',
    overtime,
  };
};

/** When this run reaches zero, projected forward from wherever it is now. */
export const finishesAt = (state: TimerState, now = Date.now()): number | null => {
  const timer = activeTimer(state);

  if (!timer || timer.kind === 'clock') return null;

  const total = Math.max(0, timer.duration + state.adjustMs);

  return total ? now + (total - elapsedOf(state, now)) : null;
};

/** The ink a phase is drawn in, on an output and in the console preview. */
export const PHASE_COLOR: Record<Phase, string> = {
  normal: '#ffffff',
  warn: '#fbbf24',
  over: '#f87171',
};

export const PHASE_BAR: Record<Phase, string> = {
  normal: '#22c55e',
  warn: '#fbbf24',
  over: '#ef4444',
};

export const visibleMessages = (state: TimerState): TimerMessage[] =>
  state.messages.filter(message => message.visible && message.text.trim());
