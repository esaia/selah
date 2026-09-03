/**
 * The layouts `/show` can draw a slide in.
 *
 * The app ships variants rather than an editor: an operator picks the look that
 * suits their room, they do not build one. So a look is a row here and a block
 * of CSS in `globals.css`, exactly as a lower-third variant is — the markup in
 * `Slide.tsx` is the same for all of them.
 *
 * It is data rather than pure CSS because a look changes how the text is
 * *fitted* and not only how it is painted: one that sits low on the screen has
 * less height to grow into. Keeping those numbers here is what lets the
 * projector and the console's preview panel scale the same slide the same way.
 */
export interface Look {
  value: string;
  label: string;
  /** Ceiling on the font, as a fraction of the screen: height / divisor. */
  divisor: number;
  /** How much of the screen height the block may fill. */
  heightRatio: number;
}

/**
 * How a song slide is sized. Scaling to fit is what makes one line fill the
 * screen and six lines still fit on it; it is also what makes the words breathe
 * in and out across a verse, which is exactly what some rooms do not want. The
 * answer to that is one steady size — the operator's own, see `lyricsSize` —
 * and there is no third useful answer between the two.
 */
export type ScaleMode = 'both' | 'none';

export const SCALE_MODES: { value: ScaleMode; label: string }[] = [
  { value: 'both', label: 'Scale text up or down to fit' },
  { value: 'none', label: 'No text scaling' },
];

/** The chosen size, as a percentage of the screen height. */
export const MIN_TEXT_SIZE = 4;
export const MAX_TEXT_SIZE = 24;
export const DEFAULT_TEXT_SIZE = 9;

export const asScaleMode = (value: unknown): ScaleMode =>
  SCALE_MODES.some(mode => mode.value === value) ? (value as ScaleMode) : 'both';

export const clampTextSize = (value: number): number =>
  Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, Math.round(value) || DEFAULT_TEXT_SIZE));

/** Today's fit: a verse may fill most of the screen, capped at height/13. */
const VERSE_FIT = { divisor: 13, heightRatio: 0.86 };

/** Lyrics are short and want to be large, so the ceiling is far higher. */
const LYRIC_FIT = { divisor: 4, heightRatio: 0.86 };

export const VERSE_LOOKS: Look[] = [
  { value: 'below', label: 'Reference below', ...VERSE_FIT },
  { value: 'corner', label: 'Reference in corner', ...VERSE_FIT },
  { value: 'heading', label: 'Heading above', ...VERSE_FIT },
  { value: 'headingbelow', label: 'Heading below', ...VERSE_FIT },
  { value: 'overline', label: 'Overline', ...VERSE_FIT },
  // The plate's padding is part of the block, so it needs a little more room.
  { value: 'plate', label: 'On a plate', divisor: 14, heightRatio: 0.8 },
  { value: 'rule', label: 'Ruled off', ...VERSE_FIT },
  { value: 'chip', label: 'Reference chip', ...VERSE_FIT },
];

export const LYRIC_LOOKS: Look[] = [
  { value: 'fill', label: 'Fill the screen', ...LYRIC_FIT },
  // Sitting off centre leaves half the picture clear — low for a room whose
  // screen is high, high for one where the band stands in front of it. Both
  // give up the same height, which is what keeps them the same size.
  { value: 'lower', label: 'Lower third', divisor: 6, heightRatio: 0.42 },
  { value: 'upper', label: 'Upper third', divisor: 6, heightRatio: 0.42 },
  { value: 'plate', label: 'On a plate', divisor: 5, heightRatio: 0.76 },
  { value: 'column', label: 'Narrow column', divisor: 6, heightRatio: 0.86 },
];

export const DEFAULT_VERSE_LOOK = 'below';
export const DEFAULT_LYRIC_LOOK = 'fill';

/**
 * The look for a stored value, falling back to the default. A settings row
 * written before this feature existed carries an empty string, and a payload
 * from an older console carries nothing at all; both mean "the standard slide".
 */
export const lookOf = (value: string | undefined, lyrics: boolean): Look => {
  const looks = lyrics ? LYRIC_LOOKS : VERSE_LOOKS;
  const fallback = lyrics ? DEFAULT_LYRIC_LOOK : DEFAULT_VERSE_LOOK;

  return looks.find(look => look.value === value) ?? looks.find(look => look.value === fallback)!;
};

/**
 * The bounds `fitText` should use for `look` inside a box `height` pixels tall.
 *
 * The projector measures against a screen and the console's preview panel
 * against a thumbnail, so each passes its own floor and ceiling in pixels; the
 * look decides the rest. Sharing this is what keeps a slide that fills the
 * projector filling the preview too.
 */
export const fitTo = (
  look: Look,
  height: number,
  { cap = Infinity, min = 8, scale = 'both' as ScaleMode, size = 0 } = {},
) => {
  const ceiling = Math.max(min, Math.min(cap, Math.round(height / look.divisor)));
  const available = height * look.heightRatio;

  // `both` is the fit this app has always run: anywhere between the floor and
  // the ceiling, whatever the slide needs.
  if (scale === 'both' || !size) return { available, min, max: ceiling };

  // The operator's own size, held as a share of the screen so it means the same
  // thing on a projector, in the preview panel and in a tile. The search has
  // nowhere to go: a slide too long for it overflows, which is what "no
  // scaling" means everywhere else it is offered.
  const chosen = Math.max(min, Math.round((height * size) / 100));

  return { available, min: chosen, max: chosen };
};
