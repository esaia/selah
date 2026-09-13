export interface Look {
  value: string;
  label: string;
  divisor: number;
  heightRatio: number;
  selfFit?: boolean;
}

export const CUSTOM_LOOK = 'custom';

export const customLook = (id: string) => `${CUSTOM_LOOK}:${id}`;

export const isCustomLook = (value: string | undefined): boolean =>
  value === CUSTOM_LOOK || (value ?? '').startsWith(`${CUSTOM_LOOK}:`);

export const templateIdOf = (value: string | undefined): string =>
  (value ?? '').startsWith(`${CUSTOM_LOOK}:`) ? value!.slice(CUSTOM_LOOK.length + 1) : '';

export type ScaleMode = 'both' | 'none';

export const SCALE_MODES: { value: ScaleMode; label: string }[] = [
  { value: 'both', label: 'Scale to fit' },
  { value: 'none', label: 'Hold the size' },
];

export const MIN_TEXT_SIZE = 4;
export const MAX_TEXT_SIZE = 30;

export const DEFAULT_TEXT_SIZE = 18;
export const DEFAULT_VERSE_TEXT_SIZE = 6;

export const asScaleMode = (value: unknown): ScaleMode =>
  SCALE_MODES.some(mode => mode.value === value) ? (value as ScaleMode) : 'both';

export const clampTextSize = (value: number, fallback = DEFAULT_TEXT_SIZE): number =>
  Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, Math.round(value) || fallback));

const VERSE_FIT = { divisor: 13, heightRatio: 0.86 };

const LYRIC_FIT = { divisor: 4, heightRatio: 0.86 };

export const VERSE_LOOKS: Look[] = [
  { value: 'below', label: 'Reference below', ...VERSE_FIT },
  { value: 'heading', label: 'Heading above', ...VERSE_FIT },
  { value: 'headingbelow', label: 'Heading below', ...VERSE_FIT },
  { value: 'overline', label: 'Overline', ...VERSE_FIT },
  { value: 'plate', label: 'On a plate', divisor: 14, heightRatio: 0.8 },
  { value: 'rule', label: 'Ruled off', ...VERSE_FIT },
  { value: 'chip', label: 'Reference chip', ...VERSE_FIT },
  { value: CUSTOM_LOOK, label: 'Custom', ...VERSE_FIT, selfFit: true },
];

export const LYRIC_LOOKS: Look[] = [
  { value: 'fill', label: 'Fill the screen', ...LYRIC_FIT },
  { value: 'lower', label: 'Lower third', divisor: 6, heightRatio: 0.42 },
  { value: 'upper', label: 'Upper third', divisor: 6, heightRatio: 0.42 },
  { value: 'plate', label: 'On a plate', divisor: 5, heightRatio: 0.76 },
  { value: 'column', label: 'Narrow column', divisor: 6, heightRatio: 0.86 },
  { value: CUSTOM_LOOK, label: 'Custom', ...LYRIC_FIT, selfFit: true },
];

export const DEFAULT_VERSE_LOOK = 'below';
export const DEFAULT_LYRIC_LOOK = 'fill';

export const lookOf = (value: string | undefined, lyrics: boolean): Look => {
  const looks = lyrics ? LYRIC_LOOKS : VERSE_LOOKS;
  const fallback = lyrics ? DEFAULT_LYRIC_LOOK : DEFAULT_VERSE_LOOK;
  const wanted = isCustomLook(value) ? CUSTOM_LOOK : value;

  return looks.find(look => look.value === wanted) ?? looks.find(look => look.value === fallback)!;
};

export const fitTo = (
  look: Look,
  height: number,
  { cap = Infinity, min = 8, scale = 'both' as ScaleMode, size = 0 } = {},
) => {
  const ceiling = Math.max(min, Math.min(cap, Math.round(height / look.divisor)));
  const available = height * look.heightRatio;

  const chosen = size ? Math.max(min, Math.round((height * size) / 100)) : 0;

  if (scale === 'both') return { available, min, max: chosen || ceiling };

  if (!chosen) return { available, min, max: ceiling };

  return { available, min: chosen, max: chosen };
};
