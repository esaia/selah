'use client';

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { cn } from '@/lib/cn';
import { cardLangOf, langsOf } from '@/lib/lyrics/langs';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { LyricCard } from '@/components/studio/lyrics/LyricCard';
import { LIFTED_SLOT, useSortable } from '@/components/studio/shared/sortable';

const CardLang = ({ song, onPick }: { song: Song; onPick: (langId: string) => void }) => {
  const chosen = cardLangOf(song);

  return (
    <span className="flex shrink-0 items-center rounded-studio border border-studio-border p-0.5">
      {langsOf(song).map((lang, index) => (
        <button
          key={lang.id}
          type="button"
          onClick={() => onPick(lang.id)}
          title={`Read these cards in ${lang.label || `language ${index + 1}`}`}
          className={cn(
            'max-w-24 truncate rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
            'duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
            lang.id === chosen
              ? 'bg-studio-accent text-studio-onaccent'
              : 'text-studio-faint hover:bg-studio-surface hover:text-studio-text',
          )}
        >
          {lang.label || `Language ${index + 1}`}
        </button>
      ))}
    </span>
  );
};

export const SlideGrid = ({
  song,
  heading,
  scrollTo,
  cue,
  onEditSlide,
}: {
  song: Song;
  heading?: boolean;
  scrollTo?: boolean;
  cue?: number;
  onEditSlide: (index: number) => void;
}) => {
  const {
    settings,
    cardSize,
    live,
    selectLyric,
    saveSong,
    reorderSlides,
    removeSlide,
    setSongLangs,
    selectedSlides,
    setSelectedSlides,
  } = useStudio();

  const saveSongOrShrug = (song: Song) => {
    void saveSong(song).catch(() => {});
  };
  const box = useRef<HTMLElement>(null);

  const onScreen = live?.kind === 'lyrics' && live.songId === song.id;

  const many = langsOf(song).length > 1;

  const pickCardLang = (langId: string) => void setSongLangs({ ...song, cardLang: langId });

  const slides = useSortable(song.slides, slide => slide.id, ids => void reorderSlides(song, ids), {
    byHandle: false,
    layout: 'grid',
  });

  const grid = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const toggleSelected = (id: string) => {
    setSelectedSlides(current => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const beginMarquee = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;

    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    const base = additive ? new Set(selectedSlides) : new Set<string>();

    if (!additive) setSelectedSlides(base);

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;

    const onMove = (moveEvent: globalThis.MouseEvent) => {
      const box = grid.current?.getBoundingClientRect();

      if (!box) return;

      const left = Math.min(startX, moveEvent.clientX);
      const right = Math.max(startX, moveEvent.clientX);
      const top = Math.min(startY, moveEvent.clientY);
      const bottom = Math.max(startY, moveEvent.clientY);

      setMarquee({ x: left - box.left, y: top - box.top, w: right - left, h: bottom - top });

      const hits = new Set(base);

      grid.current?.querySelectorAll<HTMLElement>('[data-slide-id]').forEach(card => {
        const cardBox = card.getBoundingClientRect();
        const overlaps = cardBox.left < right && cardBox.right > left && cardBox.top < bottom && cardBox.bottom > top;
        const id = card.dataset.slideId;

        if (overlaps && id) hits.add(id);
      });

      setSelectedSlides(hits);
    };

    const onUp = () => {
      setMarquee(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (scrollTo) box.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [scrollTo, cue]);

  return (
    <section ref={box} className="scroll-mt-2">
      {heading ? (
        <h2
          className="sticky top-0 z-20 mb-3 -ml-1 -mr-4 flex items-center justify-between gap-2 border-b
            border-studio-border bg-studio-surface py-1.5 pr-4 pl-1"
        >
          <span className="truncate text-sm font-semibold text-studio-text">{song.title}</span>

          <span className="flex shrink-0 items-center gap-2">
            {many ? <CardLang song={song} onPick={pickCardLang} /> : null}

            <span className="text-[11px] text-studio-faint tabular-nums">
              {song.slides.length} slide{song.slides.length === 1 ? '' : 's'}
            </span>
          </span>
        </h2>
      ) : many ? (
        <div className="mb-2 flex justify-end">
          <CardLang song={song} onPick={pickCardLang} />
        </div>
      ) : null}

      <div
        ref={grid}
        className="relative grid gap-x-4 gap-y-3"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}
        onMouseDown={beginMarquee}
        {...slides.list()}
      >
        {slides.items.map((slide, index) => (
          <div
            key={slide.id}
            {...slides.row(slide.id)}
            className={cn('rounded-studio', slides.lifted === slide.id && LIFTED_SLOT)}
          >
            <LyricCard
              song={song}
              slide={slide}
              index={index}
              size={cardSize}
              font={settings.lyricsFont}
              fonts={settings.customFonts}
              align={settings.lyricsAlign}
              isLive={onScreen && live.slideIndex === index}
              selected={selectedSlides.has(slide.id)}
              onGoLive={event => {
                if (event.shiftKey || event.metaKey || event.ctrlKey) {
                  toggleSelected(slide.id);
                  return;
                }

                if (selectedSlides.size > 0) setSelectedSlides(new Set());

                selectLyric(song, index);
              }}
              onEdit={() => onEditSlide(index)}
              onDelete={song.slides.length > 1 ? () => void removeSlide(song, slide.id) : undefined}
              onGroup={group =>
                saveSongOrShrug({
                  ...song,
                  slides: song.slides.map(item =>
                    item.id === slide.id ? { ...item, group: group || undefined } : item,
                  ),
                })
              }
            />
          </div>
        ))}

        {marquee ? (
          <div
            aria-hidden
            className="absolute z-30 rounded-[2px] border border-studio-accent bg-studio-accent/10"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
          />
        ) : null}
      </div>
    </section>
  );
};
