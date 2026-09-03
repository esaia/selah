'use client';

import { useLayoutEffect, useRef } from 'react';
import { HiOutlinePencil } from 'react-icons/hi';

import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { colorOf } from '@/lib/lyrics/groups';
import { fitText } from '@/lib/projector/fitText';
import type { Align, SongSlide } from '@/lib/types';

import { GroupPicker } from './GroupPicker';

const ALIGN_CLASS: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** One song slide, framed and scaled exactly like a verse card. */
export const LyricCard = ({
  slide,
  index,
  isLive,
  font,
  align = 'center',
  size = 190,
  onGoLive,
  onEdit,
  onGroup,
}: {
  slide: SongSlide;
  index: number;
  isLive: boolean;
  font: string;
  align?: Align;
  size?: number;
  onGoLive: () => void;
  onEdit?: () => void;
  onGroup?: (group: string) => void;
}) => {
  const bodyRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (bodyRef.current) {
      fitText(textRef.current, bodyRef.current.clientHeight, {
        min: 6,
        max: clamp(Math.round(size / 17), 9, 22),
      });
    }
  }, [align, font, size, slide.text]);

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
      </div>

      <button
        type="button"
        onClick={onGoLive}
        title={isLive ? 'Click again to clear the screen' : slide.text}
        className={cn(
          'flex aspect-video w-full flex-col justify-center rounded-[4px] bg-studio-slide p-2 text-left',
          'transition-shadow duration-150 focus:outline-none',
          font,
          isLive
            ? 'ring-4 ring-studio-live'
            : 'ring-1 ring-transparent hover:ring-2 hover:ring-studio-accent focus-visible:ring-2 focus-visible:ring-studio-accent',
        )}
      >
        <span ref={bodyRef} className="flex flex-1 items-center justify-center overflow-hidden">
          <span ref={textRef} className={cn('w-full leading-snug font-semibold text-white', ALIGN_CLASS[align])}>
            {slide.text.split('\n').join(' ')}
          </span>
        </span>
      </button>
    </div>
  );
};
