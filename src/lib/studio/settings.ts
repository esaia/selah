import { isKnownVersion, langSpecsOf, versionLabel, type CustomTranslation } from '@/lib/bible/custom';
import { defaultVersionOf, isCustomLang, isLang, MAX_LANGS, REQUIRED_LANG, type Lang } from '@/lib/bible/languages';
import { asStreamColors, migrated, type StreamColors } from '@/lib/lower3rd/colors';
import { asCustomFonts, DEFAULT_FONT, fontsUsedBy, type CustomFont } from '@/lib/projector/fonts';
import {
  asScaleMode,
  clampTextSize,
  DEFAULT_TEXT_SIZE,
  DEFAULT_VERSE_TEXT_SIZE,
  isCustomLook,
  lookOf,
  templateIdOf,
  type ScaleMode,
} from '@/lib/projector/looks';
import {
  asTemplate,
  fontsNamedBy,
  startingTemplate,
  TEMPLATE_TARGETS,
  type SlideTemplate,
  type TemplateTarget,
} from '@/lib/projector/template';
import { DEFAULT_THEME } from '@/lib/projector/themes';
import { clampTransition, DEFAULT_TRANSITION_MS } from '@/lib/projector/transition';
import type { Database } from '@/lib/supabase/types';
import type { Align, CustomLangSpec, LocalFileMeta, ProjectorStyle, StreamStyle } from '@/lib/types';

export type SettingsRow = Database['public']['Tables']['settings']['Row'];

export interface CustomTemplate {
  id: string;
  target: TemplateTarget;
  name: string;
  template: SlideTemplate;
}

const asCustomTemplates = (value: unknown): CustomTemplate[] => {
  const rows = Array.isArray(value) ? value : [];

  return rows
    .map(row => (row ?? {}) as Partial<Record<keyof CustomTemplate, unknown>>)
    .filter(row => typeof row.id === 'string' && row.id && TEMPLATE_TARGETS.includes(row.target as TemplateTarget))
    .map(row => {
      const target = row.target as TemplateTarget;

      return {
        id: row.id as string,
        target,
        name: (typeof row.name === 'string' && row.name.trim()) || 'Custom',
        template: asTemplate(row.template, startingTemplate(target)),
      };
    });
};

export const templatesFor = (settings: Settings, target: TemplateTarget): CustomTemplate[] =>
  settings.customTemplates.filter(row => row.target === target);

export const templateOf = (settings: Settings, target: TemplateTarget, look: string): SlideTemplate | null => {
  if (!isCustomLook(look)) return null;

  const kind = templatesFor(settings, target);
  const id = templateIdOf(look);

  return (id ? kind.find(row => row.id === id) : kind[0])?.template ?? null;
};

const STREAM_FALLBACK = 'scrim';

const looksAt = (templates: CustomTemplate[], target: TemplateTarget, look: unknown): boolean => {
  if (typeof look !== 'string' || !isCustomLook(look)) return false;

  const kind = templates.filter(row => row.target === target);
  const id = templateIdOf(look);

  return id ? kind.some(row => row.id === id) : kind.length > 0;
};

export const newTemplateName = (settings: Settings, target: TemplateTarget): string => {
  const taken = new Set(templatesFor(settings, target).map(row => row.name));
  const noun = target === 'stream' || target === 'streamLyrics' ? 'Strap' : 'Layout';

  for (let n = 1; ; n += 1) {
    const name = n === 1 ? noun : `${noun} ${n}`;

    if (!taken.has(name)) return name;
  }
};

const droppedTemplate = (templates: CustomTemplate[], target: TemplateTarget, look: string): boolean =>
  isCustomLook(look) && !looksAt(templates, target, look);

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
  streamFont: string;
  streamAlign: Align;
  streamLyricsFont: string;
  streamLyricsAlign: Align;
  customFonts: CustomFont[];
  projectorLook: string;
  projectorLyricsLook: string;
  customTemplates: CustomTemplate[];
  verseScale: ScaleMode;
  verseSize: number;
  lyricsScale: ScaleMode;
  lyricsSize: number;
  transitionMs: number;
  langOrder: Lang[];
  lowerThirdPosition: 'top' | 'bottom';
  lowerThirdVariant: string;
  lyricsVariant: string;
  streamColors: StreamColors;
  obsHidden: boolean;
  streamLang: Lang;
  stageLang: Lang;
}

export const asOrder = (value: unknown, known: Lang[] = []): Lang[] => {
  const exists = (lang: Lang) => !isCustomLang(lang) || known.includes(lang);
  const listed: Lang[] = Array.isArray(value) ? value.filter(isLang).filter(exists) : [];
  const chosen = listed.filter((lang, index, all) => all.indexOf(lang) === index);
  const order = chosen.includes(REQUIRED_LANG) ? chosen : [REQUIRED_LANG, ...chosen];

  return order.slice(0, MAX_LANGS);
};

const asAlign = (value: unknown): Align =>
  value === 'center' || value === 'right' ? value : 'left';

const asFlags = (value: unknown, order: Lang[]): Partial<Record<Lang, boolean>> => {
  const flags = (value ?? {}) as Partial<Record<Lang, unknown>>;

  return Object.fromEntries(
    order.map(lang => [lang, typeof flags[lang] === 'boolean' ? flags[lang] : true]),
  );
};

const asVersion = (lang: Lang, value: unknown, customs: CustomTranslation[]): string =>
  typeof value === 'string' && isKnownVersion(lang, value, customs) ? value : defaultVersionOf(lang);

export const fromRow = (row: SettingsRow, customs: CustomTranslation[] = []): Settings => {
  const versions = (row.versions ?? {}) as Partial<Record<Lang, string>>;
  const customTemplates = asCustomTemplates(row.custom_templates);
  const stored = asStreamColors(row.stream_colors);
  const verses = migrated(row.lower_third_variant || 'scrim', stored.verses);
  const lyrics = migrated(row.lyrics_variant || 'scrim', stored.lyrics);
  const langOrder = asOrder(row.lang_order, Object.keys(langSpecsOf(customs)) as Lang[]);
  const adminLang = isLang(row.admin_lang) && langOrder.includes(row.admin_lang) ? row.admin_lang : langOrder[0];

  return {
    adminLang,
    adminVersion: asVersion(adminLang, row.admin_version, customs),
    enabled: asFlags(row.enabled, langOrder),
    versions: Object.fromEntries(langOrder.map(lang => [lang, asVersion(lang, versions[lang], customs)])),
    theme: row.theme || DEFAULT_THEME,
    dynamicImage: row.dynamic_image || '',
    localImage: (row.local_image as LocalFileMeta | null) ?? null,
    font: row.font || DEFAULT_FONT,
    align: asAlign(row.align),
    lyricsFont: row.lyrics_font || row.font || DEFAULT_FONT,
    lyricsAlign: asAlign(row.lyrics_align ?? row.align),
    streamFont: row.stream_font || row.font || DEFAULT_FONT,
    streamAlign: asAlign(row.stream_align || row.align),
    streamLyricsFont: row.stream_lyrics_font || row.lyrics_font || row.font || DEFAULT_FONT,
    streamLyricsAlign: asAlign(row.stream_lyrics_align || row.lyrics_align || row.align),
    customFonts: asCustomFonts(row.custom_fonts),
    projectorLook: looksAt(customTemplates, 'verses', row.projector_look)
      ? row.projector_look
      : lookOf(row.projector_look, false).value,
    projectorLyricsLook: looksAt(customTemplates, 'lyrics', row.projector_lyrics_look)
      ? row.projector_lyrics_look
      : lookOf(row.projector_lyrics_look === 'steady' ? '' : row.projector_lyrics_look, true).value,
    customTemplates,
    verseScale: asScaleMode(row.verse_scale),
    verseSize: clampTextSize(row.verse_size ?? DEFAULT_VERSE_TEXT_SIZE, DEFAULT_VERSE_TEXT_SIZE),
    lyricsScale: row.projector_lyrics_look === 'steady' ? 'none' : asScaleMode(row.lyrics_scale),
    lyricsSize: clampTextSize(row.lyrics_size ?? DEFAULT_TEXT_SIZE),
    transitionMs: clampTransition(row.transition_ms ?? DEFAULT_TRANSITION_MS),
    langOrder,
    lowerThirdPosition: row.lower_third_position === 'top' ? 'top' : 'bottom',
    lowerThirdVariant: droppedTemplate(customTemplates, 'stream', verses.variant) ? STREAM_FALLBACK : verses.variant,
    lyricsVariant: droppedTemplate(customTemplates, 'streamLyrics', lyrics.variant) ? STREAM_FALLBACK : lyrics.variant,
    streamColors: { verses: verses.colors, lyrics: lyrics.colors },
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
  stream_font: settings.streamFont,
  stream_align: settings.streamAlign,
  stream_lyrics_font: settings.streamLyricsFont,
  stream_lyrics_align: settings.streamLyricsAlign,
  custom_fonts: settings.customFonts,
  projector_look: settings.projectorLook,
  projector_lyrics_look: settings.projectorLyricsLook,
  custom_templates: settings.customTemplates,
  verse_scale: settings.verseScale,
  verse_size: settings.verseSize,
  lyrics_scale: settings.lyricsScale,
  lyrics_size: settings.lyricsSize,
  transition_ms: settings.transitionMs,
  lang_order: settings.langOrder,
  lower_third_position: settings.lowerThirdPosition,
  lower_third_variant: settings.lowerThirdVariant,
  lyrics_variant: settings.lyricsVariant,
  stream_colors: settings.streamColors,
  obs_hidden: settings.obsHidden,
  stream_lang: settings.streamLang,
  stage_lang: settings.stageLang,
});

const langsUsedBy = (order: Lang[], customs: CustomTranslation[]): CustomLangSpec[] => {
  const specs = langSpecsOf(customs);

  return order
    .filter(isCustomLang)
    .map(code => ({ code, label: specs[code]?.label ?? 'Added language', names: specs[code]?.names ?? [] }))
    .filter(spec => spec.names.length > 0);
};

const labelled = (settings: Settings, customs: CustomTranslation[]): Partial<Record<Lang, string>> =>
  Object.fromEntries(
    Object.entries(settings.versions).map(([lang, version]) => [
      lang,
      versionLabel(lang as Lang, version, customs),
    ]),
  );

export const projectorStyle = (settings: Settings, customs: CustomTranslation[] = []): ProjectorStyle => {
  const template = templateOf(settings, 'verses', settings.projectorLook);
  const lyricsTemplate = templateOf(settings, 'lyrics', settings.projectorLyricsLook);

  return {
    theme: settings.theme,
    dynamicImage: settings.dynamicImage,
    localImage: settings.localImage,
    font: settings.font,
    align: settings.align,
    lyricsFont: settings.lyricsFont,
    lyricsAlign: settings.lyricsAlign,
    look: settings.projectorLook,
    lyricsLook: settings.projectorLyricsLook,
    template,
    lyricsTemplate,
    versions: labelled(settings, customs),
    verseScale: settings.verseScale,
    verseSize: settings.verseSize,
    lyricsScale: settings.lyricsScale,
    lyricsSize: settings.lyricsSize,
    order: settings.langOrder,
    enabled: settings.enabled,
    transitionMs: settings.transitionMs,
    langs: langsUsedBy(settings.langOrder, customs),
    fonts: fontsUsedBy(
      [settings.font, settings.lyricsFont, ...fontsNamedBy(template), ...fontsNamedBy(lyricsTemplate)],
      settings.customFonts,
    ),
  };
};

const armedLangs = (settings: Settings): Lang[] =>
  settings.langOrder.filter(lang => settings.enabled[lang]);

export const streamLangOf = (settings: Settings): Lang => {
  const armed = armedLangs(settings);

  return armed.includes(settings.streamLang) ? settings.streamLang : (armed[0] ?? REQUIRED_LANG);
};

export const stageLangOf = (settings: Settings): Lang => {
  const armed = armedLangs(settings);

  return armed.includes(settings.stageLang) ? settings.stageLang : (armed[0] ?? REQUIRED_LANG);
};

export const streamStyle = (settings: Settings, customs: CustomTranslation[] = []): StreamStyle => {
  const chosen = streamLangOf(settings);
  const template = templateOf(settings, 'stream', settings.lowerThirdVariant);
  const lyricsTemplate = templateOf(settings, 'streamLyrics', settings.lyricsVariant);

  return {
    font: settings.streamFont,
    align: settings.streamAlign,
    lyricsFont: settings.streamLyricsFont,
    lyricsAlign: settings.streamLyricsAlign,
    order: settings.langOrder,
    enabled: Object.fromEntries(settings.langOrder.map(lang => [lang, lang === chosen])),
    transitionMs: settings.transitionMs,
    position: settings.lowerThirdPosition,
    variant: settings.lowerThirdVariant,
    lyricsVariant: settings.lyricsVariant,
    template,
    lyricsTemplate,
    versions: labelled(settings, customs),
    colors: settings.streamColors.verses,
    lyricsColors: settings.streamColors.lyrics,
    hidden: settings.obsHidden,
    langs: langsUsedBy(settings.langOrder, customs),
    fonts: fontsUsedBy(
      [
        settings.streamFont,
        settings.streamLyricsFont,
        ...fontsNamedBy(template),
        ...fontsNamedBy(lyricsTemplate),
      ],
      settings.customFonts,
    ),
  };
};
