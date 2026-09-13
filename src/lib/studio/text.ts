import { apiBookName } from '@/lib/bible/passage';
import type { Lang, Verse } from '@/lib/types';

export const plain = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export const verseRef = (item: Verse | null | undefined, lang: Lang): string => {
  if (!item) return '';

  const name = apiBookName(item.wigni, lang);

  return `${name} ${item.tavi}:${item.muxli}`.trim();
};
