/**
 * Name cards: who is speaking, strapped across the bottom of the stream.
 *
 * The one graphic a church broadcast uses constantly and Selah could not draw —
 * a speaker's name and role, up for a few seconds as they come to the front.
 *
 * A card belongs to the stream alone. It is not a slide: it goes up while a
 * verse stays live underneath and comes away without disturbing it, which is
 * why it rides beside `showData` in the payload rather than inside it. The
 * projector and the stage never see one.
 *
 * Like the stage timer, **nothing here counts down over the wire**. What
 * travels is the shape of the run — when it fired and how long it holds — and
 * every reader works out the rest from its own clock. So an overlay that joins
 * halfway through a card shows the remainder rather than starting it again,
 * and a console that closed cannot leave one up forever.
 */

/** The five finished designs. Each is a CSS class in globals.css. */
export const TEMPLATES = [
  { value: 'band', label: 'Colour band' },
  { value: 'gradient', label: 'Gradient bar' },
  { value: 'plate', label: 'Plate' },
  { value: 'bracket', label: 'Brackets' },
  { value: 'rule', label: 'Rule' },
] as const;

export type Template = (typeof TEMPLATES)[number]['value'];

export const DEFAULT_TEMPLATE: Template = 'band';

export const templateLabel = (value: string) =>
  TEMPLATES.find(template => template.value === value)?.label ?? value;

const isTemplate = (value: unknown): value is Template =>
  TEMPLATES.some(template => template.value === value);

/** How long a card holds by default. Long enough to read a name twice. */
export const DEFAULT_HOLD_MS = 8000;

/** The range the operator can choose from, and the step between. */
export const MIN_HOLD_MS = 3000;
export const MAX_HOLD_MS = 30_000;
export const HOLD_STEP_MS = 1000;

/** A hold of zero pins a card open until it is taken down by hand. */
export const PINNED = 0;

export interface NameCard {
  id: string;
  /** The name, and the only field that has to be filled in. */
  title: string;
  /** The role beneath it. Often empty — a guest musician has no title. */
  subtitle: string;
  template: Template;
  /** Where it sits in the operator's list. */
  position: number;
}

/**
 * A card on the stream right now, or null when nothing is up.
 *
 * `firedAt` is stamped by the console at the moment of firing and corrected
 * for clock skew by readers only — the same rule, and for the same reason, as
 * the timer's `startedAt`.
 */
export interface CardRun {
  card: NameCard;
  firedAt: number;
  holdMs: number;
  /** Stamped on the way out, so a reader can measure the clock difference. */
  sentAt?: number;
}

let counter = 0;

/** A card the console has made but the database has not seen. */
export const newCard = (overrides: Partial<NameCard> = {}): NameCard => {
  counter += 1;

  return {
    // Not a uuid: `saveCard` uses the shape of this id to tell a card Postgres
    // has never seen from one it has, exactly as `saveSong` does.
    id: `new-${Date.now()}-${counter}`,
    title: '',
    subtitle: '',
    template: DEFAULT_TEMPLATE,
    position: 0,
    ...overrides,
  };
};

/** Is this id one Postgres minted, or one the console made up? */
export const isSaved = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/**
 * A card read back from the database or off the wire.
 *
 * Everything is checked rather than trusted: these rows outlive the code that
 * wrote them, and a template renamed in a later version must fall back to a
 * design that exists rather than render as an unstyled block of text on a
 * livestream.
 */
export const asCard = (raw: unknown): NameCard | null => {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Partial<Record<keyof NameCard, unknown>>;
  const title = typeof value.title === 'string' ? value.title.trim() : '';

  // A card with no name is not a card. Nothing should put an empty strap on a
  // stream, and an empty one is what a half-filled form would produce.
  if (!title) return null;

  return {
    id: typeof value.id === 'string' && value.id ? value.id : newCard().id,
    title,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle.trim() : '',
    template: isTemplate(value.template) ? value.template : DEFAULT_TEMPLATE,
    position: typeof value.position === 'number' ? value.position : 0,
  };
};

/** A run read back off the wire or out of the session row. */
export const asCardRun = (raw: unknown): CardRun | null => {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Partial<Record<keyof CardRun, unknown>>;
  const card = asCard(value.card);

  if (!card) return null;

  const holdMs = typeof value.holdMs === 'number' && value.holdMs >= 0 ? value.holdMs : DEFAULT_HOLD_MS;

  return {
    card,
    firedAt: typeof value.firedAt === 'number' ? value.firedAt : Date.now(),
    holdMs: holdMs === PINNED ? PINNED : Math.min(Math.max(holdMs, MIN_HOLD_MS), MAX_HOLD_MS),
    ...(typeof value.sentAt === 'number' ? { sentAt: value.sentAt } : {}),
  };
};

/**
 * Correct a run's start for the difference between two clocks.
 *
 * Only readers do this, exactly as with the timer: a console that shifted a
 * run on the way in would publish back something slightly different from what
 * it received.
 */
export const withSkew = (run: CardRun | null, receivedAt = Date.now()): CardRun | null => {
  if (!run?.sentAt) return run;

  // A stored row is read long after it was written. That is a stale stamp
  // rather than a skewed clock, and correcting by it would put a card that
  // finished hours ago back on the stream.
  if (Math.abs(receivedAt - run.sentAt) > 30_000) return run;

  return { ...run, firedAt: run.firedAt + (receivedAt - run.sentAt) };
};

/** How much of the hold is left, in ms. `Infinity` for a pinned card. */
export const remainingOf = (run: CardRun | null, now = Date.now()): number => {
  if (!run) return 0;
  if (run.holdMs === PINNED) return Infinity;

  return Math.max(0, run.firedAt + run.holdMs - now);
};

/** Should this run be on screen at all? */
export const isShowing = (run: CardRun | null, now = Date.now()): boolean => remainingOf(run, now) > 0;

/** The run to publish when the operator fires a card. */
export const fireCard = (card: NameCard, holdMs = DEFAULT_HOLD_MS, now = Date.now()): CardRun => ({
  card,
  firedAt: now,
  holdMs,
});

/** Is this the card that is currently up? */
export const isLiveCard = (run: CardRun | null, card: NameCard, now = Date.now()): boolean =>
  isShowing(run, now) && run?.card.id === card.id;
