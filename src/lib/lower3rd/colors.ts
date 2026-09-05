import type { CSSProperties } from 'react';

/**
 * The colours a stream look is painted in, held apart from the look itself.
 *
 * A layout and a colourway are two different questions, and the picker used to
 * answer them together: "White bands" and "Black bands" were one arrangement
 * listed twice because the plate and the ink differed. So the arrangement is
 * the look, and this is what it is painted in — every look takes the same three
 * knobs, and any of them left unset falls through to the look's own default in
 * `globals.css`. That fall-through is the whole migration story: an operator
 * who never opens the swatches keeps exactly the look they had.
 */
export interface Colorway {
  /** The plate the words sit on — the bar, the bands, the card's slab. */
  plate?: string;
  /** The words themselves. The reference follows it, dimmed. */
  ink?: string;
  /** The one detail that is neither: the card's chip, the split bar's rule. */
  accent?: string;
}

/** Verses and lyrics keep their own, as they keep their own look and type. */
export interface StreamColors {
  verses: Colorway;
  lyrics: Colorway;
}

export const emptyStreamColors = (): StreamColors => ({ verses: {}, lyrics: {} });

/**
 * What each look is painted in when the operator has said nothing — the same
 * values the stylesheet declares, so a swatch opens showing the colour that is
 * actually on the wall rather than an arbitrary black.
 *
 * A look with no `plate` has none to pick: "Text only" is text straight on the
 * video, and giving it a plate would make it a different look.
 */
export const LOOK_DEFAULTS: Record<string, Colorway> = {
  scrim: { plate: '#06080c', ink: '#ffffff' },
  solid: { plate: '#080a0e', ink: '#ffffff' },
  bands: { plate: '#ffffff', ink: '#14171c' },
  card: { plate: '#2d5547', ink: '#ffffff', accent: '#0a0c10' },
  split: { plate: '#121418', ink: '#ffffff', accent: '#c65e2b' },
  plain: { ink: '#ffffff' },
};

const FALLBACK_LOOK = 'scrim';

export const defaultsOf = (look: string): Colorway => LOOK_DEFAULTS[look] ?? LOOK_DEFAULTS[FALLBACK_LOOK];

/** The knobs this look actually uses, in the order the panel shows them. */
export const knobsOf = (look: string): (keyof Colorway)[] => {
  const defaults = defaultsOf(look);

  return (['plate', 'ink', 'accent'] as const).filter(knob => defaults[knob] !== undefined);
};

const HEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/;

/**
 * A colour we are willing to put in a stylesheet. Only a hex, six digits or
 * eight: the value ends up inside a `style` attribute on the output, and a
 * stored string is not the place to accept arbitrary CSS.
 *
 * The eighth and ninth digits are the alpha, which is how a plate is made to
 * let the video through — a bar at two thirds is a look of its own, and the
 * alternative was a second knob storing a number the stylesheet would have had
 * to recombine with the colour anyway.
 */
const asColor = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  const hex = value.trim().toLowerCase();

  return HEX.test(hex) ? hex : undefined;
};

export const asColorway = (value: unknown): Colorway => {
  const raw = (value ?? {}) as Partial<Record<keyof Colorway, unknown>>;

  return Object.fromEntries(
    (['plate', 'ink', 'accent'] as const)
      .map(knob => [knob, asColor(raw[knob])])
      .filter(([, color]) => color !== undefined),
  );
};

export const asStreamColors = (value: unknown): StreamColors => {
  const raw = (value ?? {}) as { verses?: unknown; lyrics?: unknown };

  return { verses: asColorway(raw.verses), lyrics: asColorway(raw.lyrics) };
};

/**
 * The custom properties the bar carries, and no more.
 *
 * Only what the operator has actually set, and only the knobs this look uses:
 * an accent left over from the split bar must not be handed to a look that has
 * no rule to paint with it, and a knob nobody has touched has to stay absent so
 * the stylesheet's own value wins.
 */
export const varsFor = (look: string, colors: Colorway): CSSProperties => {
  const vars: Record<string, string> = {};
  const set = asColorway(colors);

  for (const knob of knobsOf(look)) {
    const color = set[knob];

    if (color) vars[`--l3-${knob === 'ink' ? 'fg' : knob}`] = color;
  }

  return vars as CSSProperties;
};

/**
 * The dark colourway of the bands look, from back when it was a look of its
 * own. A row written then names a variant the picker no longer lists, so it is
 * read as the arrangement it always was plus the colours it was painted in —
 * and only where the operator has not since picked their own.
 */
export const migrated = (variant: string, colors: Colorway): { variant: string; colors: Colorway } => {
  if (variant !== 'bandsdark') return { variant, colors };

  return {
    variant: 'bands',
    colors: { plate: '#0a0c10', ink: '#ffffff', ...asColorway(colors) },
  };
};
