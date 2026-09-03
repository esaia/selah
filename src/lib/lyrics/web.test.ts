import { describe, expect, it } from 'vitest';

import { csvRows, decodeEntities, lyricsIn, textFromHtml } from './web';

describe('decodeEntities', () => {
  it('reads named and numeric references', () => {
    expect(decodeEntities('Rock &amp; Roll')).toBe('Rock & Roll');
    expect(decodeEntities('don&#39;t')).toBe("don't");
    expect(decodeEntities('&#x41;&#x42;')).toBe('AB');
  });

  it('leaves something it does not know alone rather than eating it', () => {
    expect(decodeEntities('&nope; 100&')).toBe('&nope; 100&');
  });
});

describe('textFromHtml', () => {
  it('keeps the lines a lyric sheet is written in', () => {
    expect(textFromHtml('one<br>two<br/>three')).toBe('one\ntwo\nthree');
  });

  it('ends a block with a blank line, and never more than one', () => {
    expect(textFromHtml('<p>one</p><p>two</p>')).toBe('one\n\ntwo');
    expect(textFromHtml('one<br><br><br><br>two')).toBe('one\n\ntwo');
  });

  it('drops the markup, the scripts and a hymnal’s margin numbers', () => {
    expect(textFromHtml('<script>alert(1)</script><span class="x">a line</span>')).toBe('a line');
    expect(textFromHtml('1  a line')).toBe('a line');
    // A number that is part of the line stays part of the line.
    expect(textFromHtml('3 blind mice')).toBe('3 blind mice');
  });
});

describe('lyricsIn', () => {
  it('runs every matching container together', () => {
    const html = '<div data-x>one</div><p>skip</p><div data-x>two</div>';

    expect(lyricsIn(html, /<div data-x>/g)).toBe('one\n\ntwo');
  });

  it('keeps a verse whose lines are wrapped in containers of their own', () => {
    const html = '<div data-x>one<div class="note">two</div>three</div><footer>skip</footer>';

    expect(lyricsIn(html, /<div data-x>/g)).toBe('one\ntwo\n\nthree');
  });

  it('answers nothing when the markup has moved on', () => {
    expect(lyricsIn('<article>words</article>', /<div data-x>/g)).toBe('');
  });
});

describe('csvRows', () => {
  it('keeps a comma that belongs to a title', () => {
    expect(csvRows('a,"b, still b",c')).toEqual([['a', 'b, still b', 'c']]);
  });

  it('reads a doubled quote as one', () => {
    expect(csvRows('"say ""hi""",b')).toEqual([['say "hi"', 'b']]);
  });

  it('splits rows on either line ending and drops the empty ones', () => {
    expect(csvRows('a,b\r\nc,d\n\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});
