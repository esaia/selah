import catalogue from '@/lib/bible/isoLanguages.json';

import { CUSTOM_LANG_PREFIX, type BuiltInLang, type Lang } from '@/lib/bible/languages';

const ISO_LANGUAGES = catalogue as Record<string, string>;

const OURS: Record<string, BuiltInLang> = {
  ka: 'geo',
  en: 'eng',
  ru: 'ru',
  el: 'gr',
  ar: 'ae',
  la: 'la',
};

export const LANGUAGE_OPTIONS: { value: string; label: string }[] = Object.entries(ISO_LANGUAGES)
  .map(([iso, label]) => ({ value: iso, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const langOf = (iso: string): Lang => OURS[iso] ?? (`${CUSTOM_LANG_PREFIX}${iso}` as Lang);

export const labelForIso = (iso: string): string => ISO_LANGUAGES[iso] ?? iso;

export const isoOf = (lang: Lang): string => {
  const mine = Object.entries(OURS).find(([, code]) => code === lang);

  if (mine) return mine[0];

  return lang.startsWith(CUSTOM_LANG_PREFIX) ? lang.slice(CUSTOM_LANG_PREFIX.length) : '';
};
