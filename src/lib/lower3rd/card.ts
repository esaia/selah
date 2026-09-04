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

/**
 * The five finished designs. Each is a CSS class in globals.css.
 *
 * The value is what a saved person and a live run carry, so it stays put even
 * when a design is redrawn: renaming one here would quietly move everybody
 * who had chosen it onto the default. The label is what the operator reads,
 * and follows the drawing.
 */
export const TEMPLATES = [
  { value: 'band', label: 'Slab' },
  { value: 'gradient', label: 'Duotone' },
  { value: 'plate', label: 'Marquee' },
  { value: 'bracket', label: 'Offset' },
  { value: 'rule', label: 'Edge' },
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
  /**
   * Which design draws it.
   *
   * It is set from the console's picker at the moment of firing, not kept per
   * person: an operator picks the look their stream has this season and every
   * strap is that look. What is stored against a person is their name.
   */
  template: Template;
  /** Where it sits in the operator's list. */
  position: number;
}

/**
 * The form the console is filled in with, and with it the look everybody gets.
 *
 * It is a card plus the hold, because the hold is a console setting rather
 * than a person's: the design tile and the slider decide what any name in the
 * list looks like when it goes up.
 */
export interface CardDraft extends NameCard {
  holdMs: number;
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

/**
 * A hold read back from anywhere, pinned to the range the slider offers.
 *
 * Zero is not "too short" — it is "stay until I take you down" — so it comes
 * through untouched. Anything that is not a number at all is a row written
 * before holds travelled with a person, and takes the default.
 */
export const asHoldMs = (value: unknown, fallback = DEFAULT_HOLD_MS): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  if (value === PINNED) return PINNED;

  return Math.min(Math.max(value, MIN_HOLD_MS), MAX_HOLD_MS);
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

/**
 * A row out of `name_cards`, in the shape the console holds people in.
 *
 * The template comes back with the row and is then overwritten by whatever the
 * console's picker is set to — a saved person is a name and a role, and the
 * look is the operator's, chosen once for the whole stream.
 */
export const cardFromRow = (row: {
  id: string;
  title: string;
  subtitle: string | null;
  template: string;
  position: number | null;
}): NameCard => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle ?? '',
  template: isTemplate(row.template) ? row.template : DEFAULT_TEMPLATE,
  position: row.position ?? 0,
});

/**
 * The half-filled form, read back off the workspace row.
 *
 * Unlike `asCard` an empty name is allowed: that is a form nobody has typed in
 * yet, which is exactly what a console reopened on a Saturday night holds. It
 * is what makes a chosen design and a chosen hold survive a reload — and since
 * both apply to everybody on the list, one reload used to undo the whole
 * afternoon's setting up.
 */
export const asDraft = (raw: unknown): CardDraft => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof CardDraft, unknown>>;

  return {
    ...newCard({
      ...(typeof value.id === 'string' && value.id ? { id: value.id } : {}),
      title: typeof value.title === 'string' ? value.title : '',
      subtitle: typeof value.subtitle === 'string' ? value.subtitle : '',
      template: isTemplate(value.template) ? value.template : DEFAULT_TEMPLATE,
    }),
    holdMs: asHoldMs(value.holdMs),
  };
};

/** A run read back off the wire or out of the session row. */
export const asCardRun = (raw: unknown): CardRun | null => {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Partial<Record<keyof CardRun, unknown>>;
  const card = asCard(value.card);

  if (!card) return null;

  return {
    card,
    firedAt: typeof value.firedAt === 'number' ? value.firedAt : Date.now(),
    holdMs: asHoldMs(value.holdMs),
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

/**
 * How much of the hold is left as a fraction, for a bar that drains.
 *
 * A pinned card is always full: nothing is running out, so a bar that emptied
 * would be lying about a strap that is going to stay up.
 */
export const progressOf = (run: CardRun | null, now = Date.now()): number => {
  if (!run) return 0;
  if (run.holdMs === PINNED) return 1;

  return Math.min(1, Math.max(0, remainingOf(run, now) / run.holdMs));
};

/** The run to publish when the operator fires a card. */
export const fireCard = (card: NameCard, holdMs = DEFAULT_HOLD_MS, now = Date.now()): CardRun => ({
  card,
  firedAt: now,
  holdMs,
});

/** Is this the card that is currently up? */
export const isLiveCard = (run: CardRun | null, card: NameCard, now = Date.now()): boolean =>
  isShowing(run, now) && run?.card.id === card.id;
