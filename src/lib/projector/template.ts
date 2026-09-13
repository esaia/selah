import { apiBookName } from '@/lib/bible/passage';
import { lyricBlocks } from '@/lib/lyrics/langs';
import { defaultsOf, type Colorway } from '@/lib/lower3rd/colors';
import { asHex, withAlpha } from '@/lib/studio/color';
import { REQUIRED_LANG, type Align, type Lang, type LocalFileMeta, type ShowData, type Verse } from '@/lib/types';

export const MAX_ELEMENTS = 24;

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Base {
  id: string;
  frame: Frame;
  opacity: number;
  rotation: number;
}

export type AutoSize = 'shrink' | 'fixed';

export type PerLanguage = 'stack' | 'split';
export type VAlign = 'top' | 'middle' | 'bottom';
export type Caps = 'none' | 'upper' | 'lower';
export type Shadow = 'none' | 'soft' | 'strong';

export interface TextStyle {
  font: string;
  size: number;
  autoSize: AutoSize;
  weight: 400 | 600 | 700;
  italic: boolean;
  caps: Caps;
  color: string;
  align: Align;
  lineHeight: number;
  preserveLineBreaks: boolean;
  stripPunctuation: boolean;
  shadow: Shadow;
  stroke: string;
  strokeWidth: number;
  plateKind: PlateKind;
  plateSpan: PlateSpan;
  plateGap: number;
  plate: string;
  plateGradient: Gradient;
  plateStroke: string;
  plateStrokeWidth: number;
  radius: number;
}

export interface TextElement extends Base, TextStyle {
  kind: 'text';
  content: string;
  valign: VAlign;
  padding: number;
  perLanguage: PerLanguage;
  gap: number;
  secondary: TextStyle | null;
}

export type Fit = 'contain' | 'cover' | 'fill';

export type FillKind = 'none' | 'color' | 'gradient' | 'image';

export type PlateKind = 'none' | 'color' | 'gradient';

export type PlateSpan = 'box' | 'line';

export interface Gradient {
  from: string;
  to: string;
  angle: number;
}

export interface ShapeElement extends Base {
  kind: 'rect' | 'ellipse' | 'line';
  fillKind: FillKind;
  fill: string;
  gradient: Gradient;
  file: LocalFileMeta | null;
  fit: Fit;
  stroke: string;
  strokeWidth: number;
  radius: number;
}

export interface PictureElement extends Base {
  kind: 'picture';
  file: LocalFileMeta | null;
  fit: Fit;
  radius: number;
}

export type TemplateElement = TextElement | ShapeElement | PictureElement;

export type ElementKind = TemplateElement['kind'];

export interface SlideTemplate {
  elements: TemplateElement[];
}

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export const DEFAULT_GRADIENT: Gradient = { from: '#fcdf50', to: '#191818', angle: 180 };

export const DEFAULT_TEXT: Omit<TextElement, 'id' | 'frame' | 'content'> = {
  kind: 'text',
  opacity: 1,
  rotation: 0,
  font: 'font-banner',
  size: 8,
  autoSize: 'shrink',
  weight: 400,
  italic: false,
  caps: 'none',
  color: '#ffffff',
  align: 'left',
  valign: 'middle',
  lineHeight: 1.2,
  preserveLineBreaks: false,
  stripPunctuation: false,
  padding: 0,
  shadow: 'strong',
  stroke: '',
  strokeWidth: 0.3,
  perLanguage: 'stack',
  gap: 1.5,
  plateKind: 'none',
  plateSpan: 'box',
  plateGap: 0.16,
  plate: '',
  plateGradient: DEFAULT_GRADIENT,
  plateStroke: '',
  plateStrokeWidth: 0.3,
  radius: 0,
  secondary: null,
};

export const DEFAULT_TEMPLATE: SlideTemplate = {
  elements: [
    {
      ...DEFAULT_TEXT,
      id: 'verses',
      frame: { x: 0.06, y: 0.12, w: 0.88, h: 0.62 },
      content: '{{verses}}',
    },
    {
      ...DEFAULT_TEXT,
      id: 'reference',
      frame: { x: 0.06, y: 0.76, w: 0.88, h: 0.1 },
      content: '{{reference}}',
      size: 5,
      italic: true,
      color: '#ffffffd1',
      valign: 'top',
    },
  ],
};

export const DEFAULT_LYRIC_TEMPLATE: SlideTemplate = {
  elements: [
    {
      ...DEFAULT_TEXT,
      id: 'lyrics',
      frame: { x: 0.06, y: 0.14, w: 0.88, h: 0.72 },
      content: '{{lyrics}}',
      size: 11,
      align: 'center',
      valign: 'middle',
    },
  ],
};

export const DEFAULT_STREAM_TEMPLATE: SlideTemplate = {
  elements: [
    {
      ...DEFAULT_TEXT,
      id: 'verses',
      frame: { x: 0.06, y: 0.74, w: 0.88, h: 0.14 },
      content: '{{verses}}',
      size: 5,
      plateKind: 'color',
      plate: '#0a0c11cc',
      padding: 1.6,
      radius: 0.8,
    },
    {
      ...DEFAULT_TEXT,
      id: 'reference',
      frame: { x: 0.06, y: 0.885, w: 0.88, h: 0.055 },
      content: '{{reference}}',
      size: 2.6,
      italic: true,
      color: '#ffffffd1',
      valign: 'top',
    },
  ],
};

export const DEFAULT_STREAM_LYRIC_TEMPLATE: SlideTemplate = {
  elements: [
    {
      ...DEFAULT_TEXT,
      id: 'lyrics',
      frame: { x: 0.06, y: 0.76, w: 0.88, h: 0.16 },
      content: '{{lyrics}}',
      size: 5.5,
      align: 'center',
      plateKind: 'color',
      plate: '#0a0c11cc',
      padding: 1.6,
      radius: 0.8,
    },
  ],
};

const paintOf = (variant: string, colors: Colorway): Required<Colorway> => ({
  plate: '',
  accent: '',
  ink: '#ffffff',
  ...defaultsOf(variant),
  ...colors,
});

export const templateFromVariant = (variant: string, kind: TemplateTarget, colors: Colorway): SlideTemplate => {
  const paint = paintOf(variant, colors);
  const lyrics = kind === 'streamLyrics';

  const body: TextElement = {
    ...DEFAULT_TEXT,
    id: lyrics ? 'lyrics' : 'verses',
    frame: lyrics ? { x: 0.06, y: 0.76, w: 0.88, h: 0.16 } : { x: 0.06, y: 0.74, w: 0.88, h: 0.14 },
    content: lyrics ? '{{lyrics}}' : '{{verses}}',
    size: lyrics ? 5.5 : 5,
    align: lyrics ? 'center' : 'left',
    color: paint.ink,
    padding: 1.6,
    radius: 0.8,
  };

  const reference: TextElement = {
    ...DEFAULT_TEXT,
    id: 'reference',
    frame: { x: 0.06, y: 0.885, w: 0.88, h: 0.055 },
    content: '{{reference}}',
    size: 2.6,
    italic: true,
    color: withAlpha(paint.ink, 0.82),
    valign: 'top',
  };

  if (variant === 'scrim') {
    body.plateKind = 'gradient';
    body.plateGradient = { from: withAlpha(paint.plate, 0.9), to: withAlpha(paint.plate, 0), angle: 180 };
  } else if (variant === 'solid') {
    body.plateKind = 'color';
    body.plate = withAlpha(paint.plate, 0.88);
  } else if (variant === 'bands') {
    body.plateKind = 'color';
    body.plate = withAlpha(paint.plate, 0.93);
    body.plateSpan = 'line';
    body.lineHeight = 1.5;
    body.plateGap = 0.16;
    reference.plateKind = 'color';
    reference.plate = withAlpha(paint.plate, 0.93);
    reference.plateSpan = 'line';
    reference.lineHeight = 1.8;
    reference.plateGap = 0.16;
  } else if (variant === 'card') {
    body.frame = lyrics ? body.frame : { x: 0.06, y: 0.77, w: 0.88, h: 0.13 };
    body.plateKind = 'color';
    body.plate = withAlpha(paint.plate, 1);
    body.radius = 0;
    reference.frame = { x: 0.06, y: 0.715, w: 0.4, h: 0.045 };
    reference.plateKind = 'color';
    reference.plate = withAlpha(paint.accent || paint.plate, 0.95);
    reference.italic = false;
    reference.weight = 700;
    reference.caps = 'upper';
    reference.color = paint.ink;
    reference.valign = 'middle';
    reference.padding = 0.6;
    reference.radius = 0.4;
  } else if (variant === 'split') {
    body.frame = lyrics ? body.frame : { x: 0.06, y: 0.74, w: 0.6, h: 0.14 };
    body.plateKind = 'color';
    body.plate = withAlpha(paint.plate, 0.93);
    reference.frame = { x: 0.68, y: 0.74, w: 0.26, h: 0.14 };
    reference.italic = false;
    reference.weight = 700;
    reference.size = 3.2;
    reference.color = paint.ink;
    reference.valign = 'middle';
    reference.align = 'right';
  } else if (variant === 'plain') {
    body.shadow = 'strong';
    reference.shadow = 'strong';
  }

  if (lyrics) return { elements: [body] };

  const rule: ShapeElement = {
    kind: 'line',
    id: 'rule',
    frame: { x: 0.06, y: 0.735, w: 0.88, h: 0.004 },
    opacity: 1,
    rotation: 0,
    fillKind: 'color',
    fill: paint.accent || paint.plate,
    gradient: DEFAULT_GRADIENT,
    file: null,
    fit: 'cover',
    stroke: '',
    strokeWidth: 0,
    radius: 0,
  };

  return { elements: variant === 'split' ? [rule, body, reference] : [body, reference] };
};

export const newElement = (kind: ElementKind, id: string): TemplateElement => {
  if (kind === 'text') {
    return { ...DEFAULT_TEXT, id, frame: { x: 0.2, y: 0.4, w: 0.6, h: 0.2 }, content: 'Text' };
  }

  if (kind === 'picture') {
    return {
      kind,
      id,
      frame: { x: 0.35, y: 0.35, w: 0.3, h: 0.3 },
      opacity: 1,
      rotation: 0,
      file: null,
      fit: 'contain',
      radius: 0,
    };
  }

  return {
    kind,
    id,
    frame: kind === 'line' ? { x: 0.2, y: 0.5, w: 0.6, h: 0.005 } : { x: 0.3, y: 0.35, w: 0.4, h: 0.3 },
    opacity: 1,
    rotation: 0,
    fillKind: 'color',
    fill: kind === 'line' ? '#ffffff' : '#00000099',
    gradient: DEFAULT_GRADIENT,
    file: null,
    fit: 'cover',
    stroke: '',
    strokeWidth: 0,
    radius: 0,
  };
};

const SAMPLE_TEXT: Partial<Record<Lang, string>> = {
  eng: 'For God so loved the world, that he gave his one and only Son.',
  geo: 'რადგან ისე შეიყვარა ღმერთმა ქვეყნიერება, რომ თავისი მხოლოდშობილი ძე გასცა.',
  ru: 'Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного.',
  gr: 'Οὕτως γὰρ ἠγάπησεν ὁ Θεὸς τὸν κόσμον, ὥστε τὸν Υἱὸν τὸν μονογενῆ ἔδωκεν.',
  ae: 'لأنه هكذا أحب الله العالم حتى بذل ابنه الوحيد.',
  la: 'Sic enim dilexit Deus mundum, ut Filium suum unigenitum daret.',
};

export const sampleShowData = (langs: Lang[]): ShowData =>
  Object.fromEntries(
    langs.map(lang => [
      lang,
      [{ bv: SAMPLE_TEXT[lang] ?? SAMPLE_TEXT.eng!, wigni: 43, tavi: 3, muxli: 16 }],
    ]),
  );

export const SAMPLE_VERSE: ShowData = sampleShowData([REQUIRED_LANG]);

export const SAMPLE_LYRICS: ShowData = {
  lyrics: {
    title: 'Amazing Grace',
    text: 'Amazing grace, how sweet the sound that saved a wretch like me',
    langs: [
      { id: 'sample-1', label: '', text: 'Amazing grace, how sweet the sound that saved a wretch like me' },
      { id: 'sample-2', label: '', text: 'I once was lost, but now am found, was blind but now I see' },
    ],
  },
};

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

const asOne = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const asColor = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? (value.trim() ? (asHex(value) ?? fallback) : '') : fallback;

const asFrame = (value: unknown): Frame => {
  const raw = (value ?? {}) as Partial<Record<keyof Frame, unknown>>;
  const number = (key: keyof Frame, fallback: number) =>
    typeof raw[key] === 'number' ? (raw[key] as number) : fallback;

  return {
    x: clamp(number('x', 0), -1, 2, 0),
    y: clamp(number('y', 0), -1, 2, 0),
    w: clamp(number('w', 0.5), 0.005, 3, 0.5),
    h: clamp(number('h', 0.2), 0.002, 3, 0.2),
  };
};

const asLocalFile = (value: unknown): LocalFileMeta | null => {
  const raw = value as Partial<LocalFileMeta> | null;

  if (!raw || typeof raw.id !== 'string' || !raw.id) return null;

  return {
    id: raw.id,
    name: asString(raw.name),
    type: asString(raw.type),
    size: typeof raw.size === 'number' ? raw.size : 0,
  };
};

const asGradient = (value: unknown): Gradient => {
  const raw = (value ?? {}) as Partial<Gradient>;

  return {
    from: asColor(raw.from, DEFAULT_GRADIENT.from) || DEFAULT_GRADIENT.from,
    to: asColor(raw.to, DEFAULT_GRADIENT.to) || DEFAULT_GRADIENT.to,
    angle: clamp(raw.angle as number, -180, 180, DEFAULT_GRADIENT.angle),
  };
};

export const textStyleOf = (style: TextStyle): TextStyle => ({
  font: style.font,
  size: style.size,
  autoSize: style.autoSize,
  weight: style.weight,
  italic: style.italic,
  caps: style.caps,
  color: style.color,
  align: style.align,
  lineHeight: style.lineHeight,
  preserveLineBreaks: style.preserveLineBreaks,
  stripPunctuation: style.stripPunctuation,
  shadow: style.shadow,
  stroke: style.stroke,
  strokeWidth: style.strokeWidth,
  plateKind: style.plateKind,
  plateSpan: style.plateSpan,
  plateGap: style.plateGap,
  plate: style.plate,
  plateGradient: { ...style.plateGradient },
  plateStroke: style.plateStroke,
  plateStrokeWidth: style.plateStrokeWidth,
  radius: style.radius,
});

const asTextStyle = (raw: Record<string, unknown>): TextStyle => {
  const plate = asColor(raw.plate);

  return {
    font: asString(raw.font, DEFAULT_TEXT.font) || DEFAULT_TEXT.font,
    size: clamp(raw.size as number, 0.5, 40, DEFAULT_TEXT.size),
    autoSize: asOne(raw.autoSize, ['shrink', 'fixed'] as const, 'shrink'),
    weight: asOne(raw.weight, [400, 600, 700] as const, 400 as const),
    italic: raw.italic === true,
    caps: asOne(raw.caps, ['none', 'upper', 'lower'] as const, 'none'),
    color: asColor(raw.color, DEFAULT_TEXT.color) || DEFAULT_TEXT.color,
    align: asOne(raw.align, ['left', 'center', 'right'] as const, 'left'),
    lineHeight: clamp(raw.lineHeight as number, 0.8, 3, 1.2),
    preserveLineBreaks: raw.preserveLineBreaks === true,
    stripPunctuation: raw.stripPunctuation === true,
    shadow: asOne(raw.shadow, ['none', 'soft', 'strong'] as const, 'strong'),
    stroke: asColor(raw.stroke),
    strokeWidth: clamp(raw.strokeWidth as number, 0, 5, 0.3),
    plateKind: asOne(raw.plateKind, ['none', 'color', 'gradient'] as const, plate ? 'color' : 'none'),
    plateSpan: asOne(raw.plateSpan, ['box', 'line'] as const, 'box'),
    plateGap: clamp(raw.plateGap as number, 0, 1, 0.16),
    plate,
    plateGradient: asGradient(raw.plateGradient),
    plateStroke: asColor(raw.plateStroke),
    plateStrokeWidth: clamp(raw.plateStrokeWidth as number, 0, 5, 0.3),
    radius: clamp(raw.radius as number, 0, 50, 0),
  };
};

const asElement = (value: unknown, index: number): TemplateElement | null => {
  const raw = (value ?? {}) as Record<string, unknown>;
  const kind = raw.kind;
  const id = asString(raw.id) || `element-${index}`;
  const frame = asFrame(raw.frame);
  const opacity = clamp(raw.opacity as number, 0, 1, 1);
  const rotation = clamp(raw.rotation as number, -180, 180, 0);

  if (kind === 'text') {
    return {
      kind,
      id,
      frame,
      opacity,
      rotation,
      content: asString(raw.content),
      valign: asOne(raw.valign, ['top', 'middle', 'bottom'] as const, 'middle'),
      padding: clamp(raw.padding as number, 0, 20, 0),
      perLanguage: asOne(raw.perLanguage, ['stack', 'split'] as const, 'stack'),
      gap: clamp(raw.gap as number, 0, 20, 1.5),
      ...asTextStyle(raw),
      secondary: raw.secondary ? asTextStyle(raw.secondary as Record<string, unknown>) : null,
    };
  }

  if (kind === 'rect' || kind === 'ellipse' || kind === 'line') {
    return {
      kind,
      id,
      frame,
      opacity,
      rotation,
      fillKind: asOne(raw.fillKind, ['none', 'color', 'gradient', 'image'] as const, 'color'),
      fill: asColor(raw.fill),
      gradient: asGradient(raw.gradient),
      file: asLocalFile(raw.file),
      fit: asOne(raw.fit, ['contain', 'cover', 'fill'] as const, 'cover'),
      stroke: asColor(raw.stroke),
      strokeWidth: clamp(raw.strokeWidth as number, 0, 20, 0),
      radius: clamp(raw.radius as number, 0, 50, 0),
    };
  }

  if (kind === 'picture') {
    return {
      kind,
      id,
      frame,
      opacity,
      rotation,
      file: asLocalFile(raw.file),
      fit: asOne(raw.fit, ['contain', 'cover', 'fill'] as const, 'contain'),
      radius: clamp(raw.radius as number, 0, 50, 0),
    };
  }

  return null;
};

export type TemplateTarget = 'verses' | 'lyrics' | 'stream' | 'streamLyrics';

export const TEMPLATE_TARGETS: TemplateTarget[] = ['verses', 'lyrics', 'stream', 'streamLyrics'];

export const startingTemplate = (target: TemplateTarget): SlideTemplate =>
  target === 'streamLyrics'
    ? DEFAULT_STREAM_LYRIC_TEMPLATE
    : target === 'stream'
      ? DEFAULT_STREAM_TEMPLATE
      : target === 'lyrics'
        ? DEFAULT_LYRIC_TEMPLATE
        : DEFAULT_TEMPLATE;

export const asTemplate = (value: unknown, fallback: SlideTemplate = DEFAULT_TEMPLATE): SlideTemplate => {
  const raw = (value ?? {}) as { elements?: unknown };

  if (!Array.isArray(raw.elements)) return fallback;

  const elements = raw.elements
    .slice(0, MAX_ELEMENTS)
    .map(asElement)
    .filter((element): element is TemplateElement => element !== null);

  return { elements };
};

export const fontsNamedBy = (template: SlideTemplate | null | undefined): string[] =>
  (template?.elements ?? []).filter((el): el is TextElement => el.kind === 'text').map(el => el.font);

export const filesUsedBy = (template: SlideTemplate | null | undefined): LocalFileMeta[] => {
  const seen = new Map<string, LocalFileMeta>();

  for (const element of template?.elements ?? []) {
    if ('file' in element && element.file) seen.set(element.file.id, element.file);
  }

  return [...seen.values()];
};

export const referenceOf = (verses: Verse[], lang: Lang) => {
  const first = verses[0];
  const last = verses[verses.length - 1];

  return {
    book: apiBookName(first.wigni, lang),
    numbers: `${first.tavi}:${verses.length > 1 ? `${first.muxli}-${last.muxli}` : first.muxli}`,
  };
};

export interface TokenContext {
  showData: ShowData;
  order: Lang[];
  enabled: Partial<Record<Lang, boolean>>;
  versions: Partial<Record<Lang, string>>;
  lyricsLang?: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] as string);

const langsOf = (ctx: TokenContext): Lang[] =>
  ctx.order.filter(lang => ctx.enabled[lang] && (ctx.showData?.[lang]?.length ?? 0) > 0);

interface Pass {
  id: string;
  lines: string[];
  reference: string;
  book: string;
  numbers: string;
  translation: string;
}

const PUNCTUATION = /[.,;:!?"“”«»()[\]{}/\\…]/g;

const stripPunctuation = (text: string): string => text.replace(PUNCTUATION, '').replace(/[ \t]{2,}/g, ' ').trim();

const passesOf = (ctx: TokenContext, preserveLineBreaks: boolean, removePunctuation: boolean): Pass[] => {
  const lyrics = ctx.showData?.lyrics;

  if (lyrics) {
    const blocks = lyricBlocks(lyrics);
    const drawn = ctx.lyricsLang
      ? [blocks.find(block => block.id === ctx.lyricsLang) ?? blocks[0]].filter(Boolean)
      : blocks;

    return drawn.map(block => {
      const text = removePunctuation ? stripPunctuation(block.text) : block.text;

      return {
        id: block.id,
        lines: preserveLineBreaks
          ? text.split('\n').map(line => escapeHtml(line))
          : [escapeHtml(text.split('\n').join(' '))],
        reference: '',
        book: '',
        numbers: '',
        translation: '',
      };
    });
  }

  return langsOf(ctx).map(lang => {
    const verses = ctx.showData?.[lang] ?? [];
    const { book, numbers } = referenceOf(verses, lang);

    return {
      id: lang,
      lines: verses.map(verse => verse.bv),
      reference: escapeHtml(`${book} ${numbers}`),
      book: escapeHtml(book),
      numbers: escapeHtml(numbers),
      translation: escapeHtml(ctx.versions[lang] ?? ''),
    };
  });
};

const passFor = (named: string | undefined, current: Pass | null, passes: Pass[]): Pass | null => {
  if (named === undefined) return current ?? passes[0] ?? null;

  const slot = /^[1-9]$/.test(named) ? Number(named) : 0;

  if (slot) return passes[slot - 1] ?? null;

  return passes.find(pass => pass.id === named) ?? null;
};

const TOKEN = /\{\{\s*(verses|lyrics|reference|book|numbers|translation)(?:\s*:\s*([a-z]{2,8}|[1-9]))?\s*\}\}/gi;

const BLOCK = /\{\{\s*(?:verses|lyrics)(?:\s*:\s*([a-z]{2,8}|[1-9]))?\s*\}\}/i;

const UNNUMBERED = /\{\{\s*(?:verses|lyrics|reference|book|numbers|translation)\s*\}\}/i;

const inlineToken = (name: string, named: string | undefined, current: Pass | null, passes: Pass[]): string => {
  if (name === 'verses' || name === 'lyrics') return '';

  const pass = passFor(named, current, passes);

  if (!pass) return '';

  return pass[name as 'reference' | 'book' | 'numbers' | 'translation'] ?? '';
};

const fill = (part: string, current: Pass | null, passes: Pass[]): string => {
  let out = '';
  let last = 0;

  TOKEN.lastIndex = 0;

  for (let match = TOKEN.exec(part); match; match = TOKEN.exec(part)) {
    out += escapeHtml(part.slice(last, match.index));
    out += inlineToken(match[1].toLowerCase(), match[2]?.toLowerCase(), current, passes);
    last = match.index + match[0].length;
  }

  return out + escapeHtml(part.slice(last));
};

const renderPass = (content: string, current: Pass | null, passes: Pass[]): string[] => {
  const lines: string[] = [];

  for (const source of content.split('\n')) {
    const block = BLOCK.exec(source);

    if (!block) {
      const line = fill(source, current, passes);

      if (line.trim()) lines.push(line);

      continue;
    }

    const before = fill(source.slice(0, block.index), current, passes);
    const after = fill(source.slice(block.index + block[0].length), current, passes);
    const body = passFor(block[1]?.toLowerCase(), current, passes)?.lines ?? [];

    if (!body.length) {
      const line = `${before}${after}`;

      if (line.trim()) lines.push(line);

      continue;
    }

    for (const [index, verse] of body.entries()) {
      const head = index === 0 ? before : '';
      const tail = index === body.length - 1 ? after : '';

      lines.push(`${head}${verse}${tail}`);
    }
  }

  return lines;
};

export const renderBox = (
  content: string,
  ctx: TokenContext,
  preserveLineBreaks = false,
  stripPunctuation = false,
): string[][] => {
  const passes = passesOf(ctx, preserveLineBreaks, stripPunctuation);
  const repeats: (Pass | null)[] = UNNUMBERED.test(content) ? passes : [null];

  return repeats.map(pass => renderPass(content, pass, passes)).filter(lines => lines.length > 0);
};

export const renderTokens = (
  content: string,
  ctx: TokenContext,
  preserveLineBreaks = false,
  stripPunctuation = false,
): string[] => renderBox(content, ctx, preserveLineBreaks, stripPunctuation).flat();
