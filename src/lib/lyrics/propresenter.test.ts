import { describe, expect, it } from 'vitest';

import { rtfToText } from './propresenter';

const HEADER =
  '{\\rtf0\\ansi\\ansicpg1252{\\fonttbl\\f0\\fnil BPGNinoMtavruli-Bold;}' +
  '{\\colortbl;\\red255\\green255\\blue255;}' +
  '{\\*\\expandedcolortbl;\\csgenericrgb\\c100000\\c100000\\c100000\\c0;}';

describe('rtfToText', () => {
  it('drops the header tables', () => {
    expect(rtfToText(`${HEADER}\\uc1\\pard\\f0\\fs200 Amazing grace}`)).toBe('Amazing grace');
  });

  // The bug a `.pro` document exposed and a `.proBundle` did not: a list table
  // with contents is not the empty `{\*\listoverridetable}` the old marker
  // looked for, so the font's own name went to the wall with the lyrics.
  it('drops a list table that has contents', () => {
    const listed =
      `${HEADER}{\\*\\listtable{\\list\\listid1{\\listlevel{\\leveltext\\leveltemplateid1 \\'01\\u9679 ?;}}}}` +
      '{\\*\\listoverridetable{\\listoverride\\listid1\\ls1}}\\uc1\\pard\\f0 Line one\\par Line two}';

    expect(rtfToText(listed)).toBe('Line one\nLine two');
  });

  it('reads Georgian and drops the stand-in that follows each escape', () => {
    expect(rtfToText('{\\rtf0\\uc1\\pard \\u4328 ?\\u4304 ?\\u4309 ?\\u4308 ?}')).toBe('შავე');
  });

  it('honours a \\uc of more than one', () => {
    expect(rtfToText('{\\rtf0\\uc3\\pard \\u4328 ???\\u4304 ???}')).toBe('შა');
  });

  it('reads a surrogate pair written as two negative escapes', () => {
    expect(rtfToText('{\\rtf0\\uc1\\pard \\u-10179 ?\\u-8625 ?}')).toBe('🙏');
  });
});
