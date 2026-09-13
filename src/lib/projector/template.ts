/**
 * The one layout the operator draws themselves.
 *
 * The eight shipped looks (`looks.ts`) re-point knobs on a fixed markup tree:
 * they answer "where does the reference sit", and nothing more. This answers
 * "where does anything sit" — a list of boxes on a 16:9 frame, each holding
 * text, a shape or a picture. It is the ninth verse look and there is exactly
 * one of it, so an operator picks eight arrangements or builds their own.
 *
 * Every length here is a fraction or a percentage **of the frame**, never a
 * pixel. That is what lets one stored template come out right on a 4K
 * projector, in a preview the width of the right rail, and in a tile in the
 * settings dialog — the same property the `em` sizing gives the shipped looks.
 *
 * This file is pure. The drawing of it is `components/projector/CustomSlide.tsx`,
 * the editing of it `components/studio/TemplateEditor.tsx`, and the geometry a
 * drag works out is `lib/studio/canvas.ts`.
 */
import { apiBookName } from '@/lib/bible/passage';
import { lyricBlocks } from '@/lib/lyrics/langs';
import { defaultsOf, type Colorway } from '@/lib/lower3rd/colors';
import { asHex, withAlpha } from '@/lib/studio/color';
import { REQUIRED_LANG, type Align, type Lang, type LocalFileMeta, type ShowData, type Verse } from '@/lib/types';

/**
 * A ceiling, because a template is one jsonb column that rides in every slide
 * payload. Two dozen boxes is far more than a slide can usefully hold.
 */
export const MAX_ELEMENTS = 24;

/** Where an element sits, as fractions of the frame. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Base {
  id: string;
  frame: Frame;
  /** The whole element, seen through. Colours carry their own alpha as well. */
  opacity: number;
  /**
   * Degrees clockwise, about the box's own centre. The frame stays as it was —
   * this is how the box is *drawn*, not where it sits — so moving, aligning
   * and snapping all keep working on the square the operator laid out.
   */
  rotation: number;
}

export type AutoSize = 'shrink' | 'fixed';

/**
 * What a box does when the slide has several languages in it.
 *
 * `stack` runs them together inside the one rectangle, which is the plain
 * answer and the one that keeps a single language centred in the box however
 * many the template was built for. `split` gives each an equal share of the
 * rectangle instead — two languages, two plates, one above the other — and,
 * because the shares are cut from the box rather than fixed in the template,
 * one language left on its own gets the whole box back and sits where the pair
 * used to sit between them. That is the thing a pair of hand-placed boxes
 * cannot do: they leave a hole.
 */
export type PerLanguage = 'stack' | 'split';
export type VAlign = 'top' | 'middle' | 'bottom';
export type Caps = 'none' | 'upper' | 'lower';
export type Shadow = 'none' | 'soft' | 'strong';

/**
 * How a box's words look — and nothing about where the box is or what it says.
 *
 * Named on its own because a box split between two languages can carry two of
 * them: the original in one plate and its translation in another, set smaller
 * or in a quieter colour. Everything outside this — the frame, the content,
 * the padding, how the languages are arranged — belongs to the box as a whole
 * and cannot sensibly differ between its own shares.
 */
export interface TextStyle {
  /** A Tailwind class we ship, or `custom:<id>`; see `lib/projector/fonts.ts`. */
  font: string;
  /** The type size, as a percentage of the frame's height. */
  size: number;
  autoSize: AutoSize;
  weight: 400 | 700;
  italic: boolean;
  caps: Caps;
  color: string;
  align: Align;
  lineHeight: number;
  /**
   * A break the operator typed is drawn as one, instead of the usual rewrap:
   * off, the box's own words are joined into one line and left to wrap at
   * projector size the way every shipped look already does.
   */
  preserveLineBreaks: boolean;
  /**
   * Commas, periods, semicolons and the like dropped from the box's own
   * words before they are drawn — a look built for a sung line rather than a
   * read one, where the punctuation is a cue for the singer's eye and not the
   * congregation's.
   */
  stripPunctuation: boolean;
  shadow: Shadow;
  /** An outline round the letters. Empty is none, not black. */
  stroke: string;
  /** Its thickness, as a percentage of the frame's height. */
  strokeWidth: number;
  /** What the panel behind the words is painted with. */
  plateKind: PlateKind;
  /** One panel behind the box, or a band behind each line. */
  plateSpan: PlateSpan;
  /** Between the bands, in `em` of the words — so it scales with them. */
  plateGap: number;
  /** That panel's colour, when it is a flat one. */
  plate: string;
  plateGradient: Gradient;
  /** A border round the panel. Empty is none, not black. */
  plateStroke: string;
  /** Its thickness, as a percentage of the frame's height. */
  plateStrokeWidth: number;
  /** Corner radius of that panel, as a percentage of the frame's height. */
  radius: number;
}

export interface TextElement extends Base, TextStyle {
  kind: 'text';
  /** Literal words and the tokens below; see `renderTokens`. */
  content: string;
  valign: VAlign;
  /** Inside the box, as a percentage of the frame's height. */
  padding: number;
  perLanguage: PerLanguage;
  /** Between the shares in `split`, as a percentage of the frame's height. */
  gap: number;
  /**
   * How every share after the first is set, when the operator wants the
   * translation to look different from the original. Null is the ordinary
   * case: one style, and every share drawn in it.
   */
  secondary: TextStyle | null;
}

/**
 * A rectangle, an ellipse or a line.
 *
 * A line is a rectangle that happens to be thin — it is thickened by dragging
 * its edge, drawn round-ended, and takes no stroke of its own. That is one
 * fewer number in the inspector than a real line would need, and an operator
 * ruling off a reference is drawing a bar either way.
 */
/** How a picture sits in the box it fills. */
export type Fit = 'contain' | 'cover' | 'fill';

/**
 * What a shape is filled with.
 *
 * `image` is not the Picture element said twice: a picture is always a
 * rectangle, so an *ellipse* filled with one is the only way to get a round
 * photograph or a circular logo onto a slide.
 */
export type FillKind = 'none' | 'color' | 'gradient' | 'image';

/**
 * What the panel behind a line of text is painted with.
 *
 * No image: a picture behind words is a background, and the slide already has
 * one — offering it here would be a second, worse way to set it.
 */
export type PlateKind = 'none' | 'color' | 'gradient';

/**
 * Whether the plate is one panel behind the whole box, or a band behind each
 * line with the picture showing through between them.
 *
 * Bands are drawn as a stripe keyed to the line height rather than as a
 * background on the words — which is what lets a band run the full width of
 * the box while an inline one could only ever be as wide as its own words.
 * The same trick the shipped Bands look uses.
 */
export type PlateSpan = 'box' | 'line';

/** Two stops and an angle, which is as much gradient as a slide ever needs. */
export interface Gradient {
  from: string;
  to: string;
  /** Degrees clockwise, 0 pointing up — the same dial rotation uses. */
  angle: number;
}

export interface ShapeElement extends Base {
  kind: 'rect' | 'ellipse' | 'line';
  fillKind: FillKind;
  fill: string;
  gradient: Gradient;
  /** The picture, when the fill is one. Identity only, as everywhere else. */
  file: LocalFileMeta | null;
  fit: Fit;
  stroke: string;
  /** As a percentage of the frame's height, so it scales with everything else. */
  strokeWidth: number;
  /** Corner radius, likewise. Ignored by an ellipse and by a line. */
  radius: number;
}

/**
 * A picture from the operator's own media library.
 *
 * Identity only — the bytes stay in this browser's IndexedDB and reach an
 * output over the WebRTC path a background already uses. Nothing is uploaded.
 */
export interface PictureElement extends Base {
  kind: 'picture';
  file: LocalFileMeta | null;
  /** `contain` fits it whole, `cover` crops it to fill, `fill` stretches it. */
  fit: Fit;
  /** Corner radius, as a percentage of the frame's height. */
  radius: number;
}

export type TemplateElement = TextElement | ShapeElement | PictureElement;

export type ElementKind = TemplateElement['kind'];

/** Array order is z-order: the first element is furthest back. */
export interface SlideTemplate {
  elements: TemplateElement[];
}

// ------------------------------------------------------------------ defaults

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Ours: the brand yellow falling into the ink, which reads on any picture. */
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

/**
 * What a fresh Custom tile looks like: the standard slide, as boxes.
 *
 * A blank canvas is a worse starting point than a recognisable one — the
 * operator wanted the verse *somewhere else*, not nowhere, and dragging two
 * boxes that already say the right thing is the shortest way there.
 */
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

/**
 * What a fresh Custom song slide looks like: one box, centred, holding every
 * language the song is sung in.
 *
 * One box holding every language the song is sung in, because that is the
 * arrangement that survives a song having one language or three: they stack
 * inside the box they were already in rather than leaving a hole. An operator
 * who wants a plate each turns the same box to "a box each".
 */
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

/**
 * What a fresh custom stream look is: a strap across the foot of the frame.
 *
 * Low, and on a plate, because the overlay composites over live video — there
 * is no scrim under it and no photograph to sit on, so the words carry their
 * own ground or they are lost in whatever the camera is pointed at. The rest
 * of the frame stays empty and therefore transparent.
 *
 * Down in the last quarter rather than near the middle: a lower third is
 * named for where it sits, and a strap the speaker's face is behind is not
 * one. Clear of the very bottom too, which a broadcast crops.
 */
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

/** The same, for a song: no reference to carry, so the words take the room. */
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

/**
 * The colours a shipped strap is painted in, filled out with that look's own
 * defaults for whatever the operator has not set — the same fall-through
 * `varsFor` gives the CSS version.
 */
const paintOf = (variant: string, colors: Colorway): Required<Colorway> => ({
  plate: '',
  accent: '',
  ink: '#ffffff',
  ...defaultsOf(variant),
  ...colors,
});

/**
 * One of the six shipped strap looks, redrawn as boxes.
 *
 * Not a pixel clone — the box editor has no flex layout, so "Split bar"'s
 * side-by-side columns and "Reference card"'s reordered chip are approximated
 * with plain frames rather than reproduced exactly. The point is a
 * recognisable, already-coloured starting point to drag from, the same
 * reasoning behind `DEFAULT_TEMPLATE` itself.
 */
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
    // The chip rides above the verse, as the CSS look's `column-reverse` does.
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

/** A new element of each kind, dropped in the middle of the frame. */
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
    // A line is a bar: its own height is the thickness, so it is thickened by
    // dragging an edge like everything else rather than through a number in
    // the inspector that no other element has.
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

/**
 * John 3:16 in each language we hold, for drawing a look or a template
 * against when nothing is live.
 *
 * Per language rather than one English string repeated, because the thing
 * being judged is partly the script: a box that holds two lines of Latin holds
 * one and a half of Georgian, and an operator sizing a box against English
 * placeholders would size it wrong for the wall.
 */
const SAMPLE_TEXT: Partial<Record<Lang, string>> = {
  eng: 'For God so loved the world, that he gave his one and only Son.',
  geo: 'რადგან ისე შეიყვარა ღმერთმა ქვეყნიერება, რომ თავისი მხოლოდშობილი ძე გასცა.',
  ru: 'Ибо так возлюбил Бог мир, что отдал Сына Своего Единородного.',
  gr: 'Οὕτως γὰρ ἠγάπησεν ὁ Θεὸς τὸν κόσμον, ὥστε τὸν Υἱὸν τὸν μονογενῆ ἔδωκεν.',
  ae: 'لأنه هكذا أحب الله العالم حتى بذل ابنه الوحيد.',
  la: 'Sic enim dilexit Deus mundum, ut Filium suum unigenitum daret.',
};

/** A sample slide in the given languages, in the order they were asked for. */
export const sampleShowData = (langs: Lang[]): ShowData =>
  Object.fromEntries(
    langs.map(lang => [
      lang,
      [{ bv: SAMPLE_TEXT[lang] ?? SAMPLE_TEXT.eng!, wigni: 43, tavi: 3, muxli: 16 }],
    ]),
  );

/** One language's worth of it, which is what a look tile is judged on. */
export const SAMPLE_VERSE: ShowData = sampleShowData([REQUIRED_LANG]);

/**
 * A sample song for the editor's canvas, in two languages.
 *
 * Two rather than one, for the same reason the verse canvas draws every armed
 * language: a box laid out against a single block collides the first time a
 * song has a translation under it. A song with one language simply fills the
 * box the pair were sharing.
 */
export const SAMPLE_LYRICS: ShowData = {
  lyrics: {
    title: 'Amazing Grace',
    text: 'Amazing grace, how sweet the sound that saved a wretch like me',
    langs: [
      // Both in English, and two different lines: what is being judged here is
      // how two blocks sit together, and a second script in the box makes that
      // harder to read rather than truer — a church that sings in one language
      // still lays a template out against two.
      { id: 'sample-1', label: '', text: 'Amazing grace, how sweet the sound that saved a wretch like me' },
      { id: 'sample-2', label: '', text: 'I once was lost, but now am found, was blind but now I see' },
    ],
  },
};

// ------------------------------------------------------------------ coercion

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

const asOne = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** A colour we are willing to paint, or nothing. Empty means "no colour". */
const asColor = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? (value.trim() ? (asHex(value) ?? fallback) : '') : fallback;

const asFrame = (value: unknown): Frame => {
  const raw = (value ?? {}) as Partial<Record<keyof Frame, unknown>>;
  const number = (key: keyof Frame, fallback: number) =>
    typeof raw[key] === 'number' ? (raw[key] as number) : fallback;

  return {
    // Permissive about position — a full-bleed picture starts off the edge on
    // purpose — and strict about size, because a zero-height box is invisible
    // and undraggable, which reads as the element having been lost.
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

/** Two stops and an angle, read defensively. */
const asGradient = (value: unknown): Gradient => {
  const raw = (value ?? {}) as Partial<Gradient>;

  return {
    from: asColor(raw.from, DEFAULT_GRADIENT.from) || DEFAULT_GRADIENT.from,
    to: asColor(raw.to, DEFAULT_GRADIENT.to) || DEFAULT_GRADIENT.to,
    angle: clamp(raw.angle as number, -180, 180, DEFAULT_GRADIENT.angle),
  };
};

/**
 * A copy of how a box's words are set, with nothing else about the box.
 *
 * What the editor hands the second language when it is first given a style of
 * its own: the two start identical, and only what the operator then changes
 * differs. Built by naming the fields rather than by deleting the others, so
 * a field added to a box later does not leak into a style by accident.
 */
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

/** How one style's worth of a text box is read back, defensively. */
const asTextStyle = (raw: Record<string, unknown>): TextStyle => {
  const plate = asColor(raw.plate);

  return {
    font: asString(raw.font, DEFAULT_TEXT.font) || DEFAULT_TEXT.font,
    size: clamp(raw.size as number, 0.5, 40, DEFAULT_TEXT.size),
    autoSize: asOne(raw.autoSize, ['shrink', 'fixed'] as const, 'shrink'),
    // A stored 600 predates the Regular/Bold collapse — most typefaces here
    // ship no distinct semi-bold cut, so it read as bold anyway.
    weight: asOne(raw.weight === 600 ? 700 : raw.weight, [400, 700] as const, 400 as const),
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
    // A row written before a plate could be anything but a flat colour says
    // nothing here: a colour meant a plate, and no colour meant no plate.
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
      // Absent means one style for the whole box, which is what every template
      // written before a share could differ meant.
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
      // A row written before a shape could be anything but a flat colour says
      // nothing here, and a flat colour is what it meant.
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

  // A kind we have never shipped. Dropping it is the only safe reading: an
  // element we cannot draw is a hole in the slide either way, and keeping it
  // would mean carrying it in every payload forever.
  return null;
};

/**
 * A stored template, read defensively.
 *
 * A settings row written before this feature existed is `{}` and means "the
 * standard slide", which is what `DEFAULT_TEMPLATE` says in boxes — the same
 * reading `lookOf` gives an empty look. Every number is clamped and every
 * colour re-parsed, because this is one jsonb column and the console is not
 * the only thing that could ever have written it.
 */
/**
 * Which of the four kinds of slide a template is drawn for.
 *
 * The projector's two sit over a photograph and carry every armed language;
 * the stream's two composite over live video and carry one. Same document,
 * same editor, different ground under it — and an operator's library is kept
 * per kind, because a strap is no use on a wall.
 */
export type TemplateTarget = 'verses' | 'lyrics' | 'stream' | 'streamLyrics';

export const TEMPLATE_TARGETS: TemplateTarget[] = ['verses', 'lyrics', 'stream', 'streamLyrics'];

/** What a new template in that kind starts out as. */
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

  // An empty list is a template the operator emptied, not a missing one: it
  // draws a bare screen, which is a thing somebody may well want.
  return { elements };
};

/** Every typeface the template names, so `fontsUsedBy` can narrow the library. */
export const fontsNamedBy = (template: SlideTemplate | null | undefined): string[] =>
  (template?.elements ?? []).filter((el): el is TextElement => el.kind === 'text').map(el => el.font);

/** Every picture it draws, deduped — what the output has to fetch from a peer. */
export const filesUsedBy = (template: SlideTemplate | null | undefined): LocalFileMeta[] => {
  const seen = new Map<string, LocalFileMeta>();

  for (const element of template?.elements ?? []) {
    // A shape filled with a picture needs it fetched exactly as a picture
    // element does — an ellipse is how a round photograph is made.
    if ('file' in element && element.file) seen.set(element.file.id, element.file);
  }

  return [...seen.values()];
};

// -------------------------------------------------------------------- tokens

/**
 * The reference for one group, in one language: `John 3:16`, or `3:16-18` when
 * the card carries several verses. Split into book and number because a look
 * may want to set them apart, the way the lower third does.
 *
 * Lives here rather than in `Slide.tsx` because both renderers need it: the
 * shipped looks draw it as one line, and a template can put the two halves in
 * two different boxes.
 */
export const referenceOf = (verses: Verse[], lang: Lang) => {
  const first = verses[0];
  const last = verses[verses.length - 1];

  return {
    // `wigni` is the book number the API used for this language, counting from
    // Genesis = 1; the name arrays carry three group headers before Genesis, so
    // the same book sits two further along.
    book: apiBookName(first.wigni, lang),
    numbers: `${first.tavi}:${verses.length > 1 ? `${first.muxli}-${last.muxli}` : first.muxli}`,
  };
};

/** What a token is resolved against: the slide, and the languages it is armed in. */
export interface TokenContext {
  showData: ShowData;
  order: Lang[];
  enabled: Partial<Record<Lang, boolean>>;
  versions: Partial<Record<Lang, string>>;
  /**
   * The one song language this reader draws, when it draws only one. The
   * stream carries a single language — the song says which — so a box there
   * repeats for nothing however many the song is sung in.
   */
  lyricsLang?: string;
}

/**
 * Verse text is the API's own HTML, so a line is HTML too — which means the
 * operator's literal words have to be escaped on the way in.
 */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] as string);

/** The armed languages, in the operator's order, that this slide actually has. */
const langsOf = (ctx: TokenContext): Lang[] =>
  ctx.order.filter(lang => ctx.enabled[lang] && (ctx.showData?.[lang]?.length ?? 0) > 0);

/**
 * One language's worth of a slide: everything a token can ask for.
 *
 * Verses and songs answer the same questions in different ways — a song has no
 * reference and its languages are its own rather than the armed ones — so they
 * are flattened to this and the tokens never learn the difference. `lines` and
 * every field are finished HTML: verse text is the API's own markup, and a
 * song's words are plain text and are escaped here.
 */
interface Pass {
  /** A language code, or a song language's id. What a `:code` token matches. */
  id: string;
  lines: string[];
  reference: string;
  book: string;
  numbers: string;
  translation: string;
}

/**
 * Sentence punctuation dropped from a song's own words — the marks a singer
 * reads off a lead sheet, not something a congregation reading the wall needs.
 * Apostrophes and hyphens survive: they sit inside a word rather than between
 * words, and stripping them would fuse "don't" and "wretch-like" into one.
 */
const PUNCTUATION = /[.,;:!?"“”«»()[\]{}/\\…]/g;

const stripPunctuation = (text: string): string => text.replace(PUNCTUATION, '').replace(/[ \t]{2,}/g, ' ').trim();

/**
 * The slide, one language at a time, in the order it will be drawn.
 *
 * `preserveLineBreaks` and `stripPunctuation` are the box's own, not the
 * song's: a box that has asked to keep line breaks draws each of the song's
 * as a line of its own, and a box that has not joins them into one line and
 * lets it wrap at projector size, exactly as the shipped looks do. Only a
 * song's own words are ever touched — verse text is the API's own HTML, and
 * stripping punctuation out of markup is how a slash eats a closing tag.
 */
const passesOf = (ctx: TokenContext, preserveLineBreaks: boolean, removePunctuation: boolean): Pass[] => {
  const lyrics = ctx.showData?.lyrics;

  if (lyrics) {
    // Every language the song is sung in. They are the song's own — named per
    // song, no two songs agreeing — so a lyric template never names one: it
    // says `{{lyrics}}` and the box repeats for however many the song has,
    // which is why there is no numbered form to offer.
    const blocks = lyricBlocks(lyrics);
    // The stream is pointed at one of them; the projector draws them all.
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

/**
 * Which language a token means.
 *
 * Three ways to say it:
 *
 * - **Nothing** — the language of the repeat this box is being drawn in; see
 *   `renderBox`. It is what makes `{{reference}}` come out in Georgian under
 *   the Georgian verse instead of in whichever language is armed first.
 * - **A number** — the first, second or third language *as the operator has
 *   them armed*, or as the song lists them. A template says "put the second
 *   language here", and it keeps meaning that when the church swaps Russian
 *   for Greek next Sunday.
 * - **A code** — `eng`, `geo`. Pins one, for a template only ever run one way.
 *
 * A slot nothing is armed in, or a code that is not up, means nothing rather
 * than falling back: a template that quietly printed Georgian where it was
 * told English would be worse than one that printed nothing.
 */
const passFor = (named: string | undefined, current: Pass | null, passes: Pass[]): Pass | null => {
  if (named === undefined) return current ?? passes[0] ?? null;

  const slot = /^[1-9]$/.test(named) ? Number(named) : 0;

  if (slot) return passes[slot - 1] ?? null;

  return passes.find(pass => pass.id === named) ?? null;
};

/**
 * The words a box can ask for.
 *
 * `lyrics` is an alias of `verses` — they are the same question asked of the
 * two kinds of slide, and a template built for one that is pointed at the
 * other should still draw the words rather than nothing.
 */
const TOKEN = /\{\{\s*(verses|lyrics|reference|book|numbers|translation)(?:\s*:\s*([a-z]{2,8}|[1-9]))?\s*\}\}/gi;

/** Just the block token: the only one that can turn a line into several. */
const BLOCK = /\{\{\s*(?:verses|lyrics)(?:\s*:\s*([a-z]{2,8}|[1-9]))?\s*\}\}/i;

/** A token with no language on it, which is what makes a box repeat. */
const UNNUMBERED = /\{\{\s*(?:verses|lyrics|reference|book|numbers|translation)\s*\}\}/i;

/** An inline token: one language's worth of words, on the line it sits in. */
const inlineToken = (name: string, named: string | undefined, current: Pass | null, passes: Pass[]): string => {
  // A second block token on a line the first one already split. One block per
  // line is all the arrangement can mean, so the rest comes out empty.
  if (name === 'verses' || name === 'lyrics') return '';

  const pass = passFor(named, current, passes);

  if (!pass) return '';

  return pass[name as 'reference' | 'book' | 'numbers' | 'translation'] ?? '';
};

/**
 * The literal words and the inline tokens of one stretch of a line, as HTML.
 * What the operator typed is escaped; what a token gives back is finished.
 */
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

/** The box's content resolved for one language — or for none in particular. */
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

/**
 * A text box's content, resolved into the lines it draws — **once per
 * language it repeats for.**
 *
 * That repeat is the whole of the multi-language story. A box holding an
 * unnumbered token is drawn once for each language on the slide, and the bare
 * token resolves to the language of the repeat it is in: `{{verses}}` gives
 * each language's verses and `{{reference}}` gives each language's reference,
 * so `{{book}} {{numbers}} ({{translation}})` comes out right three times
 * rather than three times in English.
 *
 * A box whose tokens are all numbered — `{{verses:2}}` — is pinned to that
 * slot and drawn once, which is how each language gets a box of its own with
 * its own font and colour. A box of plain words is drawn once too.
 *
 * What the caller does with the repeats is `TextElement.perLanguage`: stack
 * them inside the one rectangle, or give each an equal share of it.
 *
 * `{{verses}}` is also the one token that can turn a single repeat into
 * several lines, one per verse; whatever was typed around it opens the first
 * and closes the last. Everything else substitutes where it stands, a blank
 * line is dropped, and a repeat with no lines is dropped with it — which is
 * what lets one template serve a one-language operator and a three-language
 * one without being two templates.
 */
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

/** Every line the box draws, with the repeats run together. */
export const renderTokens = (
  content: string,
  ctx: TokenContext,
  preserveLineBreaks = false,
  stripPunctuation = false,
): string[] => renderBox(content, ctx, preserveLineBreaks, stripPunctuation).flat();
