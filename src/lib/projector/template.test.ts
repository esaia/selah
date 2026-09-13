import { describe, expect, it } from 'vitest';

import {
  asTemplate,
  DEFAULT_GRADIENT,
  DEFAULT_TEMPLATE,
  DEFAULT_TEXT,
  filesUsedBy,
  fontsNamedBy,
  MAX_ELEMENTS,
  newElement,
  referenceOf,
  renderBox,
  renderTokens,
  textStyleOf,
  type ShapeElement,
  type SlideTemplate,
  type TextElement,
  type TokenContext,
} from './template';

const verse = (bv: string, muxli: number) => ({ bv, wigni: 43, tavi: 3, muxli });

const ctx = (over: Partial<TokenContext> = {}): TokenContext => ({
  showData: { eng: [verse('For God so loved the world.', 16)] },
  order: ['eng'],
  enabled: { eng: true },
  versions: { eng: 'WEB' },
  ...over,
});

const text = (over: Partial<TextElement>): TextElement => ({
  ...DEFAULT_TEXT,
  id: 'a',
  frame: { x: 0, y: 0, w: 1, h: 1 },
  content: '',
  ...over,
});

describe('asTemplate', () => {
  it('reads a row written before the feature existed as the standard slide', () => {
    expect(asTemplate({})).toEqual(DEFAULT_TEMPLATE);
    expect(asTemplate(null)).toEqual(DEFAULT_TEMPLATE);
    expect(asTemplate('nonsense')).toEqual(DEFAULT_TEMPLATE);
  });

  it('keeps an emptied template empty rather than restoring the default', () => {
    expect(asTemplate({ elements: [] })).toEqual({ elements: [] });
  });

  it('drops an element of a kind we do not draw', () => {
    const stored = { elements: [{ kind: 'video', id: 'v' }, { kind: 'rect', id: 'r' }] };

    expect(asTemplate(stored).elements.map(one => one.id)).toEqual(['r']);
  });

  it('clamps numbers and re-parses colours', () => {
    const [one] = asTemplate({
      elements: [
        {
          kind: 'text',
          id: 'a',
          frame: { x: 0.1, y: 0.1, w: 0, h: -4 },
          size: 900,
          opacity: 3,
          lineHeight: 0,
          color: 'FFF',
          plate: 'not a colour',
        },
      ],
    }).elements as TextElement[];

    expect(one.frame.w).toBeGreaterThan(0);
    expect(one.frame.h).toBeGreaterThan(0);
    expect(one.size).toBe(40);
    expect(one.opacity).toBe(1);
    expect(one.lineHeight).toBe(0.8);
    expect(one.color).toBe('#ffffff');
    // An unreadable plate falls back to no plate, not to black.
    expect(one.plate).toBe('');
  });

  it('reads a stored semi-bold as bold, since the weight choice collapsed to two', () => {
    const [regular, semiBold, bold] = asTemplate({
      elements: [
        { kind: 'text', id: 'a', weight: 400 },
        { kind: 'text', id: 'b', weight: 600 },
        { kind: 'text', id: 'c', weight: 700 },
      ],
    }).elements as TextElement[];

    expect(regular.weight).toBe(400);
    expect(semiBold.weight).toBe(700);
    expect(bold.weight).toBe(700);
  });

  it('caps how many elements a row can carry', () => {
    const elements = Array.from({ length: MAX_ELEMENTS + 8 }, (_, index) => ({ kind: 'rect', id: `r${index}` }));

    expect(asTemplate({ elements }).elements).toHaveLength(MAX_ELEMENTS);
  });

  it('round-trips its own defaults and every new element', () => {
    expect(asTemplate(DEFAULT_TEMPLATE)).toEqual(DEFAULT_TEMPLATE);

    for (const kind of ['text', 'rect', 'ellipse', 'line', 'picture'] as const) {
      const element = newElement(kind, 'x');

      expect(asTemplate({ elements: [element] }).elements[0]).toEqual(element);
    }
  });

  it('forgets a picture whose file has no id', () => {
    const stored = { elements: [{ kind: 'picture', id: 'p', file: { name: 'logo.png' } }] };

    expect(asTemplate(stored).elements[0]).toMatchObject({ kind: 'picture', file: null });
  });
});

describe('fontsNamedBy and filesUsedBy', () => {
  const template: SlideTemplate = {
    elements: [
      text({ id: 'a', font: 'custom:one' }),
      text({ id: 'b', font: 'font-inter' }),
      { kind: 'picture', id: 'p', frame: { x: 0, y: 0, w: 1, h: 1 }, opacity: 1, rotation: 0, radius: 0, fit: 'cover', file: { id: 'f1', name: 'a', type: 'image/png', size: 1 } },
      { kind: 'picture', id: 'q', frame: { x: 0, y: 0, w: 1, h: 1 }, opacity: 1, rotation: 0, radius: 0, fit: 'cover', file: { id: 'f1', name: 'a', type: 'image/png', size: 1 } },
      { kind: 'picture', id: 'r', frame: { x: 0, y: 0, w: 1, h: 1 }, opacity: 1, rotation: 0, radius: 0, fit: 'cover', file: null },
    ],
  };

  it('names every typeface the text boxes use', () => {
    expect(fontsNamedBy(template)).toEqual(['custom:one', 'font-inter']);
  });

  it('lists each picture once, and skips an element with none', () => {
    expect(filesUsedBy(template).map(file => file.id)).toEqual(['f1']);
  });

  it('answers for a template that is not there', () => {
    expect(fontsNamedBy(null)).toEqual([]);
    expect(filesUsedBy(undefined)).toEqual([]);
  });
});

describe('referenceOf', () => {
  it('numbers one verse and a range', () => {
    expect(referenceOf([verse('a', 16)], 'eng').numbers).toBe('3:16');
    expect(referenceOf([verse('a', 16), verse('b', 18)], 'eng').numbers).toBe('3:16-18');
  });
});

describe('renderTokens', () => {
  it('draws one line per verse', () => {
    const lines = renderTokens('{{verses}}', ctx({ showData: { eng: [verse('one', 1), verse('two', 2)] } }));

    expect(lines).toEqual(['one', 'two']);
  });

  it('stacks the armed languages in the operator’s order', () => {
    const lines = renderTokens(
      '{{verses}}',
      ctx({
        showData: { eng: [verse('english', 1)], geo: [verse('georgian', 1)] },
        order: ['geo', 'eng'],
        enabled: { geo: true, eng: true },
      }),
    );

    expect(lines).toEqual(['georgian', 'english']);
  });

  it('leaves out a language that is not armed', () => {
    const lines = renderTokens(
      '{{verses}}',
      ctx({
        showData: { eng: [verse('english', 1)], geo: [verse('georgian', 1)] },
        order: ['geo', 'eng'],
        enabled: { geo: false, eng: true },
      }),
    );

    expect(lines).toEqual(['english']);
  });

  it('substitutes the reference, its halves and the translation', () => {
    expect(renderTokens('{{reference}}', ctx())).toEqual(['John 3:16']);
    expect(renderTokens('{{book}} — {{numbers}}', ctx())).toEqual(['John — 3:16']);
    expect(renderTokens('({{translation}})', ctx())).toEqual(['(WEB)']);
  });

  it('takes a named language, and comes out empty for one that is not armed', () => {
    const both = ctx({
      showData: { eng: [verse('english', 1)], geo: [verse('georgian', 1)] },
      order: ['eng', 'geo'],
      enabled: { eng: true, geo: true },
      versions: { eng: 'WEB', geo: 'ႱႱႱ' },
    });

    expect(renderTokens('{{verses:geo}}', both)).toEqual(['georgian']);
    expect(renderTokens('{{translation:geo}}', both)).toEqual(['ႱႱႱ']);
    expect(renderTokens('{{verses:rus}}', both)).toEqual([]);
  });

  it('drops a line that came out blank, and the whole box with it', () => {
    expect(renderTokens('{{translation}}', ctx({ versions: {} }))).toEqual([]);
    expect(renderTokens('{{verses}}\n{{reference}}', ctx({ showData: {} }))).toEqual([]);
  });

  it('keeps the words around a block token, on the first line and the last', () => {
    const lines = renderTokens(
      '“{{verses}}”',
      ctx({ showData: { eng: [verse('one', 1), verse('two', 2), verse('three', 3)] } }),
    );

    expect(lines).toEqual(['“one', 'two', 'three”']);
  });

  it('draws nothing at all when the box is for a language that is not up', () => {
    expect(renderTokens('Reading: {{verses}}', ctx({ showData: {} }))).toEqual([]);
  });

  it('keeps the literal text around a pinned token that has nothing to give', () => {
    expect(renderTokens('Reading: {{verses:1}}', ctx({ showData: {} }))).toEqual(['Reading: ']);
  });

  it('escapes what the operator typed, and lets the verse’s own markup through', () => {
    const lines = renderTokens(
      '<b>{{verses}}</b>',
      ctx({ showData: { eng: [verse('a <em>word</em> here', 1)] } }),
    );

    expect(lines).toEqual(['&lt;b&gt;a <em>word</em> here&lt;/b&gt;']);
  });

  it('takes a language by its place in the armed order', () => {
    const three = ctx({
      showData: { eng: [verse('english', 1)], geo: [verse('georgian', 1)], ru: [verse('russian', 1)] },
      order: ['geo', 'eng', 'ru'],
      enabled: { geo: true, eng: true, ru: true },
      versions: { geo: 'GEO', eng: 'WEB', ru: 'SYN' },
    });

    expect(renderTokens('{{verses:1}}', three)).toEqual(['georgian']);
    expect(renderTokens('{{verses:2}}', three)).toEqual(['english']);
    expect(renderTokens('{{verses:3}}', three)).toEqual(['russian']);
    expect(renderTokens('{{translation:2}}', three)).toEqual(['WEB']);
  });

  it('follows the order rather than the code, so swapping a language keeps the box', () => {
    const swapped = ctx({
      showData: { eng: [verse('english', 1)], gr: [verse('greek', 1)] },
      order: ['gr', 'eng'],
      enabled: { gr: true, eng: true },
    });

    expect(renderTokens('{{verses:1}}', swapped)).toEqual(['greek']);
  });

  it('draws nothing for a slot no language is armed in', () => {
    expect(renderTokens('{{verses:2}}', ctx())).toEqual([]);
    expect(renderTokens('{{reference:3}}', ctx())).toEqual([]);
  });

  it('reads one token per line', () => {
    expect(renderTokens('{{reference}}\n{{translation}}', ctx())).toEqual(['John 3:16', 'WEB']);
  });
});

describe('renderTokens, once per language', () => {
  const two = ctx({
    showData: { eng: [verse('english', 16)], geo: [verse('georgian', 16)] },
    order: ['eng', 'geo'],
    enabled: { eng: true, geo: true },
    versions: { eng: 'WEB', geo: 'GEO' },
  });

  const GEO_REF = 'იოანეს სახარება 3:16';

  it('gives each language its own reference rather than the first one’s', () => {
    expect(renderTokens('{{reference}}', two)).toEqual(['John 3:16', GEO_REF]);
  });

  it('gives each its own translation', () => {
    expect(renderTokens('{{translation}}', two)).toEqual(['WEB', 'GEO']);
  });

  it('repeats a composed line, each pass in its own language', () => {
    expect(renderTokens('{{book}} {{numbers}} ({{translation}})', two)).toEqual([
      'John 3:16 (WEB)',
      `${GEO_REF} (GEO)`,
    ]);
  });

  it('draws a pinned box once, in the slot it names', () => {
    expect(renderTokens('{{reference:2}}', two)).toEqual([GEO_REF]);
    expect(renderTokens('{{verses:1}} — {{translation:1}}', two)).toEqual(['english — WEB']);
  });

  it('draws a box of plain words once, however many languages are up', () => {
    expect(renderTokens('HOLY BIBLE', two)).toEqual(['HOLY BIBLE']);
  });

  it('is what the default template does, so the standard slide reads right', () => {
    const [verses, reference] = DEFAULT_TEMPLATE.elements as TextElement[];

    expect(renderTokens(verses.content, two)).toEqual(['english', 'georgian']);
    expect(renderTokens(reference.content, two)).toEqual(['John 3:16', GEO_REF]);
  });
});

describe('renderBox on a song slide', () => {
  const song = (...langs: string[]): TokenContext => ({
    showData: {
      lyrics: {
        title: 'Amazing Grace',
        text: langs[0],
        langs: langs.map((text, index) => ({ id: `l${index}`, label: `L${index}`, text })),
      },
    },
    order: ['eng'],
    enabled: { eng: true },
    versions: { eng: 'WEB' },
  });

  it('draws every language the song is sung in, one group each', () => {
    expect(renderBox('{{lyrics}}', song('english words', 'georgian words'))).toEqual([
      ['english words'],
      ['georgian words'],
    ]);
  });

  it('collapses to one group for a song with a single language', () => {
    expect(renderBox('{{lyrics}}', song('english words'))).toEqual([['english words']]);
  });

  it('reads {{verses}} as the same question, so a template survives being repointed', () => {
    expect(renderTokens('{{verses}}', song('english words'))).toEqual(['english words']);
  });

  it('has no language a template could name, only however many the song has', () => {
    expect(renderTokens('{{lyrics}}', song('english', 'georgian'))).toEqual(['english', 'georgian']);
    expect(renderTokens('{{lyrics:3}}', song('english', 'georgian'))).toEqual([]);
  });

  it('ignores the line breaks the song was typed with, as the shipped looks do', () => {
    expect(renderTokens('{{lyrics}}', song('one\ntwo'))).toEqual(['one two']);
  });

  it('escapes the words, which are the operator’s own text and not markup', () => {
    expect(renderTokens('{{lyrics}}', song('a <b>word</b>'))).toEqual(['a &lt;b&gt;word&lt;/b&gt;']);
  });

  it('has no reference to give', () => {
    expect(renderTokens('{{reference}}', song('english'))).toEqual([]);
  });
});

describe('renderBox, one group per repeat', () => {
  const two = ctx({
    showData: { eng: [verse('english', 16)], geo: [verse('georgian', 16)] },
    order: ['eng', 'geo'],
    enabled: { eng: true, geo: true },
    versions: { eng: 'WEB', geo: 'GEO' },
  });

  it('keeps the languages apart, so a box can give each its own share', () => {
    expect(renderBox('{{verses}}', two)).toEqual([['english'], ['georgian']]);
  });

  it('collapses to one group when only one language is up', () => {
    expect(renderBox('{{verses}}', ctx())).toHaveLength(1);
  });

  it('is one group for a pinned box, and one for plain words', () => {
    expect(renderBox('{{verses:2}}', two)).toEqual([['georgian']]);
    expect(renderBox('HOLY BIBLE', two)).toEqual([['HOLY BIBLE']]);
  });

  it('drops a repeat that came out empty rather than leaving a hole', () => {
    expect(renderBox('{{translation}}', ctx({ versions: { eng: '' } }))).toEqual([]);
  });
});

describe('shape fills', () => {
  const shape = (over: Record<string, unknown> = {}) =>
    asTemplate({ elements: [{ kind: 'ellipse', id: 's', ...over }] }).elements[0] as ShapeElement;

  it('reads a row written before a shape could be anything but a colour as a colour', () => {
    expect(shape({ fill: '#ff0000' })).toMatchObject({ fillKind: 'color', fill: '#ff0000' });
  });

  it('keeps each kind of fill, and falls back for one we do not paint', () => {
    expect(shape({ fillKind: 'gradient' }).fillKind).toBe('gradient');
    expect(shape({ fillKind: 'image' }).fillKind).toBe('image');
    expect(shape({ fillKind: 'none' }).fillKind).toBe('none');
    expect(shape({ fillKind: 'video' }).fillKind).toBe('color');
  });

  it('clamps a gradient and re-parses its colours', () => {
    const { gradient } = shape({ gradient: { from: 'F00', to: 'nonsense', angle: 900 } });

    expect(gradient.from).toBe('#ff0000');
    expect(gradient.to).toBe(DEFAULT_GRADIENT.to);
    expect(gradient.angle).toBe(180);
  });

  it('carries a picture so an ellipse can be a round photograph', () => {
    const file = { id: 'f9', name: 'logo.png', type: 'image/png', size: 4 };

    expect(shape({ fillKind: 'image', file }).file).toEqual(file);
    expect(filesUsedBy({ elements: [shape({ fillKind: 'image', file })] }).map(one => one.id)).toEqual(['f9']);
  });
});

describe('rotation', () => {
  it('defaults to square on and clamps a half turn either way', () => {
    const turn = (rotation: unknown) =>
      (asTemplate({ elements: [{ kind: 'rect', id: 'r', rotation }] }).elements[0] as ShapeElement).rotation;

    expect(turn(undefined)).toBe(0);
    expect(turn(45)).toBe(45);
    expect(turn(-45)).toBe(-45);
    expect(turn(900)).toBe(180);
    expect(turn('sideways')).toBe(0);
  });
});

describe('text outline', () => {
  const text = (over: Record<string, unknown> = {}) =>
    asTemplate({ elements: [{ kind: 'text', id: 't', ...over }] }).elements[0] as TextElement;

  it('is off until a colour is set, so nothing already saved grows an outline', () => {
    expect(text().stroke).toBe('');
  });

  it('keeps a colour and clamps the thickness', () => {
    expect(text({ stroke: '000' }).stroke).toBe('#000000');
    expect(text({ strokeWidth: 99 }).strokeWidth).toBe(5);
    expect(text({ strokeWidth: -1 }).strokeWidth).toBe(0);
  });
});

describe('a second language with a style of its own', () => {
  const text = (over: Record<string, unknown> = {}) =>
    asTemplate({ elements: [{ kind: 'text', id: 't', ...over }] }).elements[0] as TextElement;

  it('is off unless the template says otherwise', () => {
    expect(text().secondary).toBeNull();
    expect(text({ secondary: null }).secondary).toBeNull();
  });

  it('reads back as a full style, coerced like any other', () => {
    const { secondary } = text({ secondary: { color: 'F00', size: 900, plate: 'nonsense' } });

    expect(secondary).toMatchObject({ color: '#ff0000', size: 40, plate: '', plateKind: 'none' });
  });

  it('carries nothing about the box itself, so a share cannot move or rename it', () => {
    const { secondary } = text({ secondary: { valign: 'top', padding: 9, content: 'no', frame: { x: 1 } } });

    expect(secondary).not.toHaveProperty('valign');
    expect(secondary).not.toHaveProperty('padding');
    expect(secondary).not.toHaveProperty('content');
    expect(secondary).not.toHaveProperty('frame');
  });

  it('starts as a copy of the box it belongs to', () => {
    const box = text({ color: '#00ff00', size: 12, italic: true });

    expect(textStyleOf(box)).toMatchObject({ color: '#00ff00', size: 12, italic: true });
    expect(textStyleOf(box)).not.toHaveProperty('content');
  });

  it('round-trips', () => {
    const box = text({ secondary: { color: '#00ff00' } });

    expect(asTemplate({ elements: [box] }).elements[0]).toEqual(box);
  });
});

describe('a song on the stream', () => {
  const song = (lyricsLang?: string): TokenContext => ({
    showData: {
      lyrics: {
        title: 'Amazing Grace',
        text: 'english',
        langs: [
          { id: 'l0', label: 'English', text: 'english' },
          { id: 'l1', label: 'ქართული', text: 'georgian' },
        ],
      },
    },
    order: ['eng'],
    enabled: { eng: true },
    versions: {},
    lyricsLang,
  });

  it('draws only the language the overlay is pointed at', () => {
    expect(renderBox('{{lyrics}}', song('l1'))).toEqual([['georgian']]);
  });

  it('falls back to the first when the song no longer has the one it names', () => {
    expect(renderBox('{{lyrics}}', song('gone'))).toEqual([['english']]);
  });

  it('still draws them all where nothing has been pointed at one', () => {
    expect(renderBox('{{lyrics}}', song())).toEqual([['english'], ['georgian']]);
  });
});

describe('a plate behind each line', () => {
  const text = (over: Record<string, unknown> = {}) =>
    asTemplate({ elements: [{ kind: 'text', id: 't', ...over }] }).elements[0] as TextElement;

  it('is one panel unless the template asks for bands', () => {
    expect(text().plateSpan).toBe('box');
    expect(text({ plateSpan: 'nonsense' }).plateSpan).toBe('box');
    expect(text({ plateSpan: 'line' }).plateSpan).toBe('line');
  });

  it('clamps the gap, which is in em of the words', () => {
    expect(text().plateGap).toBe(0.16);
    expect(text({ plateGap: 9 }).plateGap).toBe(1);
    expect(text({ plateGap: -1 }).plateGap).toBe(0);
  });

  it('travels with a second language’s style of its own', () => {
    const box = text({ plateSpan: 'line', plateGap: 0.3 });

    expect(textStyleOf(box)).toMatchObject({ plateSpan: 'line', plateGap: 0.3 });
  });
});
