import {
  defaultVersionOf,
  isCustomLang,
  isLang,
  LANG_SPECS,
  specOf,
  type Lang,
  type LangSpec,
} from '@/lib/bible/languages';

export interface CustomTranslation {
  id: string;
  lang: Lang;
  langLabel?: string;
  bookNames?: string[];
  label: string;
  psalms: 'lxx' | 'masoretic';
}

export const CUSTOM_PREFIX = 'custom:';

export const isCustomVersion = (value: string) => value.startsWith(CUSTOM_PREFIX);

export const customIdOf = (value: string) => (isCustomVersion(value) ? value.slice(CUSTOM_PREFIX.length) : null);

export const versionValueOf = (translation: { id: string }) => `${CUSTOM_PREFIX}${translation.id}`;

export const customsFor = (lang: Lang, customs: CustomTranslation[]) =>
  customs.filter(translation => translation.lang === lang);

export const findCustomVersion = (value: string, customs: CustomTranslation[]): CustomTranslation | null => {
  const id = customIdOf(value);

  return (id && customs.find(translation => translation.id === id)) || null;
};

export const isKnownVersion = (lang: Lang, value: string, customs: CustomTranslation[]): boolean =>
  (!isCustomLang(lang) && specOf(lang).versions.includes(value)) ||
  findCustomVersion(value, customs)?.lang === lang;

export const versionOptions = (lang: Lang, customs: CustomTranslation[]) => [
  ...(isCustomLang(lang) ? [] : specOf(lang).versions.map(version => ({ value: version, label: version }))),
  ...customsFor(lang, customs).map(translation => ({
    value: versionValueOf(translation),
    label: translation.label,
  })),
];

export const versionLabel = (lang: Lang, value: string | undefined, customs: CustomTranslation[]): string => {
  if (!value) return '';
  if (!isCustomVersion(value)) return value;

  return findCustomVersion(value, customs)?.label ?? defaultVersionOf(lang);
};

export const psalmSchemeOf = (
  lang: Lang,
  value: string | undefined,
  customs: CustomTranslation[],
): 'lxx' | 'masoretic' =>
  (value ? findCustomVersion(value, customs)?.psalms : undefined) ?? specOf(lang).psalms;

export const asCustomTranslations = (rows: unknown): CustomTranslation[] =>
  Array.isArray(rows)
    ? rows.flatMap(row => {
        const entry = row as Partial<CustomTranslation> & { lang_label?: unknown; book_names?: unknown };

        return typeof entry?.id === 'string' && typeof entry.label === 'string' && isLang(entry.lang)
          ? [
              {
                id: entry.id,
                lang: entry.lang,
                label: entry.label,
                psalms: entry.psalms === 'lxx' ? 'lxx' : 'masoretic',
                langLabel: typeof entry.lang_label === 'string' ? entry.lang_label : entry.langLabel,
                bookNames: Array.isArray(entry.book_names) && entry.book_names.length === 69
                  ? (entry.book_names as string[])
                  : entry.bookNames,
              } satisfies CustomTranslation,
            ]
          : [];
      })
    : [];

export const langSpecsOf = (customs: CustomTranslation[]): Record<string, LangSpec> => {
  const gathered = new Map<string, { label: string; names: string[] | null; versions: string[] }>();

  for (const translation of customs) {
    if (!isCustomLang(translation.lang)) continue;

    const had = gathered.get(translation.lang);

    gathered.set(translation.lang, {
      label: had?.label || translation.langLabel || 'Added language',
      names: had?.names ?? (translation.bookNames?.length === 69 ? translation.bookNames : null),
      versions: [...(had?.versions ?? []), versionValueOf(translation)],
    });
  }

  return Object.fromEntries(
    [...gathered].map(([code, { label, names, versions }]): [string, LangSpec] => [
      code,
      {
        label,
        order: 'eng',
        psalms: 'masoretic',
        nameOffset: 0,
        versions,
        names: names ?? LANG_SPECS.eng.names,
      },
    ]),
  );
};

export const customLangsOf = (customs: CustomTranslation[]): { code: Lang; label: string }[] => {
  const specs = langSpecsOf(customs);

  return Object.entries(specs).map(([code, spec]) => ({ code: code as Lang, label: spec.label }));
};
