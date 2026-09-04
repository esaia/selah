'use client';

import { useState, type DragEvent } from 'react';
import { HiOutlinePencil, HiOutlineX } from 'react-icons/hi';

import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { SortHandle } from './SortHandle';
import { LIFTED_SLOT, useSortable } from './sortable';

const DRAG_TYPE = 'application/x-studio-song';

/**
 * Which half of the row the pointer is over, read from the event so a fast drop
 * still lands where it was aimed.
 */
const sideOf = (event: DragEvent<HTMLElement>) => {
  const box = event.currentTarget.getBoundingClientRect();

  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
};

/** Makes a row draggable onto the playlist, wherever that row lives. */
export const songDragProps = (songId: string) => ({
  draggable: true,
  onDragStart: (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData(DRAG_TYPE, songId);
    event.dataTransfer.setData('text/plain', songId);
    event.dataTransfer.effectAllowed = 'move';
  },
});

const readDragged = (event: DragEvent<HTMLElement>) =>
  event.dataTransfer.getData(DRAG_TYPE) || event.dataTransfer.getData('text/plain');

/**
 * The order of service: the songs picked for this Sunday, dragged over from the
 * library and reordered by dragging within the list. It holds ids only, so a
 * re-imported bundle updates the songs without disturbing the running order.
 */
export const Setlist = ({ onEdit }: { onEdit: (song: Song) => void }) => {
  const {
    songs,
    setlist,
    activeSongId,
    songScope,
    setActiveSongId,
    placeInSetlist,
    orderSetlist,
    removeFromSetlist,
    clearSetlist,
  } = useStudio();

  // Open, and open *from here*. The same song sits in both lists, and two rows
  // lit at once says the operator is in two places — the playlist is a running
  // order being worked through, the library is a shelf being searched, and
  // which of the two they are in is the whole difference between the views.
  const opened = songScope === 'setlist' ? activeSongId : null;

  // The slot a drop would use, while a drag is over the list.
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const items = setlist.map(id => songs.find(song => song.id === id)).filter((song): song is Song => Boolean(song));

  // Reordering within the list rearranges under the pointer and is written on
  // release. A song arriving from the library is a different thing and still
  // lands on the slot the line marks — the two never see each other's drags,
  // since the sortable answers only while it has a row of its own in the air.
  //
  // Carried by the whole row rather than by the rail alone: a running order is
  // reordered often enough that aiming at a 16px strip is the wrong ask. The
  // number still turns into a grip on hover, so where to take hold is still
  // said — it just is not the only place that answers.
  const sortable = useSortable(items, song => song.id, orderSetlist, { byHandle: false });

  const handleDrop = (index: number) => (event: DragEvent<HTMLElement>) => {
    const songId = readDragged(event);

    event.preventDefault();
    setDropIndex(null);

    if (songId) {
      placeInSetlist(songId, index);
      setActiveSongId(songId, 'setlist');
    }
  };

  const allowDrop = (index: number) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  };

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1">
      <div className="mb-1 flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
          Playlist{items.length > 0 ? ` · ${items.length}` : ''}
        </h3>

        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearSetlist}
            className="text-[11px] text-studio-faint hover:text-studio-text focus:outline-none"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div
        onDragOver={event => {
          if (sortable.lifted) return sortable.list().onDragOver(event);

          allowDrop(items.length)(event);
        }}
        onDragLeave={() => setDropIndex(null)}
        onDrop={event => {
          if (sortable.lifted) return sortable.list().onDrop(event);

          handleDrop(items.length)(event);
        }}
        className={cn(
          'studio-scroll max-h-56 min-h-[96px] overflow-y-auto rounded-studio border lg:max-h-none lg:flex-1',
          dropIndex !== null ? 'border-studio-accent bg-studio-accent/5' : 'border-dashed border-studio-border',
        )}
      >
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-studio-faint">
            Drag songs here to build this Sunday&rsquo;s order of service.
          </p>
        ) : (
          sortable.items.map((song, index) => (
            <div
              key={song.id}
              {...sortable.row(song.id)}
              onDragOver={event => {
                sortable.row(song.id).onDragOver(event);

                if (sortable.lifted) return;

                event.stopPropagation();
                allowDrop(sideOf(event) === 'before' ? index : index + 1)(event);
              }}
              onDrop={event => {
                if (sortable.lifted) return sortable.row(song.id).onDrop(event);

                event.stopPropagation();
                handleDrop(sideOf(event) === 'before' ? index : index + 1)(event);
              }}
              className={cn(
                'group group/set flex items-center gap-1 border-b border-studio-divider last:border-b-0',
                song.id === opened ? 'bg-studio-accent/10' : 'hover:bg-studio-surface',
                sortable.lifted === song.id && LIFTED_SLOT,
                dropIndex === index && 'border-t-2 border-t-studio-accent',
                dropIndex === index + 1 && 'border-b-2 border-b-studio-accent',
              )}
            >
              <SortHandle index={index} className="ml-1 w-4" {...sortable.handle(song.id)} />

              <button
                type="button"
                onClick={() => setActiveSongId(song.id, 'setlist')}
                className="min-w-0 flex-1 py-2 pr-1 text-left focus:outline-none"
              >
                <span
                  className={cn(
                    'block truncate text-xs',
                    song.id === opened ? 'font-semibold text-studio-text' : 'text-studio-muted',
                  )}
                >
                  {song.title}
                </span>
              </button>

              <span className="flex shrink-0 pr-1 opacity-0 transition-opacity group-hover/set:opacity-100">
                <IconButton label={`Edit ${song.title}`} onClick={() => onEdit(song)}>
                  <HiOutlinePencil className="text-sm" />
                </IconButton>

                <IconButton
                  label={`Remove ${song.title} from the playlist`}
                  onClick={() => removeFromSetlist(song.id)}
                >
                  <HiOutlineX className="text-sm" />
                </IconButton>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
