import { describe, expect, it } from 'vitest';

import {
  asCustomFonts,
  BUILT_IN_FONTS,
  defaultLabelOf,
  DEFAULT_FONT,
  familyNameOf,
  fontClassOf,
  fontFamilyOf,
  fontLabelOf,
  fontOptions,
  fontsUsedBy,
  googleCssUrl,
  isFontUrl,
  MAX_CUSTOM_FONTS,
  parseSource,
  valueOf,
  type CustomFont,
} from './fonts';

const google: CustomFont = { id: 'custom-1', label: 'Our Sunday face', kind: 'google', source: 'Rubik' };
const hosted: CustomFont = { id: 'custom-2', label: 'Brand', kind: 'url', source: 'https://cdn.example.com/brand.woff2' };
const library = [google, hosted];

describe('resolving a stored value', () => {
  it('hands a shipped face straight back as a class, with no inline family', () => {
    expect(fontClassOf('font-montserrat', library)).toBe('font-montserrat');
    expect(fontFamilyOf('font-montserrat', library)).toBeUndefined();
  });

  it('gives an added face a family and no class, so the two never fight', () => {
    expect(fontClassOf(valueOf(google), library)).toBe('');
    expect(fontFamilyOf(valueOf(google), library)).toBe("'Rubik', sans-serif");
    expect(fontFamilyOf(valueOf(hosted), library)).toBe("'selah-custom-2', sans-serif");
  });

  // The ordinary way to get here: the operator deleted a font that a picker
  // was still set to. An unknown string is not inert — left on the element it
  // is a live Tailwind utility that may mean something else entirely.
  it('falls back when the font has since been removed', () => {
    expect(fontClassOf(valueOf(google), [])).toBe(DEFAULT_FONT);
    expect(fontFamilyOf(valueOf(google), [])).toBeUndefined();
  });

  it('falls back for a class we do not ship', () => {
    expect(fontClassOf('font-comic', library)).toBe(DEFAULT_FONT);
    expect(fontClassOf('', library)).toBe(DEFAULT_FONT);
  });

  // A settings row written before this existed passes no library at all.
  it('needs no library to resolve a shipped face', () => {
    expect(fontClassOf('font-banner')).toBe('font-banner');
  });
});

describe('the CSS family name', () => {
  // A webfont cannot be aliased — local() matches installed fonts only — so a
  // Google face has to be drawn under the name Google declares for it.
  it('is the family Google itself declares, for a Google face', () => {
    expect(familyNameOf(google)).toBe('Rubik');
  });

  // Renaming a font must not orphan the @font-face already in the document.
  it('follows the id and not the label, for a hosted file', () => {
    expect(familyNameOf(hosted)).toBe('selah-custom-2');
    expect(familyNameOf({ ...hosted, label: 'Renamed' })).toBe('selah-custom-2');
  });
});

describe('what the operator sees', () => {
  it('lists the shipped faces and then their own', () => {
    const options = fontOptions(library);

    expect(options).toHaveLength(BUILT_IN_FONTS.length + 2);
    expect(options.at(-2)).toEqual({ value: 'custom:custom-1', label: 'Our Sunday face' });
  });

  it('names a font in the summary row without leaking the stored value', () => {
    expect(fontLabelOf(valueOf(hosted), library)).toBe('Brand');
    // The parenthesised script list belongs in a picker, not in a summary.
    expect(fontLabelOf('font-notosans', library)).toBe('Noto Sans');
    expect(fontLabelOf(valueOf(google), [])).toBe('custom:custom-1'.replace('font-', ''));
  });
});

describe('what may be stored', () => {
  it('keeps a well-formed row', () => {
    expect(asCustomFonts(library)).toEqual(library);
  });

  it('is empty for anything that is not a list', () => {
    expect(asCustomFonts(null)).toEqual([]);
    expect(asCustomFonts({ id: 'x' })).toEqual([]);
    expect(asCustomFonts('Rubik')).toEqual([]);
  });

  // A source that would not load is worse than no font: the picker offers it,
  // the operator picks it, and the wall quietly shows the fallback face.
  it('drops entries whose source could never load', () => {
    expect(asCustomFonts([{ ...hosted, source: 'http://cdn.example.com/brand.woff2' }])).toEqual([]);
    expect(asCustomFonts([{ ...hosted, source: 'https://cdn.example.com/brand.css' }])).toEqual([]);
    expect(asCustomFonts([{ ...google, source: 'Rubik); @import evil' }])).toEqual([]);
    expect(asCustomFonts([{ ...google, kind: 'sideload' }])).toEqual([]);
  });

  it('keeps one entry per id, and stops at the ceiling', () => {
    expect(asCustomFonts([google, { ...google, label: 'Twin' }])).toEqual([google]);
    expect(
      asCustomFonts(Array.from({ length: MAX_CUSTOM_FONTS + 4 }, (_, n) => ({ ...google, id: `custom-${n}` }))),
    ).toHaveLength(MAX_CUSTOM_FONTS);
  });

  it('falls back to the source when a font was saved with no name', () => {
    expect(asCustomFonts([{ ...google, label: '' }])[0].label).toBe('Rubik');
  });
});

describe('a link we are willing to write into an @font-face', () => {
  it('takes an https font file and nothing else', () => {
    expect(isFontUrl('https://cdn.example.com/a.woff2')).toBe(true);
    expect(isFontUrl('https://cdn.example.com/a.otf?v=2')).toBe(true);
    expect(isFontUrl('http://cdn.example.com/a.woff2')).toBe(false);
    expect(isFontUrl('javascript:alert(1)')).toBe(false);
    expect(isFontUrl('not a url')).toBe(false);
  });
});

describe('the Google stylesheet', () => {
  it('is built here rather than pasted, so the host is always ours to name', () => {
    expect(googleCssUrl('Playfair Display')).toBe(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
    );
  });
});

describe('what rides with a slide', () => {
  // The library is the operator's; a slide carries the one or two faces it
  // actually draws, the way the stream narrows `enabled` to its one language.
  it('is only the faces the values name', () => {
    expect(fontsUsedBy([valueOf(hosted), 'font-banner'], library)).toEqual([hosted]);
    expect(fontsUsedBy(['font-banner', 'font-lora'], library)).toEqual([]);
  });
});

describe('working out what was pasted', () => {
  // The address bar is what the operator has in hand after looking at a face.
  it('takes a Google Fonts specimen URL', () => {
    expect(parseSource('https://fonts.google.com/specimen/Merriweather')).toEqual({
      kind: 'google',
      source: 'Merriweather',
    });
  });

  it('reads a two-word family off the URL, however it was escaped', () => {
    expect(parseSource('https://fonts.google.com/specimen/Playfair+Display')?.source).toBe('Playfair Display');
    expect(parseSource('https://fonts.google.com/specimen/Playfair%20Display')?.source).toBe('Playfair Display');
  });

  it('ignores what Google hangs off the specimen path', () => {
    expect(parseSource('https://fonts.google.com/specimen/Merriweather/tester')?.source).toBe('Merriweather');
    expect(parseSource('https://www.fonts.google.com/specimen/Lora?preview.text=Hello')?.source).toBe('Lora');
  });

  it('takes the embed stylesheet too, and drops the axes', () => {
    expect(parseSource('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap')).toEqual({
      kind: 'google',
      source: 'Merriweather',
    });
  });

  it('still takes a bare family name, and a link to a font file', () => {
    expect(parseSource('  Rubik ')).toEqual({ kind: 'google', source: 'Rubik' });
    expect(parseSource('https://cdn.example.com/brand.woff2')).toEqual({
      kind: 'url',
      source: 'https://cdn.example.com/brand.woff2',
    });
  });

  // A link we cannot use must not be mistaken for a family name.
  it('refuses a link that is neither', () => {
    expect(parseSource('https://fonts.google.com/')).toBeNull();
    expect(parseSource('https://example.com/fonts.html')).toBeNull();
    expect(parseSource('javascript:alert(1)')).toBeNull();
    expect(parseSource('   ')).toBeNull();
  });
});

describe('naming a font the operator did not name', () => {
  it('uses the family, or the filename', () => {
    expect(defaultLabelOf({ kind: 'google', source: 'Merriweather' })).toBe('Merriweather');
    expect(defaultLabelOf({ kind: 'url', source: 'https://cdn.example.com/Brand-Bold.woff2' })).toBe('Brand-Bold');
  });
});
