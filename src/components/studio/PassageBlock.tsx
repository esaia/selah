'use client';

import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Combine,
  Split,
  Trash2,
} from 'lucide-react';

import { bookName } from '@/lib/bible/passage';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Block } from '@/lib/types';

import { VerseCard } from './VerseCard';

const IconButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="text-ink-500 hover:bg-ink-800 hover:text-white rounded-md p-1.5 transition"
  >
    {children}
  </button>
);

/**
 * One imported passage: a header and its cards.
 *
 * The cards are the slides. Splitting and joining them is how an operator says
 * "these two verses go up together" without re-importing anything.
 */
export const PassageBlock = ({ block }: { block: Block }) => {
  const { settings, live, cardSize, selectVerse, extendBlock, removeGroup, joinGroup, splitGroup, removeBlock, toggleBlockCollapsed } =
    useStudio();

  const lang = settings.adminLang;
  const liveIndex = live && live.kind !== 'lyrics' && live.blockId === block.id ? live.verseIndex : -1;

  return (
    <section className="border-ink-850 border-b py-4">
      <header className="flex items-center gap-1 px-4">
        <IconButton label={block.collapsed ? 'Expand' : 'Collapse'} onClick={() => toggleBlockCollapsed(block.id)}>
          {block.collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        </IconButton>

        <h2 className="text-sm">
          {bookName(block.book, lang)} {block.chapter}
          <span className="text-ink-500 ml-2 text-xs">
            {block.verses[0]}–{block.verses[block.verses.length - 1]}
          </span>
        </h2>

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton label="Add the verse before" onClick={() => void extendBlock(block.id, 'start')}>
            <ChevronsLeft className="size-4" />
          </IconButton>
          <IconButton label="Add the verse after" onClick={() => void extendBlock(block.id, 'end')}>
            <ChevronsRight className="size-4" />
          </IconButton>
          <IconButton label="Remove this passage" onClick={() => removeBlock(block.id)}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </header>

      {block.collapsed ? null : (
        <div className="mt-3 flex flex-wrap gap-2 px-4">
          {block.groups.map((group, index) => (
            <div key={`${block.id}-${group.join('-')}`} className="group/card relative">
              <VerseCard
                block={block}
                groupIndex={index}
                lang={lang}
                size={cardSize}
                live={liveIndex === index}
                onSelect={() => selectVerse(block.id, index)}
              />

              <div className="absolute -top-2 right-1 hidden gap-0.5 group-hover/card:flex">
                {index < block.groups.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => joinGroup(block.id, index)}
                    title="Show this verse together with the next one"
                    className="border-ink-700 bg-ink-850 text-ink-300 hover:text-white rounded border p-1"
                  >
                    <Combine className="size-3" />
                  </button>
                ) : null}

                {group.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => splitGroup(block.id, index)}
                    title="Split back into one card per verse"
                    className="border-ink-700 bg-ink-850 text-ink-300 hover:text-white rounded border p-1"
                  >
                    <Split className="size-3" />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void removeGroup(block.id, index)}
                  title="Trim the passage here"
                  className={cn(
                    'border-ink-700 bg-ink-850 text-ink-300 hover:text-live rounded border p-1',
                  )}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
