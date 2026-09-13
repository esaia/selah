
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const asHex = (value: string): string | undefined => {
  const raw = value.trim().replace(/^#/, '').toLowerCase();

  const full = /^[0-9a-f]{3,4}$/.test(raw) ? [...raw].map(digit => digit + digit).join('') : raw;

  if (!/^([0-9a-f]{6}|[0-9a-f]{8})$/.test(full)) return undefined;

  return `#${full.endsWith('ff') && full.length === 8 ? full.slice(0, 6) : full}`;
};

export const alphaOf = (hex: string): number => {
  const value = asHex(hex);

  return value && value.length === 9 ? parseInt(value.slice(7), 16) / 255 : 1;
};

export const withAlpha = (hex: string, alpha: number): string => {
  const value = (asHex(hex) ?? '#000000').slice(0, 7);
  const a = Math.round(clamp(alpha) * 255);

  return a === 255 ? value : `${value}${a.toString(16).padStart(2, '0')}`;
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const value = asHex(hex) ?? '#000000';

  return [1, 3, 5].map(at => parseInt(value.slice(at, at + 2), 16)) as [number, number, number];
};

export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map(channel => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0')).join('')}`;

export const hexToHsv = (hex: string): Hsv => {
  const [r, g, b] = hexToRgb(hex).map(channel => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const span = max - min;

  const h =
    span === 0
      ? 0
      : max === r
        ? 60 * (((g - b) / span + 6) % 6)
        : max === g
          ? 60 * ((b - r) / span + 2)
          : 60 * ((r - g) / span + 4);

  return { h, s: max === 0 ? 0 : span / max, v: max };
};

export const hsvToHex = ({ h, s, v }: Hsv): string => {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s);
  const val = clamp(v);

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  const [r, g, b] = (
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x]
  ).map(channel => (channel + m) * 255);

  return rgbToHex(r, g, b);
};

export const isLight = (hex: string): boolean => {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    const c = channel / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4;
};
