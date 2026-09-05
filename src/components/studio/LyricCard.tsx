'use client';

import { useLayoutEffect, useRef } from 'react';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { fontStyleOf, type CustomFont } from '@/lib/projector/fonts';
import { colorOf } from '@/lib/lyrics/groups';
import { cardLangOf, textOf } from '@/lib/lyrics/langs';
import { fitText } from '@/lib/projector/fitText';
import type { Align, Song, SongSlide } from '@/lib/types';

import { GroupPicker } from './GroupPicker';

const ALIGN_CLASS: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** One song slide, framed and scaled exactly like a verse card. */
export const LyricCard = ({
  song,
  slide,
  index,
  isLive,
  font,
  fonts,
  align = 'center',
  size = 190,
  onGoLive,
  onEdit,
  onDelete,
  onGroup,
}: {
  song: Song;
  slide: SongSlide;
  index: number;
  isLive: boolean;
  font: string;
  fonts: CustomFont[];
  align?: Align;
  size?: number;
  onGoLive: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onGroup?: (group: string) => void;
}) => {
  const bodyRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const type = fontStyleOf(font, fonts);

  // One language, the one the operator reads the cards in, even when the song is
  // sung in two: a card is a thumbnail a slide is picked out of at a glance, and
  // stacking the translation into it halves the type and reads as a wall of text.
  //
  // Nothing typed in that language shows an empty card rather than falling back
  // to another one. The card is answering "what does this slide say in English",
  // and a card that quietly answered in Georgian would hide the one thing the
  // operator is looking down the grid for — which slides still need translating.
  const shown = textOf(song, slide, cardLangOf(song));

  useLayoutEffect(() => {
    if (bodyRef.current) {
      fitText(textRef.current, bodyRef.current.clientHeight, {
        min: 6,
        max: clamp(Math.round(size / 17), 9, 22),
      });
    }
  }, [align, font, size, shown]);

  return (
    <div>
      <div className="group mb-1 flex h-5 items-center justify-between gap-1 px-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn('text-xs font-semibold', isLive ? 'text-studio-live' : 'text-studio-muted')}>
            {index + 1}
          </span>

          {/* What part of the song this is, where the song says. It is how
              "from the bridge" becomes something the operator can point at
              rather than read four cards to find — and where it is set, because
              the card is where the operator notices it is wrong. */}
          {onGroup ? (
            <GroupPicker compact className="min-w-0" value={slide.group ?? ''} onPick={onGroup} />
          ) : slide.group ? (
            <span
              className="flex h-4 items-center truncate rounded-full px-1.5 text-[9px] font-semibold
                tracking-wide text-white uppercase"
              style={{ backgroundColor: colorOf(slide.group) }}
            >
              {slide.group}
            </span>
          ) : null}
        </span>

        <span className="flex shrink-0 items-center">
          {onEdit ? (
            <IconButton
              label={`Edit slide ${index + 1}`}
              onClick={onEdit}
              className="h-[18px] w-[18px] text-studio-faint opacity-0 transition-opacity
                group-hover:opacity-100 focus-visible:opacity-100"
            >
              <HiOutlinePencil className="text-[11px]" />
            </IconButton>
          ) : null}

          {onDelete ? (
            <IconButton
              label={`Delete slide ${index + 1}`}
              tone="danger"
              onClick={onDelete}
              className="h-[18px] w-[18px] opacity-0 transition-opacity
                group-hover:opacity-100 focus-visible:opacity-100"
            >
              <HiOutlineTrash className="text-[11px]" />
            </IconButton>
          ) : null}
        </span>
      </div>

      <button
        type="button"
        data-slide-card
        onClick={onGoLive}
        // Only the live card has anything to say on hover. The words were the
        // tooltip once, which meant hovering a grid put a second copy of the
        // slide over the one already being read.
        title={isLive ? 'Click again to clear the screen' : undefined}
        className={cn(
          'flex aspect-video w-full flex-col justify-center rounded-[4px] bg-studio-slide p-2 text-left',
          'transition-shadow duration-150 focus:outline-none',
          type.className,
          isLive
            ? 'ring-4 ring-studio-live'
            : 'ring-1 ring-transparent hover:ring-2 hover:ring-studio-accent focus-visible:ring-2 focus-visible:ring-studio-accent',
        )}
        style={type.style ? { fontFamily: type.style } : undefined}
      >
        <span ref={bodyRef} className="flex flex-1 items-center justify-center overflow-hidden">
          <span ref={textRef} className={cn('w-full leading-snug font-semibold text-white', ALIGN_CLASS[align])}>
            {shown.split('\n').join(' ')}
          </span>
        </span>
      </button>
    </div>
  );
};
