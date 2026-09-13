import type { PsalmScheme } from '@/lib/bible/psalms';
import type { ParsedBible } from '@/lib/bible/import/types';

const PSALMS = 19;

const MERGED = 28;

export const detectPsalms = (bible: ParsedBible): PsalmScheme | null => {
  const psalter = bible.books.find(book => book.position === PSALMS);

  if (!psalter) return null;

  const lengthOf = (chapter: number) =>
    psalter.chapters.find(entry => entry.number === chapter)?.verses.length ?? 0;

  const ninth = lengthOf(9);

  if (ninth >= MERGED) return 'lxx';

  const short = lengthOf(117) === 2 ? 'masoretic' : lengthOf(116) === 2 ? 'lxx' : null;

  if (ninth > 0) return short ?? 'masoretic';

  return short;
};
