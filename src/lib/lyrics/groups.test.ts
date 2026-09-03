import { describe, expect, it } from 'vitest';

import { colorOf, headerOf, sectionsOf, withoutPreamble } from './groups';

describe('colorOf', () => {
  it('gives a family one colour, however it is numbered', () => {
    expect(colorOf('Verse 4')).toBe(colorOf('Verse'));
    expect(colorOf('Chorus 2')).toBe(colorOf('Chorus'));
  });

  it('keeps a pre-chorus out of the chorus, however it is spelled', () => {
    expect(colorOf('PreChorus')).not.toBe(colorOf('Chorus'));
    expect(colorOf('Pre-Chorus')).toBe(colorOf('PreChorus'));
  });

  it('reads a name typed in any case', () => {
    expect(colorOf('  bRiDgE 3 ')).toBe(colorOf('Bridge'));
  });

  it('marks a name it does not know rather than guessing at one', () => {
    expect(colorOf('Nino')).toBe(colorOf('Something else entirely'));
    expect(colorOf('Nino')).not.toBe(colorOf('Verse'));
  });
});

describe('headerOf', () => {
  it('reads the two ways a sheet marks a section', () => {
    expect(headerOf('[Chorus]')).toBe('Chorus');
    expect(headerOf('  Verse 2:  ')).toBe('Verse 2');
  });

  it('drops the credit a site hangs off the section', () => {
    expect(headerOf('[Verse 1: Someone Else]')).toBe('Verse 1');
  });

  it('tidies a name into the one the picker offers', () => {
    expect(headerOf('[verse   1]')).toBe('Verse 1');
  });

  it('keeps a name of its own rather than forcing it into the list', () => {
    expect(headerOf('[Coda]')).toBe('Coda');
  });

  it('says nothing about a line that is words to sing', () => {
    expect(headerOf('a line of the song')).toBeNull();
    expect(headerOf('and then he said: come')).toBeNull();
    expect(headerOf('')).toBeNull();
  });
});

describe('sectionsOf', () => {
  it('hands each section the lines under it, without the marker', () => {
    expect(sectionsOf('[Verse 1]\na\nb\n[Chorus]\nc')).toEqual([
      { group: 'Verse 1', text: 'a\nb' },
      { group: 'Chorus', text: 'c' },
    ]);
  });

  it('leaves a sheet that marks nothing in one ungrouped piece', () => {
    expect(sectionsOf('a\nb')).toEqual([{ group: '', text: 'a\nb' }]);
  });

  it('drops a section a sheet opened and never filled', () => {
    expect(sectionsOf('[Intro]\n\n[Verse]\na')).toEqual([{ group: 'Verse', text: 'a' }]);
  });
});

describe('withoutPreamble', () => {
  it('drops what a page put above the first marker', () => {
    expect(withoutPreamble('1 Contributor\nSomething Lyrics\n[Verse 1]\na')).toBe('[Verse 1]\na');
  });

  it('keeps everything when the sheet marks nothing', () => {
    expect(withoutPreamble('a\nb')).toBe('a\nb');
  });

  it('keeps everything when the first line is already the marker', () => {
    expect(withoutPreamble('[Verse 1]\na')).toBe('[Verse 1]\na');
  });
});
