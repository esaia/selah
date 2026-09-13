import { sectionsOf } from './groups';

import type { SongSlide } from '@/lib/types';

const MAX_LINES = 4;

export const slidesFrom = (text: string, seed: string, maxLines = MAX_LINES): SongSlide[] => {
  const cleaned = text.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');

  const texts = sectionsOf(cleaned).flatMap(section =>
    section.text
      .split(/\n\s*\n+/)
      .map(block => block.trim())
      .filter(block => block.length > 0)
      .flatMap(block => {
        const lines = block.split('\n').map(line => line.trim());
        const chunks: { group: string; text: string }[] = [];

        for (let at = 0; at < lines.length; at += maxLines) {
          chunks.push({ group: section.group, text: lines.slice(at, at + maxLines).join('\n') });
        }

        return chunks;
      }),
  );

  if (texts.length === 0) return [{ id: `${seed}-0`, text: '' }];

  return texts.map((slide, index) => ({
    id: `${seed}-${index}`,
    text: slide.text,
    ...(slide.group ? { group: slide.group } : {}),
  }));
};
