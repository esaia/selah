
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

export const DEFAULT_HOLD_MS = 8000;

export const MIN_HOLD_MS = 3000;
export const MAX_HOLD_MS = 30_000;
export const HOLD_STEP_MS = 1000;

export const PINNED = 0;

export interface NameCard {
  id: string;
  title: string;
  subtitle: string;
  template: Template;
  position: number;
}

export interface CardDraft extends NameCard {
  holdMs: number;
}

export interface CardRun {
  card: NameCard;
  firedAt: number;
  holdMs: number;
  sentAt?: number;
}

let counter = 0;

export const newCard = (overrides: Partial<NameCard> = {}): NameCard => {
  counter += 1;

  return {
    id: `new-${Date.now()}-${counter}`,
    title: '',
    subtitle: '',
    template: DEFAULT_TEMPLATE,
    position: 0,
    ...overrides,
  };
};

export const asHoldMs = (value: unknown, fallback = DEFAULT_HOLD_MS): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  if (value === PINNED) return PINNED;

  return Math.min(Math.max(value, MIN_HOLD_MS), MAX_HOLD_MS);
};

export const isSaved = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export const asCard = (raw: unknown): NameCard | null => {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Partial<Record<keyof NameCard, unknown>>;
  const title = typeof value.title === 'string' ? value.title.trim() : '';

  if (!title) return null;

  return {
    id: typeof value.id === 'string' && value.id ? value.id : newCard().id,
    title,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle.trim() : '',
    template: isTemplate(value.template) ? value.template : DEFAULT_TEMPLATE,
    position: typeof value.position === 'number' ? value.position : 0,
  };
};

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

export const withSkew = (run: CardRun | null, receivedAt = Date.now()): CardRun | null => {
  if (!run?.sentAt) return run;

  if (Math.abs(receivedAt - run.sentAt) > 30_000) return run;

  return { ...run, firedAt: run.firedAt + (receivedAt - run.sentAt) };
};

export const remainingOf = (run: CardRun | null, now = Date.now()): number => {
  if (!run) return 0;
  if (run.holdMs === PINNED) return Infinity;

  return Math.max(0, run.firedAt + run.holdMs - now);
};

export const isShowing = (run: CardRun | null, now = Date.now()): boolean => remainingOf(run, now) > 0;

export const progressOf = (run: CardRun | null, now = Date.now()): number => {
  if (!run) return 0;
  if (run.holdMs === PINNED) return 1;

  return Math.min(1, Math.max(0, remainingOf(run, now) / run.holdMs));
};

export const fireCard = (card: NameCard, holdMs = DEFAULT_HOLD_MS, now = Date.now()): CardRun => ({
  card,
  firedAt: now,
  holdMs,
});

export const isLiveCard = (run: CardRun | null, card: NameCard, now = Date.now()): boolean =>
  isShowing(run, now) && run?.card.id === card.id;
