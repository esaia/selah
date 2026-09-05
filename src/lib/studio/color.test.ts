import { describe, expect, it } from 'vitest';

import { alphaOf, asHex, hexToHsv, hsvToHex, isLight, rgbToHex, withAlpha } from './color';

describe('asHex', () => {
  it('takes a hex however it was typed', () => {
    expect(asHex('#A74A1B')).toBe('#a74a1b');
    expect(asHex(' a74a1b ')).toBe('#a74a1b');
  });

  it('expands the three-digit form', () => {
    expect(asHex('#fc5')).toBe('#ffcc55');
  });

  it('keeps an alpha, and drops one that says nothing', () => {
    expect(asHex('#a74a1b80')).toBe('#a74a1b80');
    expect(asHex('#a74a1bff')).toBe('#a74a1b');
    expect(asHex('#fc58')).toBe('#ffcc5588');
  });

  it('refuses anything that is not a colour', () => {
    expect(asHex('')).toBeUndefined();
    expect(asHex('red')).toBeUndefined();
    expect(asHex('#12345')).toBeUndefined();
    expect(asHex('#1234567')).toBeUndefined();
  });
});

describe('hsv', () => {
  it('round-trips every stored colour it is given', () => {
    for (const hex of ['#000000', '#ffffff', '#a74a1b', '#2d5547', '#e9cece', '#0a0c10', '#fcdf50']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });

  it('reads the primaries as the hues they are', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv('#00ff00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hexToHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 });
  });

  it('reports no saturation for grey and no value for black', () => {
    expect(hexToHsv('#808080').s).toBe(0);
    expect(hexToHsv('#000000').v).toBe(0);
  });

  it('wraps a hue that has been dragged off either end of the rail', () => {
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#ff0000');
    expect(hsvToHex({ h: -60, s: 1, v: 1 })).toBe('#ff00ff');
  });

  it('clamps a square dragged past its own corner', () => {
    expect(hsvToHex({ h: 0, s: 2, v: 2 })).toBe('#ff0000');
    expect(hsvToHex({ h: 0, s: -1, v: -1 })).toBe('#000000');
  });
});

describe('rgbToHex', () => {
  it('pads a channel that is one digit', () => {
    expect(rgbToHex(0, 10, 255)).toBe('#000aff');
  });
});

describe('isLight', () => {
  it('knows what to print on it', () => {
    expect(isLight('#fcdf50')).toBe(true);
    expect(isLight('#e9cece')).toBe(true);
    expect(isLight('#191818')).toBe(false);
    expect(isLight('#a74a1b')).toBe(false);
  });
});

describe('alpha', () => {
  it('reads a colour with no alpha as fully opaque', () => {
    expect(alphaOf('#a74a1b')).toBe(1);
    expect(alphaOf('nonsense')).toBe(1);
  });

  it('round-trips the alpha it writes', () => {
    for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
      expect(alphaOf(withAlpha('#a74a1b', alpha))).toBeCloseTo(alpha, 2);
    }
  });

  it('writes solid as the plain six digits, and replaces an alpha rather than appending one', () => {
    expect(withAlpha('#a74a1b80', 1)).toBe('#a74a1b');
    expect(withAlpha('#a74a1b80', 0)).toBe('#a74a1b00');
  });

  it('reads the colour under the alpha, not through it', () => {
    expect(hexToHsv('#ff000080')).toEqual(hexToHsv('#ff0000'));
    expect(isLight('#fcdf5000')).toBe(true);
  });
});
