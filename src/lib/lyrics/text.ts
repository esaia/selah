import type { SongSlide } from '@/lib/types';

/** How many lines land on one slide before the block is broken in two. */
const MAX_LINES = 4;

/**
 * Turn a wall of lyrics into slides.
 *
 * Both ways into a new song hand us plain text — a paste from a hymn sheet, or
 * whatever the lyrics service returns — and both agree on the same convention a
 * songwriter already uses: a blank line ends a verse. What neither guarantees is
 * restraint, so a block longer than `maxLines` is broken up rather than sent to
 * the projector as a paragraph nobody at the back can read.
 */
export const slidesFrom = (text: string, seed: string, maxLines = MAX_LINES): SongSlide[] => {
  const blocks = text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map(block => block.trim())
    .filter(block => block.length > 0);

  const texts = blocks.flatMap(block => {
    const lines = block.split('\n').map(line => line.trim());
    const chunks: string[] = [];

    for (let at = 0; at < lines.length; at += maxLines) {
      chunks.push(lines.slice(at, at + maxLines).join('\n'));
    }

    return chunks;
  });

  // The editor always shows a row: nothing to split still means somewhere to type.
  if (texts.length === 0) return [{ id: `${seed}-0`, text: '' }];

  return texts.map((slide, index) => ({ id: `${seed}-${index}`, text: slide }));
};
