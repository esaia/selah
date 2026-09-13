import type { CSSProperties } from 'react';

export interface Colorway {
  plate?: string;
  ink?: string;
  accent?: string;
}

export interface StreamColors {
  verses: Colorway;
  lyrics: Colorway;
}

export const emptyStreamColors = (): StreamColors => ({ verses: {}, lyrics: {} });

export const LOOK_DEFAULTS: Record<string, Colorway> = {
  scrim: { plate: '#06080c', ink: '#ffffff' },
  solid: { plate: '#080a0e', ink: '#ffffff' },
  bands: { plate: '#0a0c10', ink: '#ffffff' },
  card: { plate: '#2d5547', ink: '#ffffff', accent: '#0a0c10' },
  split: { plate: '#121418', ink: '#ffffff', accent: '#c65e2b' },
  plain: { ink: '#ffffff' },
};

const FALLBACK_LOOK = 'scrim';

export const defaultsOf = (look: string): Colorway => LOOK_DEFAULTS[look] ?? LOOK_DEFAULTS[FALLBACK_LOOK];

export const knobsOf = (look: string): (keyof Colorway)[] => {
  const defaults = defaultsOf(look);

  return (['plate', 'ink', 'accent'] as const).filter(knob => defaults[knob] !== undefined);
};

const HEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/;

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

export const varsFor = (look: string, colors: Colorway): CSSProperties => {
  const vars: Record<string, string> = {};
  const set = asColorway(colors);

  for (const knob of knobsOf(look)) {
    const color = set[knob];

    if (color) vars[`--l3-${knob === 'ink' ? 'fg' : knob}`] = color;
  }

  return vars as CSSProperties;
};

export const migrated = (variant: string, colors: Colorway): { variant: string; colors: Colorway } => {
  if (variant !== 'bandsdark') return { variant, colors };

  return {
    variant: 'bands',
    colors: { plate: '#0a0c10', ink: '#ffffff', ...asColorway(colors) },
  };
};
