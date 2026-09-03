import catalogue from '@/lib/bible/languages.json';

/**
 * Every language Selah can put on a screen — which is exactly the set we hold
 * our own copy of, in `bible_text`.
 *
 * It used to be everything `holybible.ge` listed, with the console falling
 * back to that host for whatever had not been copied. Offering a translation
 * we cannot serve ourselves is a promise we cannot keep on the one morning it
 * matters, so the catalogue and the corpus are now the same list. Adding a
 * language means mirroring it first: `pnpm mirror`, then regenerate this.
 *
 * Codes are the scripture API's own, so the mirror script needs no translation
 * table. This list is what makes `Lang` a closed union; `languages.json` is
 * what the rows are, and `mapping.test.ts` checks the two agree.
 */
export const LANGS = ['geo', 'eng', 'ru', 'gr', 'ae', 'la'] as const;

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
  /**
   * The translations, best first — the first is what a console opens on, so
   * the order is a recommendation rather than a catalogue listing. English
   * leads with the WEB: it is the only modern-English translation here, and
   * the only one dedicated outright to the public domain.
   */
  versions: string[];
  /** Overrides the first entry, for a language whose order is not a preference. */
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
