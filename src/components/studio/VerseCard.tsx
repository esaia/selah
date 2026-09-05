'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { HiOutlineLink, HiOutlineScissors, HiOutlineX } from 'react-icons/hi';

import { cn } from '@/lib/cn';
import { fontStyleOf, type CustomFont } from '@/lib/projector/fonts';
import { fitText } from '@/lib/projector/fitText';
import { plain, verseRef } from '@/lib/studio/text';
import type { Align, Lang, Verse } from '@/lib/types';

const ALIGN_CLASS: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const Control = ({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="text-studio-faint opacity-0 transition-opacity duration-150 hover:text-studio-text
      focus:opacity-100 focus:outline-none group-hover/card:opacity-100"
  >
    {children}
  </button>
);

/**
 * One slide: a single verse, or several joined verses shown together.
 *
 * The card is a scale model of the projector — same black ground, same fitted
 * text — so what an operator picks from is what the room will actually see,
 * rather than a paragraph of body copy that happens to contain the words.
 */
export const VerseCard = ({
  items,
  lang,
  isLive,
  font,
  fonts,
  align = 'left',
  size = 190,
  onGoLive,
  onRemove,
  removesRest = true,
  onJoin,
  onSplit,
}: {
  items: Verse[];
  lang: Lang;
  isLive: boolean;
  font: string;
  fonts: CustomFont[];
  align?: Align;
  size?: number;
  onGoLive: () => void;
  onRemove?: () => void;
  /**
   * Whether this card's cut takes the cards after it too. False on the first
   * card, which trims from the front and leaves the rest standing.
   */
  removesRest?: boolean;
  onJoin?: () => void;
  onSplit?: () => void;
}) => {
  const bodyRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const verses = items ?? [];
  const first = verses[0];
  const last = verses[verses.length - 1];

  // A translation that lacks this verse leaves the card with nothing to show.
  // Rendering the hole as a black slide labelled "Vundefined" is worse than
  // leaving the slot empty until the refetch lands.
  const label = first ? (verses.length > 1 ? `V${first.muxli}-${last.muxli}` : `V${first.muxli}`) : '';
  const reference = first ? (verses.length > 1 ? `${verseRef(first, lang)}-${last.muxli}` : verseRef(first, lang)) : '';

  const text = verses.map(item => plain(item.bv)).join(' ');
  const refSize = clamp(Math.round(size / 24), 7, 14);
  const type = fontStyleOf(font, fonts);

  useLayoutEffect(() => {
    if (bodyRef.current) {
      fitText(textRef.current, bodyRef.current.clientHeight, {
        min: 6,
        max: clamp(Math.round(size / 17), 9, 22),
      });
    }
  }, [align, font, size, text]);

  return (
    <div className="group/card">
      <div className="mb-1 flex h-[18px] items-center justify-between gap-1 px-0.5">
        <span className={cn('text-xs font-semibold', isLive ? 'text-studio-live' : 'text-studio-muted')}>{label}</span>

        <span className="flex items-center gap-1.5">
          {verses.length > 1 && onSplit ? (
            <Control label="Split back into separate verses" onClick={onSplit}>
              <HiOutlineScissors className="text-sm" />
            </Control>
          ) : null}

          {onJoin ? (
            <Control label="Join with the next verse" onClick={onJoin}>
              <HiOutlineLink className="text-sm" />
            </Control>
          ) : null}

          {onRemove ? (
            <Control label={removesRest ? 'Remove this verse and the rest' : 'Remove this verse'} onClick={onRemove}>
              <HiOutlineX className="text-sm" />
            </Control>
          ) : null}
        </span>
      </div>

      <button
        type="button"
        data-slide-card
        onClick={onGoLive}
        title={isLive ? 'Click again to clear the screen' : text}
        className={cn(
          'flex aspect-video w-full flex-col justify-between rounded-[4px] bg-studio-slide p-2 text-left',
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
            {text}
          </span>
        </span>

        <span className={cn('block truncate text-studio-faint', ALIGN_CLASS[align])} style={{ fontSize: refSize }}>
          {reference}
        </span>
      </button>
    </div>
  );
};
