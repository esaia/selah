import { versionsByLang } from '@/lib/bible/catalog';
import { clampTransition, DEFAULT_TRANSITION_MS } from '@/lib/projector/transition';
import type { Database } from '@/lib/supabase/types';
import { LANGS, type Align, type Lang, type LocalFileMeta, type ProjectorStyle, type StreamStyle } from '@/lib/types';

export type SettingsRow = Database['public']['Tables']['settings']['Row'];

/**
 * The operator's whole look, held as one object in the console and one row in
 * the database. In the old app each field was its own localStorage key, read
 * with a plain getItem in three places; keeping them together is what lets the
 * outputs be handed a complete style with the slide.
 */
export interface Settings {
  adminLang: Lang;
  adminVersion: string;
  enabled: Record<Lang, boolean>;
  versions: Record<Lang, string>;
  theme: string;
  dynamicImage: string;
  localImage: LocalFileMeta | null;
  font: string;
  align: Align;
  lyricsFont: string;
  lyricsAlign: Align;
  transitionMs: number;
  langOrder: Lang[];
  lowerThirdPosition: 'top' | 'bottom';
  lowerThirdVariant: string;
  lyricsVariant: string;
  obsHidden: boolean;
  streamLang: Lang;
}

/** The translation each language opens on. English defaults to the KJV. */
export const defaultVersions: Record<Lang, string> = {
  geo: versionsByLang.geo[0].value,
  eng: versionsByLang.eng[2].value,
  rus: versionsByLang.rus[0].value,
};

const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

const asOrder = (value: unknown): Lang[] => {
  const order = Array.isArray(value) ? value.filter(isLang) : [];

  return order.length === LANGS.length && LANGS.every(lang => order.includes(lang))
    ? order
    : ['eng', 'geo', 'rus'];
};

const asAlign = (value: unknown): Align =>
  value === 'center' || value === 'right' ? value : 'left';

const asFlags = (value: unknown, fallback: Record<Lang, boolean>): Record<Lang, boolean> => {
  const flags = (value ?? {}) as Partial<Record<Lang, unknown>>;

  return Object.fromEntries(
    LANGS.map(lang => [lang, typeof flags[lang] === 'boolean' ? flags[lang] : fallback[lang]]),
  ) as Record<Lang, boolean>;
};

export const fromRow = (row: SettingsRow): Settings => {
  const versions = (row.versions ?? {}) as Partial<Record<Lang, string>>;

  return {
    adminLang: isLang(row.admin_lang) ? row.admin_lang : 'geo',
    adminVersion: row.admin_version || defaultVersions.geo,
    enabled: asFlags(row.enabled, { geo: true, eng: false, rus: false }),
    versions: Object.fromEntries(
      LANGS.map(lang => [lang, versions[lang] || defaultVersions[lang]]),
    ) as Record<Lang, string>,
    theme: row.theme || '1',
    dynamicImage: row.dynamic_image || '',
    localImage: (row.local_image as LocalFileMeta | null) ?? null,
    font: row.font || 'font-banner',
    align: asAlign(row.align),
    lyricsFont: row.lyrics_font || row.font || 'font-banner',
    lyricsAlign: asAlign(row.lyrics_align ?? row.align),
    transitionMs: clampTransition(row.transition_ms ?? DEFAULT_TRANSITION_MS),
    langOrder: asOrder(row.lang_order),
    lowerThirdPosition: row.lower_third_position === 'top' ? 'top' : 'bottom',
    lowerThirdVariant: row.lower_third_variant || 'scrim',
    lyricsVariant: row.lyrics_variant || 'scrim',
    obsHidden: Boolean(row.obs_hidden),
    streamLang: isLang(row.stream_lang) ? row.stream_lang : 'geo',
  };
};

export const toRow = (settings: Settings) => ({
  admin_lang: settings.adminLang,
  admin_version: settings.adminVersion,
  enabled: settings.enabled,
  versions: settings.versions,
  theme: settings.theme,
  dynamic_image: settings.dynamicImage,
  local_image: settings.localImage,
  font: settings.font,
  align: settings.align,
  lyrics_font: settings.lyricsFont,
  lyrics_align: settings.lyricsAlign,
  transition_ms: settings.transitionMs,
  lang_order: settings.langOrder,
  lower_third_position: settings.lowerThirdPosition,
  lower_third_variant: settings.lowerThirdVariant,
  lyrics_variant: settings.lyricsVariant,
  obs_hidden: settings.obsHidden,
  stream_lang: settings.streamLang,
});

/** Everything /show needs to draw a slide. */
export const projectorStyle = (settings: Settings): ProjectorStyle => ({
  theme: settings.theme,
  dynamicImage: settings.dynamicImage,
  localImage: settings.localImage,
  font: settings.font,
  align: settings.align,
  lyricsFont: settings.lyricsFont,
  lyricsAlign: settings.lyricsAlign,
  order: settings.langOrder,
  enabled: settings.enabled,
  transitionMs: settings.transitionMs,
});

/** The language the stream shows: the operator's pick, if it is still armed. */
export const streamLangOf = (settings: Settings): Lang => {
  const armed = LANGS.filter(lang => settings.enabled[lang]);

  return armed.includes(settings.streamLang) ? settings.streamLang : (armed[0] ?? 'geo');
};

/**
 * Everything /lower3rd needs. The stream carries one language, so `enabled`
 * here is reduced to exactly one true — a language the operator disarms falls
 * back to the first armed one rather than blanking the overlay, and the stored
 * preference is kept so re-arming restores it.
 */
export const streamStyle = (settings: Settings): StreamStyle => {
  const chosen = streamLangOf(settings);

  return {
    font: settings.font,
    align: settings.align,
    lyricsFont: settings.lyricsFont,
    lyricsAlign: settings.lyricsAlign,
    order: settings.langOrder,
    enabled: Object.fromEntries(LANGS.map(lang => [lang, lang === chosen])) as Record<Lang, boolean>,
    transitionMs: settings.transitionMs,
    position: settings.lowerThirdPosition,
    variant: settings.lowerThirdVariant,
    lyricsVariant: settings.lyricsVariant,
    hidden: settings.obsHidden,
  };
};
