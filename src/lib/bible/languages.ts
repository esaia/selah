import catalogue from '@/lib/bible/languages.json';

/**
 * Every language the scripture API carries, keyed by the API's own code — so a
 * request needs no translation table, and a language added upstream is one
 * entry here.
 *
 * German is missing on purpose: `holybible.ge` lists it and offers two
 * translations, but every German request comes back in English, so arming it
 * would put English on the projector under a German label. Add it back — and
 * regenerate the catalogue — the day the upstream corpus is real.
 *
 * This list is what makes `Lang` a closed union; `languages.json` is what the
 * rows are. They have to agree, and `mapping.test.ts` checks that they do.
 */
export const LANGS = [
  'geo', 'eng', 'ru', 'es', 'fr', 'gr', 'he', 'ae', 'tr', 'la', 'jp', 'ua', 'ab', 'os',
] as const;

export type Lang = (typeof LANGS)[number];

/**
 * English is always in the operator's set and cannot be removed: it is the one
 * language every reader of this console has in common, and the fallback every
 * output lands on when a pick goes away.
 */
export const REQUIRED_LANG: Lang = 'eng';

/** How many languages fit on a slide before it stops being readable. */
export const MAX_LANGS = 3;

export interface LangSpec {
  label: string;
  /**
   * Which book numbering the API expects. Georgian order puts the catholic
   * epistles before the Pauline ones; English does not, and `englishBooks`
   * remaps between them.
   */
  order: 'geo' | 'eng';
  /** Psalm numbering: the Septuagint splits, or the Masoretic ones. */
  psalms: 'lxx' | 'masoretic';
  /**
   * Greek's `bibleNames` carries a stray fourth header before Genesis, so every
   * name in it sits one index later than the book id says.
   */
  nameOffset: 0 | 1;
  /** The upstream `mv` strings, in the order the API lists them. */
  versions: string[];
  /** The translation the language opens on, when it is not the first listed. */
  defaultVersion?: string;
  /** `bibleNames`: three group headers, then the 66 books. */
  names: string[];
}

/**
 * The catalogue itself: a label, the translations, the book names, and the only
 * two things that actually vary between languages — which book numbering the
 * API wants and how the psalms are split. Both were checked against the API
 * rather than assumed: `w=48` returns James in Georgian-ordered languages and
 * Romans in English-ordered ones, and Psalm 10 has seven verses under the
 * Septuagint split and eighteen under the Masoretic.
 *
 * It lives in JSON rather than in this file so that `scripts/` can read it too
 * — `languages.mjs` writes it, and `mirror.mjs` walks it — and so the eleven
 * generated languages can be refreshed without touching any code. JSON has no
 * literal types, hence the cast; the shape is enforced by the test.
 *
 * Abkhazian and Ossetian are New Testament only. Their Old Testament names fall
 * back to Russian upstream and an Old Testament request returns nothing.
 */
export const LANG_SPECS = catalogue as unknown as Record<Lang, LangSpec>;

export const specOf = (lang: Lang): LangSpec => LANG_SPECS[lang];

export const LANG_LABELS = Object.fromEntries(
  LANGS.map(lang => [lang, LANG_SPECS[lang].label]),
) as Record<Lang, string>;

/** The translations `lang` offers, as options for a picker. */
export const versionsOf = (lang: Lang) =>
  LANG_SPECS[lang].versions.map(version => ({ value: version, label: version }));

/** The translation a language opens on when the operator has not chosen one. */
export const defaultVersionOf = (lang: Lang): string =>
  LANG_SPECS[lang].defaultVersion ?? LANG_SPECS[lang].versions[0] ?? '';

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);
