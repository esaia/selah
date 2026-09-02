'use client';

import { cn } from '@/lib/cn';
import { groupVerses, type Block, type Lang } from '@/lib/types';

/**
 * One slide, as the operator sees it before it is on screen.
 *
 * The card shows the browsing language only — the projector may be stacking
 * three, but the person choosing needs to read one and recognise it fast.
 */
export const VerseCard = ({
  block,
  groupIndex,
  lang,
  size,
  live,
  onSelect,
}: {
  block: Block;
  groupIndex: number;
  lang: Lang;
  size: number;
  live: boolean;
  onSelect: () => void;
}) => {
  const verses = groupVerses(block, lang, block.groups[groupIndex] ?? []);
  const numbers = verses.map(verse => verse.muxli);
  const label = numbers.length > 1 ? `${numbers[0]}–${numbers[numbers.length - 1]}` : numbers[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ width: size }}
      className={cn(
        'group relative flex h-auto min-h-28 flex-col rounded-lg border p-3 text-left transition',
        live
          ? 'border-live bg-live/15 shadow-[0_0_0_1px_var(--color-live)]'
          : 'border-ink-800 bg-ink-900 hover:border-ink-700 hover:bg-ink-850',
      )}
    >
      <span className={cn('text-xs font-medium', live ? 'text-live' : 'text-ink-500')}>
        {block.chapter}:{label}
      </span>

      <span className="text-ink-100 mt-2 line-clamp-5 text-xs leading-relaxed">
        {verses.map(verse => verse.bv.replace(/<[^>]+>/g, '')).join(' ')}
      </span>
    </button>
  );
};
