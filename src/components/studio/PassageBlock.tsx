'use client';

import type { ReactNode } from 'react';
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUp,
  HiOutlineTrash,
} from 'react-icons/hi';

import { IconButton } from '@/components/ui/IconButton';
import { bookName } from '@/lib/bible/passage';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import { groupVerses, LANG_LABELS, type Block } from '@/lib/types';

import { SortHandle } from './SortHandle';
import type { Sortable } from './sortable';

import { VerseCard } from './VerseCard';

/** Pulls the neighbouring verse into the passage. Sized to match a verse card. */
const ExtendTile = ({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) => (
  <div>
    <div className="mb-1 h-[18px]" aria-hidden="true" />
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex aspect-video w-full items-center justify-center rounded-[4px] border border-dashed
        border-studio-border text-studio-faint transition-colors duration-150
        hover:border-studio-accent hover:bg-studio-surface hover:text-studio-accent
        focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
    >
      {icon}
    </button>
  </div>
);

/** Compact label: 15:1-3,7 rather than a bare first-to-last span. */
const verseRange = (numbers: number[]) => {
  if (numbers.length === 0) return '';

  const spans = numbers.reduce<number[][]>((acc, verse) => {
    const tail = acc[acc.length - 1];

    if (tail && verse === tail[1] + 1) tail[1] = verse;
    else acc.push([verse, verse]);

    return acc;
  }, []);

  return `:${spans.map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`)).join(',')}`;
};

export const PassageBlock = ({
  block,
  index,
  isFirst,
  isLast,
  sortable,
}: {
  block: Block;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  sortable: Sortable<Block>;
}) => {
  const {
    settings,
    live,
    cardSize,
    selectVerse,
    removeBlock,
    extendBlock,
    removeGroup,
    joinGroup,
    splitGroup,
    toggleBlockCollapsed,
    moveBlock,
  } = useStudio();

  // Folded either because the operator collapsed this passage, or because a
  // drag is in progress — during a drag every block folds so the whole running
  // order fits on screen and the drop target is easy to hit.
  const collapsed = Boolean(sortable.lifted) || Boolean(block.collapsed);

  const lang = block.adminLang;
  const groups = block.groups ?? [];
  const numbers = block.verses ?? [];
  const firstVerse = numbers[0];
  const lastVerse = numbers[numbers.length - 1];

  const wholeChapter = Boolean(block.chapterLength) && numbers.length === block.chapterLength;
  const canPrepend = !wholeChapter && firstVerse > 1;
  const canAppend = !wholeChapter && (!block.chapterLength || lastVerse < block.chapterLength);

  // Nothing to reorder when it is the only passage.
  const reorderable = !(isFirst && isLast);

  const isDragging = sortable.lifted === block.id;

  return (
    <section
      {...sortable.row(block.id)}
      className={cn(
        'group relative border-b border-studio-divider px-4 transition-[padding] duration-200 ease-out last:border-b-0',
        collapsed ? 'py-2' : 'py-5',
        isDragging && 'opacity-40',
      )}
    >
      {/* The picture the drag carries: the title, not the screenful of verse
          cards underneath it. See `ghostOf`. */}
      <header data-ghost className="flex items-start justify-between gap-4">
        <div className="group/header flex min-w-0 items-start gap-1.5">
          {reorderable ? (
            <SortHandle index={index} className="mt-1 w-4" {...sortable.handle(block.id)} />
          ) : null}

          <button
            type="button"
            onClick={() => toggleBlockCollapsed(block.id)}
            aria-expanded={!block.collapsed}
            title={block.collapsed ? 'Expand passage' : 'Collapse passage'}
            className="min-w-0 rounded-studio text-left focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            <h2
              className="truncate text-xl font-bold tracking-tight text-studio-text
                transition-colors duration-150 group-hover/header:text-studio-accent"
            >
              {bookName(block.book, lang)} {block.chapter}
              {verseRange(numbers)}
            </h2>
            <p className="mt-0.5 truncate text-xs text-studio-muted">{block.versions?.[lang]}</p>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={block.collapsed ? 'Expand passage' : 'Collapse passage'}
            onClick={() => toggleBlockCollapsed(block.id)}
          >
            {block.collapsed ? (
              <HiOutlineChevronDown className="text-base" />
            ) : (
              <HiOutlineChevronUp className="text-base" />
            )}
          </IconButton>

          {reorderable ? (
            <>
              <IconButton label="Move passage up" disabled={isFirst} onClick={() => moveBlock(block.id, -1)}>
                <HiOutlineArrowUp className="text-base" />
              </IconButton>
              <IconButton label="Move passage down" disabled={isLast} onClick={() => moveBlock(block.id, 1)}>
                <HiOutlineArrowDown className="text-base" />
              </IconButton>
            </>
          ) : null}

          <IconButton label="Remove passage" tone="danger" onClick={() => removeBlock(block.id)}>
            <HiOutlineTrash className="text-base" />
          </IconButton>
        </div>
      </header>

      {/* The collapse clipper would cut the live card's ring at the edges, so the
          wrapper is widened by 4px and the content padded back in by the same. */}
      <div
        className="-mx-1 grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-1 pt-4 pb-2">
            {groups.length === 0 ? (
              <p className="text-sm text-studio-muted">
                No verses came back for this chapter in {LANG_LABELS[lang]}. Try another translation.
              </p>
            ) : (
              <div
                className="grid gap-x-4 gap-y-3"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}
              >
                {canPrepend ? (
                  <ExtendTile
                    label={`Add verse ${firstVerse - 1}`}
                    icon={<HiOutlineChevronLeft className="text-xl" />}
                    onClick={() => void extendBlock(block.id, 'start')}
                  />
                ) : null}

                {groups.map((group, groupIndex) => (
                  <VerseCard
                    key={`${block.id}-${group.join('-')}`}
                    items={groupVerses(block, lang, group)}
                    lang={lang}
                    font={settings.font}
                    align={settings.align}
                    size={cardSize}
                    isLive={live?.kind !== 'lyrics' && live?.blockId === block.id && live?.verseIndex === groupIndex}
                    onGoLive={() => selectVerse(block.id, groupIndex)}
                    onRemove={() => void removeGroup(block.id, groupIndex)}
                    onJoin={groupIndex < groups.length - 1 ? () => joinGroup(block.id, groupIndex) : undefined}
                    onSplit={() => splitGroup(block.id, groupIndex)}
                  />
                ))}

                {canAppend ? (
                  <ExtendTile
                    label={`Add verse ${lastVerse + 1}`}
                    icon={<HiOutlineChevronRight className="text-xl" />}
                    onClick={() => void extendBlock(block.id, 'end')}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
