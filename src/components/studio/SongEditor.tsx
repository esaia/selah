'use client';

import { Fragment, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Modal, useModalClose } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { colorOf } from '@/lib/lyrics/groups';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song, SongSlide } from '@/lib/types';

import { GroupPicker } from './GroupPicker';
import { SortHandle } from './SortHandle';
import { LIFTED_SLOT, useSortable, type Sortable } from './sortable';

/** A field that is as tall as what has been typed into it, up to a ceiling. */
const grow = (field: HTMLTextAreaElement | null) => {
  if (!field) return;

  field.style.height = 'auto';
  field.style.height = `${field.scrollHeight}px`;
};

/**
 * The seam between two cards, and the way to open one.
 *
 * A slide almost never wants to go on the end — a repeat of the chorus belongs
 * after the verse it follows — and dragging a new card up a list of thirty is
 * the long way round to a place the operator was already pointing at. So the
 * gap between two cards is where a slide is added, and it stays out of the way
 * until the pointer is in it.
 */
const Seam = ({ label, onInsert }: { label: string; onInsert: () => void }) => (
  <div className="group/seam relative -my-1 flex h-2 items-center justify-center">
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onInsert}
      className="flex h-4 w-full items-center justify-center opacity-0 transition-opacity duration-150
        group-hover/seam:opacity-100 focus:opacity-100 focus:outline-none"
    >
      <span className="h-px flex-1 bg-studio-accent/40" />

      <span
        className="mx-1 flex size-4 items-center justify-center rounded-full bg-studio-accent text-white
          shadow-studio"
      >
        <Plus className="size-2.5" />
      </span>

      <span className="h-px flex-1 bg-studio-accent/40" />
    </button>
  </div>
);

/** One slide, as a card in the running order. */
const Card = ({
  slide,
  index,
  sortable,
  onChange,
  onGroup,
  onRemove,
}: {
  slide: SongSlide;
  index: number;
  sortable: Sortable<SongSlide>;
  onChange: (text: string) => void;
  onGroup: (group: string) => void;
  onRemove: () => void;
}) => (
  <li
    {...sortable.row(slide.id)}
    className={cn(
      // Not `overflow-hidden`, however tidy that would be for the stripe: the
      // group menu opens out of the card, and a card that clips its own
      // children clips the menu to a couple of rows.
      'group relative flex items-stretch rounded-studio border bg-white transition-colors',
      'duration-150 border-studio-border focus-within:border-studio-accent/50',
      sortable.lifted === slide.id && LIFTED_SLOT,
    )}
  >
    {/* The group, as a stripe down the edge. It is what makes a long song
        readable at a glance — verses blue, choruses red — without the operator
        having to read a word of any of them. */}
    <span
      aria-hidden
      className="w-1 shrink-0 rounded-l-studio"
      style={{ backgroundColor: slide.group ? colorOf(slide.group) : 'transparent' }}
    />

    <SortHandle index={index} className="w-7 self-start py-2.5" {...sortable.handle(slide.id)} />

    <div className="min-w-0 flex-1 py-1.5">
      <GroupPicker value={slide.group ?? ''} onPick={onGroup} />

      <textarea
        ref={grow}
        rows={2}
        value={slide.text}
        placeholder="What the room reads on this slide…"
        onChange={event => {
          grow(event.currentTarget);
          onChange(event.target.value);
        }}
        className="mt-1 max-h-64 w-full resize-none bg-transparent pr-2 text-sm leading-snug text-studio-text
          placeholder:text-studio-faint focus:outline-none"
      />
    </div>

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

  /**
   * A blank slide at `at`.
   *
   * It takes the group of the slide above it, because a slide added in the
   * middle of a chorus is almost always another line of that chorus — and one
   * that is not is one click from being something else.
   */
  const insert = (at: number) =>
    setSlides(current => {
      const above = current[at - 1];
      const made: SongSlide = {
        id: `${song.id}-${at}-${Date.now()}`,
        text: '',
        ...(above?.group ? { group: above.group } : {}),
      };

      return [...current.slice(0, at), made, ...current.slice(at)];
    });

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
              {slides.length} slide{slides.length === 1 ? '' : 's'} · drag a number to reorder, or hover a gap to
              add one
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
            <Fragment key={slide.id}>
              {/* Above every card but the first: the top of the list is what
                  the title bar is for, and a seam there would sit against it. */}
              {index > 0 ? (
                <li className="list-none">
                  <Seam label={`Add a slide before slide ${index + 1}`} onInsert={() => insert(index)} />
                </li>
              ) : null}

              <Card
                slide={slide}
                index={index}
                sortable={sortable}
                onChange={text =>
                  setSlides(current => current.map(item => (item.id === slide.id ? { ...item, text } : item)))
                }
                onGroup={group =>
                  setSlides(current =>
                    current.map(item => (item.id === slide.id ? { ...item, group: group || undefined } : item)),
                  )
                }
                onRemove={() => setSlides(current => current.filter(item => item.id !== slide.id))}
              />
            </Fragment>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => insert(slides.length)}
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
