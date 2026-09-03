import { defaultVersionOf, isLang, MAX_LANGS, REQUIRED_LANG, type Lang } from '@/lib/bible/languages';
import {
  asScaleMode,
  clampTextSize,
  DEFAULT_LYRIC_LOOK,
  DEFAULT_TEXT_SIZE,
  DEFAULT_VERSE_LOOK,
  type ScaleMode,
} from '@/lib/projector/looks';
import { clampTransition, DEFAULT_TRANSITION_MS } from '@/lib/projector/transition';
import type { Database } from '@/lib/supabase/types';
import type { Align, LocalFileMeta, ProjectorStyle, StreamStyle } from '@/lib/types';

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
  enabled: Partial<Record<Lang, boolean>>;
  versions: Partial<Record<Lang, string>>;
  theme: string;
  dynamicImage: string;
  localImage: LocalFileMeta | null;
  font: string;
  align: Align;
  lyricsFont: string;
  lyricsAlign: Align;
  projectorLook: string;
  projectorLyricsLook: string;
  lyricsScale: ScaleMode;
  lyricsSize: number;
  transitionMs: number;
  langOrder: Lang[];
  lowerThirdPosition: 'top' | 'bottom';
  lowerThirdVariant: string;
  lyricsVariant: string;
  obsHidden: boolean;
  streamLang: Lang;
  stageLang: Lang;
}

/**
 * The languages the operator has chosen, cleaned up.
 *
 * English is always in and always first if it had fallen out, because it is
 * what every output falls back to and the one row that cannot be removed.
 * Three is the ceiling: a fourth language on a slide is a fourth block of text
 * on a projector nobody at the back can read.
 */
export const asOrder = (value: unknown): Lang[] => {
  const listed: Lang[] = Array.isArray(value) ? value.filter(isLang) : [];
  const chosen = listed.filter((lang, index, all) => all.indexOf(lang) === index);
  const order = chosen.includes(REQUIRED_LANG) ? chosen : [REQUIRED_LANG, ...chosen];

  return order.slice(0, MAX_LANGS);
};

const asAlign = (value: unknown): Align =>
  value === 'center' || value === 'right' ? value : 'left';

/** Armed flags for the chosen languages, and nothing for the rest. */
const asFlags = (value: unknown, order: Lang[]): Partial<Record<Lang, boolean>> => {
  const flags = (value ?? {}) as Partial<Record<Lang, unknown>>;

  return Object.fromEntries(
    order.map(lang => [lang, typeof flags[lang] === 'boolean' ? flags[lang] : true]),
  );
};

export const fromRow = (row: SettingsRow): Settings => {
  const versions = (row.versions ?? {}) as Partial<Record<Lang, string>>;
  const langOrder = asOrder(row.lang_order);
  const adminLang = isLang(row.admin_lang) && langOrder.includes(row.admin_lang) ? row.admin_lang : langOrder[0];

  return {
    adminLang,
    adminVersion: row.admin_version || defaultVersionOf(adminLang),
    enabled: asFlags(row.enabled, langOrder),
    versions: Object.fromEntries(langOrder.map(lang => [lang, versions[lang] || defaultVersionOf(lang)])),
    theme: row.theme || '1',
    dynamicImage: row.dynamic_image || '',
    localImage: (row.local_image as LocalFileMeta | null) ?? null,
    font: row.font || 'font-banner',
    align: asAlign(row.align),
    lyricsFont: row.lyrics_font || row.font || 'font-banner',
    lyricsAlign: asAlign(row.lyrics_align ?? row.align),
    projectorLook: row.projector_look || DEFAULT_VERSE_LOOK,
    // 'steady' was a layout before song text got its own scaling control; it
    // said "hold the size still", which is now a mode rather than a look.
    projectorLyricsLook:
      !row.projector_lyrics_look || row.projector_lyrics_look === 'steady'
        ? DEFAULT_LYRIC_LOOK
        : row.projector_lyrics_look,
    lyricsScale: row.projector_lyrics_look === 'steady' ? 'none' : asScaleMode(row.lyrics_scale),
    lyricsSize: clampTextSize(row.lyrics_size ?? DEFAULT_TEXT_SIZE),
    transitionMs: clampTransition(row.transition_ms ?? DEFAULT_TRANSITION_MS),
    langOrder,
    lowerThirdPosition: row.lower_third_position === 'top' ? 'top' : 'bottom',
    lowerThirdVariant: row.lower_third_variant || 'scrim',
    lyricsVariant: row.lyrics_variant || 'scrim',
    obsHidden: Boolean(row.obs_hidden),
    streamLang: isLang(row.stream_lang) ? row.stream_lang : REQUIRED_LANG,
    stageLang: isLang(row.stage_lang) ? row.stage_lang : REQUIRED_LANG,
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
  projector_look: settings.projectorLook,
  projector_lyrics_look: settings.projectorLyricsLook,
  lyrics_scale: settings.lyricsScale,
  lyrics_size: settings.lyricsSize,
  transition_ms: settings.transitionMs,
  lang_order: settings.langOrder,
  lower_third_position: settings.lowerThirdPosition,
  lower_third_variant: settings.lowerThirdVariant,
  lyrics_variant: settings.lyricsVariant,
  obs_hidden: settings.obsHidden,
  stream_lang: settings.streamLang,
  stage_lang: settings.stageLang,
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
  look: settings.projectorLook,
  lyricsLook: settings.projectorLyricsLook,
  lyricsScale: settings.lyricsScale,
  lyricsSize: settings.lyricsSize,
  order: settings.langOrder,
  enabled: settings.enabled,
  transitionMs: settings.transitionMs,
});

/** The armed languages, in the order the operator has them. */
const armedLangs = (settings: Settings): Lang[] =>
  settings.langOrder.filter(lang => settings.enabled[lang]);

/** The language the stream shows: the operator's pick, if it is still armed. */
export const streamLangOf = (settings: Settings): Lang => {
  const armed = armedLangs(settings);

  return armed.includes(settings.streamLang) ? settings.streamLang : (armed[0] ?? REQUIRED_LANG);
};

/**
 * The language the stage display reads. One only — the person standing up is
 * reading it, not glancing at it — and disarming a language falls back to the
 * first still armed rather than emptying the panels, exactly as the stream
 * does. The pick is kept either way, so re-arming restores it.
 */
export const stageLangOf = (settings: Settings): Lang => {
  const armed = armedLangs(settings);

  return armed.includes(settings.stageLang) ? settings.stageLang : (armed[0] ?? REQUIRED_LANG);
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
    enabled: Object.fromEntries(settings.langOrder.map(lang => [lang, lang === chosen])),
    transitionMs: settings.transitionMs,
    position: settings.lowerThirdPosition,
    variant: settings.lowerThirdVariant,
    lyricsVariant: settings.lyricsVariant,
    hidden: settings.obsHidden,
  };
};
