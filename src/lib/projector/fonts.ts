/**
 * What a font setting *means*.
 *
 * A typeface is stored as a string in four places — `font`, `lyricsFont`,
 * `streamFont`, `streamLyricsFont` — and that string has always been a
 * Tailwind class name, because Tailwind 4 turns every `--font-x` in `@theme`
 * into a `font-x` utility. That is still true of the faces we ship.
 *
 * An operator can now add their own, and those have no class: they are fetched
 * from the internet at run time, so they are named by a `custom:<id>` value
 * that resolves to a CSS family instead. Every reader — both outputs, the
 * preview, the console cards, the sidebar summary — goes through here, so
 * there is one answer to "which typeface is this" rather than five.
 *
 * This file is pure. The loading of a custom face is
 * `components/projector/useCustomFonts.ts`; the picking of one is
 * `components/studio/FontsSection.tsx`.
 */

/**
 * A typeface the operator added, fetched rather than bundled.
 *
 * Deliberately a URL and not a file. `/lower3rd` in OBS is a separate process
 * with its own storage and no account, so a font *file* would have had to
 * travel the WebRTC path that backgrounds use; a URL is a few dozen bytes that
 * ride in the slide payload, and every output fetches it over the connection
 * it already needs for realtime. Nothing is uploaded, so the cost decision in
 * CLAUDE.md is untouched.
 */
export interface CustomFont {
  id: string;
  /** What the operator called it. Shown in the pickers; never used in CSS. */
  label: string;
  kind: 'google' | 'url';
  /** A Google Fonts family name, or a direct link to a font file. */
  source: string;
}

/** The faces we ship. The value is the Tailwind class; see `@theme` in globals.css. */
export const BUILT_IN_FONTS = [
  { value: 'font-banner', label: 'BPG Banner Caps (Georgian)' },
  { value: 'font-valera', label: 'Varela Round (Latin)' },
  { value: 'font-firago', label: 'FiraGO (Georgian, Latin, Cyrillic)' },
  { value: 'font-notosans', label: 'Noto Sans (Georgian, Latin, Cyrillic)' },
  { value: 'font-notoserif', label: 'Noto Serif (Georgian, Latin, Cyrillic)' },
  { value: 'font-inter', label: 'Inter (Latin, Cyrillic)' },
  { value: 'font-sourcesans', label: 'Source Sans 3 (Latin, Cyrillic)' },
  { value: 'font-lora', label: 'Lora (Latin, Cyrillic)' },
  { value: 'font-robotoslab', label: 'Roboto Slab (Latin, Cyrillic)' },
  { value: 'font-montserrat', label: 'Montserrat (Latin, Cyrillic)' },
  { value: 'font-playfair', label: 'Playfair Display (Latin, Cyrillic)' },
  { value: 'font-oswald', label: 'Oswald (Latin, Cyrillic)' },
  { value: 'font-bebas', label: 'Bebas Neue (Latin)' },
] as const;

/** What every fallback lands on: the face a fresh settings row is created with. */
export const DEFAULT_FONT = 'font-banner';

export const CUSTOM_PREFIX = 'custom:';

/** At most this many added faces. A picker is a native select read across a booth. */
export const MAX_CUSTOM_FONTS = 12;

export const isBuiltInFont = (value: string) => BUILT_IN_FONTS.some(font => font.value === value);

export const isCustomFont = (value: string) => value.startsWith(CUSTOM_PREFIX);

export const customIdOf = (value: string) => (isCustomFont(value) ? value.slice(CUSTOM_PREFIX.length) : null);

export const valueOf = (font: CustomFont) => `${CUSTOM_PREFIX}${font.id}`;

/**
 * The CSS family a face is drawn with.
 *
 * A Google family keeps the name Google gave it — that stylesheet declares its
 * own `font-family`, and there is no way to alias a webfont to another name
 * (`local()` matches installed fonts only, never a face fetched over a link).
 * A hosted file has no name of its own, so it gets one from the id: never from
 * the label, because the operator can rename a font and a family that moved
 * with the label would orphan the `@font-face` already in the document.
 */
export const familyNameOf = (font: CustomFont) =>
  font.kind === 'google' ? font.source.trim() : `selah-${font.id}`;

export const findCustomFont = (value: string, fonts: CustomFont[]): CustomFont | null => {
  const id = customIdOf(value);

  return (id && fonts.find(font => font.id === id)) || null;
};

/**
 * The class to put on the element, or nothing when the face is a custom one.
 *
 * A stored value naming neither a face we ship nor a font the operator still
 * has falls back rather than returning the string as-is: an unknown class name
 * is not inert, it is a live Tailwind utility that may mean something else
 * entirely. A font deleted from the library is the ordinary way to get here.
 */
export const fontClassOf = (value: string, fonts: CustomFont[] = []): string => {
  if (isBuiltInFont(value)) return value;
  if (findCustomFont(value, fonts)) return '';

  return DEFAULT_FONT;
};

/**
 * The inline `font-family` for a custom face, and `undefined` for a built-in
 * so the class keeps winning and nothing about the shipped faces moves.
 */
export const fontFamilyOf = (value: string, fonts: CustomFont[] = []): string | undefined => {
  const font = findCustomFont(value, fonts);

  // A generic behind it, so a face that fails to fetch leaves readable text
  // on the wall rather than whatever the browser defaults to.
  return font ? `'${familyNameOf(font)}', sans-serif` : undefined;
};

/** Both, for a caller that draws text: a class and a style, always in step. */
export const fontStyleOf = (value: string, fonts: CustomFont[] = []) => ({
  className: fontClassOf(value, fonts),
  style: fontFamilyOf(value, fonts),
});

/** The shipped faces and the operator's own, for a `<Select>`. */
export const fontOptions = (fonts: CustomFont[] = []) => [
  ...BUILT_IN_FONTS.map(font => ({ value: font.value, label: font.label })),
  ...fonts.map(font => ({ value: valueOf(font), label: font.label })),
];

/**
 * A name for a stored value, for the sidebar's one-line summary.
 *
 * The sidebar used to print `settings.font.replace('font-', '')`, which reads
 * "banner" for a shipped face and would read "custom:custom-1712…" for an
 * added one.
 */
export const fontLabelOf = (value: string, fonts: CustomFont[] = []): string => {
  const custom = findCustomFont(value, fonts);

  if (custom) return custom.label;

  const built = BUILT_IN_FONTS.find(font => font.value === value);

  // The parenthesised script list belongs in a picker, not in a summary row.
  return built ? built.label.replace(/\s*\([^)]*\)$/, '') : value.replace('font-', '');
};

/**
 * The stylesheet for a Google family. Built here rather than pasted, so the
 * only third-party CSS the outputs ever load comes from a host we named.
 */
export const googleCssUrl = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}:wght@400;700&display=swap`;

/** A Google family name: a plain run of words, which is all their API takes. */
export const isFamilyName = (value: string) => /^[\w][\w .-]{0,63}$/.test(value.trim());

/**
 * A link we are willing to write into an `@font-face`. Https only — an output
 * is served over https and a mixed-content font is a font that never arrives —
 * and a font file rather than a stylesheet, because we write the CSS.
 */
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

/** `Playfair+Display` and `Playfair%20Display` are both that family's name. */
const tidyFamily = (value: string) => decodeURIComponent(value).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The family a Google Fonts page is about.
 *
 * The operator finds a typeface by looking at it, and what they have in hand
 * at that moment is the address bar — so the specimen URL is the thing to
 * accept. Asking them to retype the name off the page instead is asking them
 * to copy something they are already holding.
 *
 * The stylesheet URL is taken too, for anyone who got as far as Google's own
 * embed snippet.
 */
export const googleFamilyFromUrl = (value: string): string | null => {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'fonts.google.com') {
    // /specimen/Merriweather, and anything Google hangs off it — /tester,
    // /about, a ?preview.text= query from having typed in their sample box.
    const match = /^\/specimen\/([^/]+)/.exec(url.pathname);

    return match ? tidyFamily(match[1]) : null;
  }

  if (host === 'fonts.googleapis.com') {
    const family = url.searchParams.get('family');

    // `Merriweather:wght@400;700` — the axes are Google's business, not ours.
    return family ? tidyFamily(family.split(':')[0]) : null;
  }

  return null;
};

/**
 * Work out what the operator pasted.
 *
 * One box rather than a box and a dropdown: the two kinds are told apart by
 * looking at them, and a menu that asks which of two things you are about to
 * paste is a question the paste itself answers.
 */
export const parseSource = (value: string): Pick<CustomFont, 'kind' | 'source'> | null => {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const family = googleFamilyFromUrl(trimmed);

  if (family) return isFamilyName(family) ? { kind: 'google', source: family } : null;

  if (isFontUrl(trimmed)) return { kind: 'url', source: trimmed };

  // A link that is neither is a link we cannot use — and it is not a family
  // name either, however much `isFamilyName` might be talked into it.
  if (/^[a-z][\w+.-]*:/i.test(trimmed)) return null;

  return isFamilyName(trimmed) ? { kind: 'google', source: trimmed } : null;
};

/** What to call a face the operator did not name: the family, or the filename. */
export const defaultLabelOf = ({ kind, source }: Pick<CustomFont, 'kind' | 'source'>): string => {
  if (kind === 'google') return source;

  try {
    const file = decodeURIComponent(new URL(source).pathname.split('/').pop() ?? '');

    return file.replace(/\.[^.]+$/, '') || source;
  } catch {
    return source;
  }
};

/**
 * A stored `custom_fonts` value, cleaned up — the same shape of coercer as
 * `asOrder` and `asFlags` in `lib/studio/settings.ts`, and for the same
 * reason: the row outlives the code that wrote it.
 */
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

/**
 * Only the faces these values actually name.
 *
 * The library is the operator's; a slide is not the place to carry it. The
 * stream narrows `enabled` to its one language for the same reason, and an
 * output that is drawing one typeface has no use for the other eleven.
 */
export const fontsUsedBy = (values: string[], fonts: CustomFont[]): CustomFont[] =>
  fonts.filter(font => values.includes(valueOf(font)));
