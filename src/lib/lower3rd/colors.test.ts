import { describe, expect, it } from 'vitest';

import { asStreamColors, defaultsOf, knobsOf, migrated, varsFor } from './colors';

describe('knobsOf', () => {
  it('offers a plate only where the look has one', () => {
    expect(knobsOf('plain')).toEqual(['ink']);
    expect(knobsOf('bands')).toEqual(['plate', 'ink']);
    expect(knobsOf('split')).toEqual(['plate', 'ink', 'accent']);
  });

  it('reads an unknown look as the default one rather than emptying the panel', () => {
    expect(knobsOf('bandsdark')).toEqual(knobsOf('scrim'));
    expect(defaultsOf('nonsense')).toEqual(defaultsOf('scrim'));
  });
});

describe('varsFor', () => {
  it('sets only what the operator picked, so the stylesheet keeps the rest', () => {
    expect(varsFor('split', {})).toEqual({});
    expect(varsFor('split', { ink: '#ff0000' })).toEqual({ '--l3-fg': '#ff0000' });
  });

  it('drops a knob the look does not use', () => {
    expect(varsFor('plain', { plate: '#ffffff', accent: '#ffffff' })).toEqual({});
  });

  it('keeps the alpha of a plate the operator has made see-through', () => {
    expect(varsFor('solid', { plate: '#0a0c10aa' })).toEqual({ '--l3-plate': '#0a0c10aa' });
  });

  it('refuses anything that is not a plain hex', () => {
    expect(varsFor('solid', { plate: 'red' })).toEqual({});
    expect(varsFor('solid', { plate: '#fff' })).toEqual({});
    expect(varsFor('solid', { plate: '#0a0c10a' })).toEqual({});
    expect(varsFor('solid', { plate: 'url(x); background: y' })).toEqual({});
    expect(varsFor('solid', { plate: '#0A0C10' })).toEqual({ '--l3-plate': '#0a0c10' });
  });
});

describe('asStreamColors', () => {
  it('reads a missing or malformed row as no colours at all', () => {
    expect(asStreamColors(null)).toEqual({ verses: {}, lyrics: {} });
    expect(asStreamColors({ verses: 'nope' })).toEqual({ verses: {}, lyrics: {} });
  });

  it('keeps verses and lyrics apart', () => {
    expect(asStreamColors({ verses: { ink: '#ffffff' }, lyrics: { ink: '#000000' } })).toEqual({
      verses: { ink: '#ffffff' },
      lyrics: { ink: '#000000' },
    });
  });
});

describe('migrated', () => {
  it('reads the old dark bands look as the bands look, painted dark', () => {
    expect(migrated('bandsdark', {})).toEqual({
      variant: 'bands',
      colors: { plate: '#0a0c10', ink: '#ffffff' },
    });
  });

  it('leaves a colour the operator has since picked alone', () => {
    expect(migrated('bandsdark', { plate: '#123456' }).colors.plate).toBe('#123456');
  });

  it('passes every other look through untouched', () => {
    expect(migrated('split', { accent: '#c65e2b' })).toEqual({
      variant: 'split',
      colors: { accent: '#c65e2b' },
    });
  });
});
