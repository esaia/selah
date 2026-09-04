'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { LyricCard } from './LyricCard';
import { LIFTED_SLOT, useSortable } from './sortable';

/**
 * One song's slides, as the grid the operator works from.
 *
 * A component of its own because the workspace shows more than one of them at
 * a time — a song picked off the playlist is read in the running order it
 * belongs to — and each carries its own drag: a card lifted out of the second
 * song must not renumber the first.
 */
export const SlideGrid = ({
  song,
  heading,
  scrollTo,
  onEditSlide,
}: {
  song: Song;
  /** Named when there is more than one song on screen to tell apart. */
  heading?: boolean;
  /** Bring this song into view: the operator has just asked to see it. */
  scrollTo?: boolean;
  onEditSlide: (index: number) => void;
}) => {
  const { settings, cardSize, live, selectLyric, saveSong, reorderSlides } = useStudio();
  const box = useRef<HTMLElement>(null);

  const onScreen = live?.kind === 'lyrics' && live.songId === song.id;

  /**
   * The running order, dragged on the cards rather than on a rail.
   *
   * A slide *is* its card here — there is nothing else on it to grab by mistake
   * — so the whole card carries, the way ProPresenter's slide grid does. The
   * grid layout is passed on because the card to the left and the card to the
   * right are neighbours too, and a column's rule about crossing a middle says
   * nothing about them.
   */
  const slides = useSortable(song.slides, slide => slide.id, ids => void reorderSlides(song, ids), {
    byHandle: false,
    layout: 'grid',
  });

  // Asked for from the playlist, so the list is taken to it rather than the
  // operator being left to find it: the song's own title goes to the top of the
  // panel, which is what "open that song" looks like.
  //
  // Instantly, not smoothly. A pick off the playlist mid-service is a cue, and
  // a list gliding for half a second is half a second of the operator watching
  // the console instead of the song they are about to put up.
  useEffect(() => {
    if (scrollTo) box.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [scrollTo, song.id]);

  return (
    <section ref={box} className="scroll-mt-2">
      {heading ? (
        /* A bar rather than a line of text, and stuck to the top of the panel
           while its own slides are passing: scrolled into the middle of a long
           song, the operator can still see which song they are in — which is
           the whole reason the running order is laid out end to end. */
        <h2
          // Bled out into the panel's own padding — the strip spans the
          // scroller, or a card slides up through the gap at either end of it —
          // and padded back in by the same amount, so the title still starts
          // where the first card starts.
          //
          // The same strip whatever is live. What is on the projector is said
          // by the card that is on it, in the one place the operator is
          // watching; saying it again across the width of the panel is a second
          // red thing on screen competing with the first.
          // Solid, not translucent: a card passing under a see-through strip
          // shows through it, and blurring that only turns the show-through
          // into a smear that reads as a gradient.
          className="sticky top-0 z-20 mb-3 -ml-1 -mr-4 flex items-center justify-between gap-2 border-b
            border-studio-border bg-studio-surface py-1.5 pr-4 pl-1"
        >
          {/* Nothing here marks the live song. The card that is on the
              projector already says so, and a second red mark in the strip
              above it only competes with the first. */}
          <span className="truncate text-sm font-semibold text-studio-text">{song.title}</span>

          <span className="shrink-0 text-[11px] text-studio-faint tabular-nums">
            {song.slides.length} slide{song.slides.length === 1 ? '' : 's'}
          </span>
        </h2>
      ) : null}

      {/* The gaps between the cards belong to the grid, so a release in one of
          them is still a release on the order the drag arrived at. */}
      <div
        className="grid gap-x-4 gap-y-3"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}
        {...slides.list()}
      >
        {slides.items.map((slide, index) => (
          <div
            key={slide.id}
            {...slides.row(slide.id)}
            className={cn('rounded-studio', slides.lifted === slide.id && LIFTED_SLOT)}
          >
            <LyricCard
              slide={slide}
              index={index}
              size={cardSize}
              font={settings.lyricsFont}
              fonts={settings.customFonts}
              align={settings.lyricsAlign}
              isLive={onScreen && live.slideIndex === index}
              onGoLive={() => selectLyric(song, index)}
              onEdit={() => onEditSlide(index)}
              onGroup={group =>
                void saveSong({
                  ...song,
                  slides: song.slides.map(item =>
                    item.id === slide.id ? { ...item, group: group || undefined } : item,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
};
