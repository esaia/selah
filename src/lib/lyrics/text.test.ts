import { describe, expect, it } from 'vitest';

import { slidesFrom } from './text';

describe('slidesFrom', () => {
  it('starts a new slide at a blank line', () => {
    const slides = slidesFrom('one\ntwo\n\nthree', 'song');

    expect(slides.map(slide => slide.text)).toEqual(['one\ntwo', 'three']);
  });

  it('treats several blank lines as one break', () => {
    const slides = slidesFrom('one\n\n\n   \n\ntwo', 'song');

    expect(slides).toHaveLength(2);
  });

  it('reads windows line endings', () => {
    const slides = slidesFrom('one\r\ntwo\r\n\r\nthree', 'song');

    expect(slides.map(slide => slide.text)).toEqual(['one\ntwo', 'three']);
  });

  it('breaks a block that is longer than one screenful', () => {
    const slides = slidesFrom('a\nb\nc\nd\ne\nf', 'song', 4);

    expect(slides.map(slide => slide.text)).toEqual(['a\nb\nc\nd', 'e\nf']);
  });

  it('trims the ragged edges a paste brings with it', () => {
    const slides = slidesFrom('\n\n  one  \n  two  \n\n', 'song');

    expect(slides.map(slide => slide.text)).toEqual(['one\ntwo']);
  });

  it('leaves one empty slide when there is nothing to split', () => {
    expect(slidesFrom('   \n\n  ', 'song')).toEqual([{ id: 'song-0', text: '' }]);
  });

  it('gives every slide its own id', () => {
    const slides = slidesFrom('one\n\ntwo\n\nthree', 'song');

    expect(new Set(slides.map(slide => slide.id)).size).toBe(3);
  });
});
