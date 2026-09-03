import { apiBookName } from '@/lib/bible/passage';
import type { Lang, Verse } from '@/lib/types';

/**
 * Verse text can come back with markup (the API wraps search hits in a
 * highlight span). The console renders plain text rather than injecting HTML.
 */
export const plain = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Reference label for a verse, e.g. `დაბადება 4:10`.
 *
 * Uses the `wigni` the API returned for that language, which is offset by 3
 * from the index in the name list.
 */
export const verseRef = (item: Verse | null | undefined, lang: Lang): string => {
  if (!item) return '';

  const name = apiBookName(item.wigni, lang);

  return `${name} ${item.tavi}:${item.muxli}`.trim();
};
