import catalogue from '@/lib/bible/languages.json';

export const LANGS = ['geo', 'eng', 'ru', 'gr', 'ae', 'la'] as const;

export type BuiltInLang = (typeof LANGS)[number];

export const CUSTOM_LANG_PREFIX = 'x:';

export type CustomLang = `${typeof CUSTOM_LANG_PREFIX}${string}`;

export type Lang = BuiltInLang | CustomLang;

export const isCustomLang = (value: string): value is CustomLang => value.startsWith(CUSTOM_LANG_PREFIX);

export const REQUIRED_LANG: Lang = 'eng';

export const MAX_LANGS = 3;

export interface LangSpec {
  label: string;
  order: 'geo' | 'eng';
  psalms: 'lxx' | 'masoretic';
  nameOffset: 0 | 1;
  versions: string[];
  defaultVersion?: string;
  names: string[];
}

export const LANG_SPECS = catalogue as unknown as Record<BuiltInLang, LangSpec>;

let registered: Record<string, LangSpec> = {};

const listeners = new Set<() => void>();

export const onLangsChanged = (listener: () => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

export const registerLangs = (specs: Record<string, LangSpec>) => {
  registered = specs;
  listeners.forEach(listener => listener());
};

export const registeredLangs = (): Lang[] => Object.keys(registered) as Lang[];

const UNKNOWN: LangSpec = {
  label: 'Added language',
  order: 'eng',
  psalms: 'masoretic',
  nameOffset: 0,
  versions: [],
  names: LANG_SPECS.eng.names,
};

export const specOf = (lang: Lang): LangSpec =>
  isCustomLang(lang)
    ? (registered[lang] ?? UNKNOWN)
    : (LANG_SPECS[lang as BuiltInLang] ?? UNKNOWN);

export const LANG_LABELS = Object.fromEntries(
  LANGS.map(lang => [lang, LANG_SPECS[lang].label]),
) as Record<BuiltInLang, string>;

export const labelOf = (lang: Lang): string => specOf(lang).label;

export const versionsOf = (lang: Lang) =>
  specOf(lang).versions.map(version => ({ value: version, label: version }));

export const defaultVersionOf = (lang: Lang): string => {
  const spec = specOf(lang);

  return spec.defaultVersion ?? spec.versions[0] ?? '';
};

export const isLang = (value: unknown): value is Lang =>
  typeof value === 'string' && (LANGS.includes(value as BuiltInLang) || isCustomLang(value));
