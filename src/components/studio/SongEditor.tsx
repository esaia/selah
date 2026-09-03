'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal, useModalClose } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song, SongSlide } from '@/lib/types';

import { SortHandle } from './SortHandle';
import { LIFTED_SLOT, useSortable, type Sortable } from './sortable';

/** A field that is as tall as what has been typed into it, up to a ceiling. */
const grow = (field: HTMLTextAreaElement | null) => {
  if (!field) return;

  field.style.height = 'auto';
  field.style.height = `${field.scrollHeight}px`;
};

/** One slide, as a card in the running order. */
const Card = ({
  slide,
  index,
  sortable,
  onChange,
  onRemove,
}: {
  slide: SongSlide;
  index: number;
  sortable: Sortable<SongSlide>;
  onChange: (text: string) => void;
  onRemove: () => void;
}) => (
  <li
    {...sortable.row(slide.id)}
    className={cn(
      'group relative flex items-stretch rounded-studio border bg-white transition-colors duration-150',
      'border-studio-border focus-within:border-studio-accent/50',
      sortable.lifted === slide.id && LIFTED_SLOT,
    )}
  >
    <SortHandle index={index} className="w-7 self-start py-2.5" {...sortable.handle(slide.id)} />

    <textarea
      ref={grow}
      rows={2}
      value={slide.text}
      placeholder="What the room reads on this slide…"
      onChange={event => {
        grow(event.currentTarget);
        onChange(event.target.value);
      }}
      className="max-h-64 w-full resize-none bg-transparent py-2 pr-2 text-sm leading-snug text-studio-text
        placeholder:text-studio-faint focus:outline-none"
    />

    <span className="flex shrink-0 items-start p-1.5">
      <IconButton
        label={`Remove slide ${index + 1}`}
        tone="danger"
        onClick={onRemove}
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </IconButton>
    </span>
  </li>
);

/**
 * Edit a song's slides.
 *
 * A ProPresenter import is a good start and rarely the final shape: a chorus
 * gets repeated, a verse gets split across two slides, and the second verse
 * turns out to belong before the bridge. So the slides are cards in a list the
 * operator can drag, the same list the timers and the stage messages are, and
 * each card is as tall as the words in it rather than a window onto them.
 *
 * Saving republishes the projector if the song is live, and clears it if the
 * live slide was deleted.
 */
export const SongEditor = ({ song, onClose }: { song: Song; onClose: () => void }) => {
  const { saveSong } = useStudio();
  const [title, setTitle] = useState(song.title);
  const [slides, setSlides] = useState(song.slides);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const close = useModalClose();

  // Reordered by id rather than by the slots the cards were dragged through.
  const sortable = useSortable(slides, slide => slide.id, ids =>
    setSlides(current => {
      const known = new Set(ids);

      return [
        ...ids.map(id => current.find(slide => slide.id === id)).filter((slide): slide is SongSlide => Boolean(slide)),
        ...current.filter(slide => !known.has(slide.id)),
      ];
    }),
  );

  const named = title.trim().length > 0;

  const save = async () => {
    if (!named) return;

    setSaving(true);
    setError('');

    try {
      await saveSong({
        ...song,
        title: title.trim(),
        slides: slides.filter(slide => slide.text.trim().length > 0),
      });

      close.current?.(onClose);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeRef={close}
      width="max-w-2xl"
      title={
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Name the song"
          aria-label="Song title"
          className="w-full rounded-studio border border-transparent bg-transparent px-2 py-1 text-sm font-semibold
            text-studio-text outline-none placeholder:font-normal placeholder:text-studio-faint
            hover:border-studio-border focus:border-studio-accent"
        />
      }
      footer={
        <>
          {error ? (
            <p className="mr-auto text-xs text-studio-danger">{error}</p>
          ) : !named ? (
            <p className="mr-auto text-xs text-studio-faint">A song needs a name before it can be saved.</p>
          ) : (
            <p className="mr-auto text-xs text-studio-faint">
              {slides.length} slide{slides.length === 1 ? '' : 's'} · drag a number to reorder
            </p>
          )}

          <Button variant="ghost" size="md" onClick={() => close.current?.()}>
            Cancel
          </Button>

          <Button variant="accent" size="md" loading={saving} disabled={!named} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {/* The gaps between the cards belong to the list, and a release in one
            of them is still a release on the order the drag arrived at. */}
        <ul className="space-y-2" {...sortable.list()}>
          {sortable.items.map((slide, index) => (
            <Card
              key={slide.id}
              slide={slide}
              index={index}
              sortable={sortable}
              onChange={text =>
                setSlides(current => current.map(item => (item.id === slide.id ? { ...item, text } : item)))
              }
              onRemove={() => setSlides(current => current.filter(item => item.id !== slide.id))}
            />
          ))}
        </ul>

        <button
          type="button"
          onClick={() =>
            setSlides(current => [...current, { id: `${song.id}-${current.length}-${Date.now()}`, text: '' }])
          }
          className="flex w-full items-center justify-center gap-2 rounded-studio border border-dashed
            border-studio-border py-2 text-xs text-studio-muted transition-colors duration-150
            hover:border-studio-faint hover:text-studio-text focus:outline-none focus-visible:ring-2
            focus-visible:ring-studio-accent/40"
        >
          <Plus className="size-3" />
          Add a slide
        </button>
      </div>
    </Modal>
  );
};
