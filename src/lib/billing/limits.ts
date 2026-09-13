import free from './limits.json';

import type { PlanId } from './plans';

export const LIMIT_KEYS = [
  'sessions',
  'passages',
  'songs',
  'playlists',
  'songs_per_playlist',
  'audio_tracks',
  'audio_categories',
  'name_cards',
  'languages',
  'custom_fonts',
  'custom_templates',
  'translations',
] as const;

export type LimitKey = (typeof LIMIT_KEYS)[number];

export const FREE_LIMITS: Record<LimitKey, number> = free;

export const limitOf = (plan: PlanId, key: LimitKey): number | null =>
  plan === 'pro' ? null : FREE_LIMITS[key];

export const roomFor = (plan: PlanId, key: LimitKey, current: number, adding = 1): boolean => {
  const limit = limitOf(plan, key);

  return limit === null || current + adding <= limit;
};

export const roomForList = (plan: PlanId, key: LimitKey, wants: number, had: number): boolean => {
  const limit = limitOf(plan, key);

  return limit === null || wants <= limit || wants <= had;
};

export const remaining = (plan: PlanId, key: LimitKey, current: number): number | null => {
  const limit = limitOf(plan, key);

  return limit === null ? null : Math.max(0, limit - current);
};

export const LIMIT_LABELS: Record<LimitKey, { one: string; many: string }> = {
  sessions: { one: 'session', many: 'sessions' },
  passages: { one: 'passage at a time', many: 'passages at a time' },
  songs: { one: 'song', many: 'songs' },
  playlists: { one: 'playlist', many: 'playlists' },
  songs_per_playlist: { one: 'song in a playlist', many: 'songs in a playlist' },
  audio_tracks: { one: 'track', many: 'tracks' },
  audio_categories: { one: 'music library', many: 'music libraries' },
  name_cards: { one: 'name card', many: 'name cards' },
  languages: { one: 'language on a slide', many: 'languages on a slide' },
  custom_fonts: { one: 'custom font', many: 'custom fonts' },
  custom_templates: { one: 'custom look', many: 'custom looks' },
  translations: { one: 'uploaded translation', many: 'uploaded translations' },
};

export const limitMessage = (key: LimitKey): string => {
  const limit = FREE_LIMITS[key];
  const label = LIMIT_LABELS[key];

  if (limit === 0) return `Pro adds ${label.many}. Free has none.`;

  return `Free covers ${limit} ${limit === 1 ? label.one : label.many}. Pro makes it unlimited.`;
};

export const planErrorMessage = (message: string): string | null => {
  const key = /plan_limit:(\w+)/.exec(message)?.[1];

  return key && (LIMIT_KEYS as readonly string[]).includes(key) ? limitMessage(key as LimitKey) : null;
};

export class PlanLimitError extends Error {
  readonly key: LimitKey;

  constructor(key: LimitKey) {
    super(limitMessage(key));

    this.name = 'PlanLimitError';
    this.key = key;
  }
}

export const isPlanLimit = (error: unknown): error is PlanLimitError => error instanceof PlanLimitError;

export const planLimitKey = (message: string): LimitKey | null => {
  const key = /plan_limit:(\w+)/.exec(message)?.[1];

  return key && (LIMIT_KEYS as readonly string[]).includes(key) ? (key as LimitKey) : null;
};
