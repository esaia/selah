
export const MINUTE = 60_000;

export const FLASH_MS = 1600;

export const FINAL_MS = 10_000;

export type TimerKind = "countdown" | "countup" | "clock";

export const TIMER_KINDS: { value: TimerKind; label: string }[] = [
  { value: "countdown", label: "Count down" },
  { value: "countup", label: "Count up" },
  { value: "clock", label: "Time of day" },
];

export type MessageColor = "white" | "green" | "red";

export const MESSAGE_COLORS: Record<MessageColor, string> = {
  white: "#ffffff",
  green: "#4ade80",
  red: "#f87171",
};

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
  speaker: string;
  notes: string;
  labels: TimerLabel[];
  linked: boolean;
  kind: TimerKind;
  duration: number;
  autoClear: boolean;
  wrapUp: number;
  finalAt: number;
}

export interface TimerMessage {
  id: string;
  text: string;
  color: MessageColor;
  bold: boolean;
  caps: boolean;
  visible: boolean;
  fullScreen: boolean;
  flashAt: number;
}

export interface TimerState {
  timers: StageTimer[];
  activeId: string;
  playedId: string;
  running: boolean;
  startedAt: number | null;
  elapsedBefore: number;
  adjustMs: number;
  messages: TimerMessage[];
  flashAt: number;
  onProjector: boolean;
  onStream: boolean;
  onStage: boolean;
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
  linked: false,
  kind: "countdown",
  duration: 10 * MINUTE,
  autoClear: false,
  wrapUp: MINUTE,
  finalAt: FINAL_MS,
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
    messages: [newMessage()],
    flashAt: 0,
    onProjector: false,
    onStream: false,
    onStage: false,
    sentAt: 0,
  };
};

const num = (value: unknown, fallback: number): number =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const isKind = (value: unknown): value is TimerKind =>
  TIMER_KINDS.some((kind) => kind.value === value);

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
      linked: Boolean(timer.linked),
      kind: isKind(timer.kind) ? timer.kind : "countdown",
      duration: Math.max(0, num(timer.duration, 10 * MINUTE)),
      autoClear: Boolean(timer.autoClear),
      wrapUp: Math.max(0, num(timer.wrapUp, MINUTE)),
      finalAt: Math.max(0, num(timer.finalAt, FINAL_MS)),
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
    messages: messages.length ? messages : [newMessage()],
    flashAt: Math.max(0, num(input.flashAt, 0)),
    onProjector: Boolean(input.onProjector),
    onStream: Boolean(input.onStream),
    onStage: input.onStage === undefined ? Boolean(input.running) : Boolean(input.onStage),
    sentAt: Math.max(0, num(input.sentAt, 0)),
  };
};

export const withSkew = (
  state: TimerState,
  receivedAt = Date.now(),
): TimerState => {
  if (!state.sentAt || state.startedAt === null) return state;

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

export const startRun = (state: TimerState, now = Date.now()): TimerState =>
  state.running
    ? state
    : {
        ...state,
        running: true,
        startedAt: now,
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

export const resetRun = (state: TimerState): TimerState => ({
  ...state,
  running: false,
  startedAt: null,
  elapsedBefore: 0,
  adjustMs: 0,
});

export const seekRun = (
  state: TimerState,
  elapsed: number,
  now = Date.now(),
): TimerState => ({
  ...state,
  elapsedBefore: Math.max(0, elapsed),
  startedAt: state.running ? now : null,
});

export const totalOf = (state: TimerState): number => {
  const timer = activeTimer(state);

  return !timer || timer.kind === "clock"
    ? 0
    : Math.max(0, timer.duration + state.adjustMs);
};

export const adjustRun = (
  state: TimerState,
  deltaMs: number,
  now = Date.now(),
): TimerState => {
  if (activeTimer(state)?.kind === "countup")
    return { ...state, adjustMs: state.adjustMs + deltaMs };

  return seekRun(state, Math.max(0, elapsedOf(state, now) - deltaMs), now);
};

export const armTimer = (state: TimerState, id: string): TimerState =>
  state.activeId === id ? state : { ...resetRun(state), activeId: id };

const settleJoins = (
  before: StageTimer[],
  after: StageTimer[],
): StageTimer[] => {
  const followed = new Map(
    before.map((timer, at) => [timer.id, before[at - 1]?.id ?? null]),
  );

  return after.map((timer, at) => {
    const above = after[at - 1]?.id ?? null;
    const kept = followed.has(timer.id) && followed.get(timer.id) === above;

    return !timer.linked || kept ? timer : { ...timer, linked: false };
  });
};

export const reorderTimers = (
  timers: StageTimer[],
  ids: string[],
): StageTimer[] => {
  const known = new Set(ids);

  return settleJoins(timers, [
    ...ids
      .map((id) => timers.find((timer) => timer.id === id))
      .filter((timer): timer is StageTimer => Boolean(timer)),
    ...timers.filter((timer) => !known.has(timer.id)),
  ]);
};

export type Beside = "above" | "below";

export const insertTimer = (
  timers: StageTimer[],
  id: string,
  side: Beside,
  made: StageTimer = newTimer({ name: `Timer ${timers.length + 1}` }),
): StageTimer[] => {
  const at = timers.findIndex((timer) => timer.id === id);
  const next = [...timers];

  next.splice(at === -1 ? timers.length : at + (side === "below" ? 1 : 0), 0, made);

  return settleJoins(timers, next);
};

export const cloneTimer = (
  timers: StageTimer[],
  id: string,
): StageTimer[] => {
  const original = timers.find((timer) => timer.id === id);

  if (!original) return timers;

  return insertTimer(
    timers,
    id,
    "below",
    newTimer({
      ...original,
      id: undefined,
      name: `${original.name} copy`,
      labels: original.labels.map((label) => newLabel({ ...label, id: undefined })),
    }),
  );
};

export const removeTimer = (
  timers: StageTimer[],
  id: string,
): StageTimer[] =>
  settleJoins(
    timers,
    timers.filter((timer) => timer.id !== id),
  );

export const stepTimer = (state: TimerState, direction: number): TimerState => {
  const index = state.timers.findIndex((timer) => timer.id === state.activeId);
  const next =
    state.timers[
      Math.max(0, Math.min(state.timers.length - 1, index + direction))
    ];

  return next ? armTimer(state, next.id) : state;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return hours
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};

export const formatClock = (now = Date.now(), withSeconds = true): string => {
  const date = new Date(now);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return withSeconds ? `${time}:${pad(date.getSeconds())}` : time;
};

export const HOUR = 60 * MINUTE;

export const intoHour = (at: number): number => {
  const date = new Date(at);

  return (
    date.getMinutes() * MINUTE +
    date.getSeconds() * 1_000 +
    date.getMilliseconds()
  );
};

export const parseDuration = (input: string): number | null => {
  const text = input.trim();

  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(text)) return null;

  const parts = text.split(":").map(Number);

  const [hours, minutes, seconds] =
    parts.length === 1
      ? [0, parts[0], 0]
      : parts.length === 2
        ? [0, parts[0], parts[1]]
        : parts;

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export type Phase = "normal" | "warn" | "final" | "over";

export interface TimerReading {
  name: string;
  speaker: string;
  kind: TimerKind;
  text: string;
  progress: number | null;
  phase: Phase;
  overtime: boolean;
  finalAt: number;
}

const phaseOf = (
  remaining: number | null,
  wrapUp: number,
  finalAt: number,
): Phase =>
  remaining === null
    ? "normal"
    : remaining <= finalAt
      ? "final"
      : remaining <= wrapUp
        ? "warn"
        : "normal";

export const timerReading = (
  state: TimerState,
  now = Date.now(),
): TimerReading | null => {
  const timer = activeTimer(state);

  if (!timer) return null;

  const base = {
    name: timer.name,
    speaker: timer.speaker,
    kind: timer.kind,
    finalAt: timer.finalAt,
  };

  if (timer.kind === "clock") {
    return {
      ...base,
      text: formatClock(now, false),
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
        : phaseOf(total ? total - elapsed : null, timer.wrapUp, timer.finalAt),
      overtime,
    };
  }

  const remaining = total - elapsed;
  const overtime = remaining < 0;

  return {
    ...base,
    text: `${overtime ? "-" : ""}${formatDuration(Math.abs(remaining))}`,
    progress: total ? clamp01(elapsed / total) : 0,
    phase: overtime ? "over" : phaseOf(remaining, timer.wrapUp, timer.finalAt),
    overtime,
  };
};

export const finishesAt = (
  state: TimerState,
  now = Date.now(),
): number | null => {
  const timer = activeTimer(state);

  if (!timer || timer.kind === "clock") return null;

  const total = Math.max(0, timer.duration + state.adjustMs);

  return total ? now + (total - elapsedOf(state, now)) : null;
};

export const linkedNext = (state: TimerState): StageTimer | null => {
  const at = state.timers.findIndex((timer) => timer.id === state.activeId);
  const next = at === -1 ? null : (state.timers[at + 1] ?? null);

  return next?.linked ? next : null;
};

export type FinishAction =
  | { kind: "start"; timer: StageTimer }
  | { kind: "clear" }
  | null;

export const finishAction = (state: TimerState): FinishAction => {
  const next = linkedNext(state);

  if (next) return { kind: "start", timer: next };

  return activeTimer(state)?.autoClear ? { kind: "clear" } : null;
};

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

export const onOutputs = (state: TimerState): boolean =>
  state.onProjector ||
  state.onStream ||
  state.onStage ||
  visibleMessages(state).length > 0;

export const timerIsLive = (state: TimerState): boolean => state.onStage;

export const runUnderWay = (state: TimerState): boolean =>
  state.running || state.elapsedBefore > 0;

export const clearOutputs = (state: TimerState): TimerState =>
  onOutputs(state) || runUnderWay(state)
    ? {
        ...resetRun(state),
        onProjector: false,
        onStream: false,
        onStage: false,
        messages: state.messages.map((message) =>
          message.visible ? { ...message, visible: false } : message,
        ),
      }
    : state;
