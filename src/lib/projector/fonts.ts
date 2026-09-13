
export interface CustomFont {
  id: string;
  label: string;
  kind: 'google' | 'url';
  source: string;
}

export const BUILT_IN_FONTS = [
  { value: 'font-banner', label: 'BPG Banner Caps (Georgian, Latin)' },
  { value: 'font-lestudio', label: 'BPG LE Studio 02 Caps (Georgian, Latin)' },
  { value: 'font-eurostile', label: 'Eurostile GEO (Georgian, Latin)' },
  { value: 'font-futura', label: 'Futura Book Mta (Georgian, Latin)' },
  { value: 'font-sanet', label: 'ALK Sanet (Georgian, Latin)' },
  { value: 'font-firago', label: 'FiraGO (Georgian, Latin, Cyrillic)' },
  { value: 'font-notosans', label: 'Noto Sans (Georgian, Latin, Cyrillic)' },
  { value: 'font-notoserif', label: 'Noto Serif (Georgian, Latin, Cyrillic)' },
  { value: 'font-inter', label: 'Inter (Latin, Cyrillic)' },
  { value: 'font-sourcesans', label: 'Source Sans 3 (Latin, Cyrillic)' },
  { value: 'font-robotoslab', label: 'Roboto Slab (Latin, Cyrillic)' },
  { value: 'font-montserrat', label: 'Montserrat (Latin, Cyrillic)' },
  { value: 'font-playfair', label: 'Playfair Display (Latin, Cyrillic)' },
  { value: 'font-oswald', label: 'Oswald (Latin, Cyrillic)' },
  { value: 'font-bebas', label: 'Bebas Neue (Latin)' },
] as const;

export const DEFAULT_FONT = 'font-banner';

export const CUSTOM_PREFIX = 'custom:';

export const MAX_CUSTOM_FONTS = 12;

export const isBuiltInFont = (value: string) => BUILT_IN_FONTS.some(font => font.value === value);

export const isCustomFont = (value: string) => value.startsWith(CUSTOM_PREFIX);

export const customIdOf = (value: string) => (isCustomFont(value) ? value.slice(CUSTOM_PREFIX.length) : null);

export const valueOf = (font: CustomFont) => `${CUSTOM_PREFIX}${font.id}`;

export const familyNameOf = (font: CustomFont) =>
  font.kind === 'google' ? font.source.trim() : `llama-${font.id}`;

export const findCustomFont = (value: string, fonts: CustomFont[]): CustomFont | null => {
  const id = customIdOf(value);

  return (id && fonts.find(font => font.id === id)) || null;
};

export const fontClassOf = (value: string, fonts: CustomFont[] = []): string => {
  if (isBuiltInFont(value)) return value;
  if (findCustomFont(value, fonts)) return '';

  return DEFAULT_FONT;
};

export const fontFamilyOf = (value: string, fonts: CustomFont[] = []): string | undefined => {
  const font = findCustomFont(value, fonts);

  return font ? `'${familyNameOf(font)}', sans-serif` : undefined;
};

export const fontStyleOf = (value: string, fonts: CustomFont[] = []) => ({
  className: fontClassOf(value, fonts),
  style: fontFamilyOf(value, fonts),
});

export const fontOptions = (fonts: CustomFont[] = []) => [
  ...BUILT_IN_FONTS.map(font => ({ value: font.value, label: font.label })),
  ...fonts.map(font => ({ value: valueOf(font), label: font.label })),
];

export const fontLabelOf = (value: string, fonts: CustomFont[] = []): string => {
  const custom = findCustomFont(value, fonts);

  if (custom) return custom.label;

  const built = BUILT_IN_FONTS.find(font => font.value === value);

  return built ? built.label.replace(/\s*\([^)]*\)$/, '') : value.replace('font-', '');
};

export const googleCssUrl = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}:wght@400;700&display=swap`;

export const isFamilyName = (value: string) => /^[\w][\w .-]{0,63}$/.test(value.trim());

export const isFontUrl = (value: string) => {
  try {
    const url = new URL(value.trim());

    return url.protocol === 'https:' && /\.(woff2|woff|ttf|otf)$/i.test(url.pathname);
  } catch {
    return false;
  }
};

export const isValidSource = (kind: CustomFont['kind'], source: string) =>
  kind === 'google' ? isFamilyName(source) : isFontUrl(source);

const tidyFamily = (value: string) => decodeURIComponent(value).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();

export const googleFamilyFromUrl = (value: string): string | null => {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'fonts.google.com') {
    const match = /^\/specimen\/([^/]+)/.exec(url.pathname);

    return match ? tidyFamily(match[1]) : null;
  }

  if (host === 'fonts.googleapis.com') {
    const family = url.searchParams.get('family');

    return family ? tidyFamily(family.split(':')[0]) : null;
  }

  return null;
};

export const parseSource = (value: string): Pick<CustomFont, 'kind' | 'source'> | null => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const family = googleFamilyFromUrl(trimmed);

  if (family) return isFamilyName(family) ? { kind: 'google', source: family } : null;

  if (isFontUrl(trimmed)) return { kind: 'url', source: trimmed };

  if (/^[a-z][\w+.-]*:/i.test(trimmed)) return null;

  return isFamilyName(trimmed) ? { kind: 'google', source: trimmed } : null;
};

export const defaultLabelOf = ({ kind, source }: Pick<CustomFont, 'kind' | 'source'>): string => {
  if (kind === 'google') return source;

  try {
    const file = decodeURIComponent(new URL(source).pathname.split('/').pop() ?? '');

    return file.replace(/\.[^.]+$/, '') || source;
  } catch {
    return source;
  }
};

export const asCustomFonts = (value: unknown): CustomFont[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .filter((item): item is CustomFont => {
      if (!item || typeof item !== 'object') return false;

      const font = item as Partial<CustomFont>;

      return (
        typeof font.id === 'string' &&
        font.id.length > 0 &&
        typeof font.label === 'string' &&
        (font.kind === 'google' || font.kind === 'url') &&
        typeof font.source === 'string' &&
        isValidSource(font.kind, font.source)
      );
    })
    .filter(font => !seen.has(font.id) && seen.add(font.id))
    .slice(0, MAX_CUSTOM_FONTS)
    .map(font => ({ id: font.id, label: font.label || font.source, kind: font.kind, source: font.source }));
};

export const fontsUsedBy = (values: string[], fonts: CustomFont[]): CustomFont[] =>
  fonts.filter(font => values.includes(valueOf(font)));
