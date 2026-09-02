'use client';

import { useState, type DragEvent } from 'react';

/**
 * Reordering the music by dragging.
 *
 * A row carries its own MIME type as well as the plain-text id the library
 * rows read when filing: that is what lets a list tell one of its own rows from
 * a file coming in off the desktop, since the payload itself cannot be read
 * until the drop.
 */
export const TRACK_MIME = 'application/x-selah-track';

/** The slot after the last row. */
export const END = '__end__';

const isTrack = (event: DragEvent) => [...event.dataTransfer.types].includes(TRACK_MIME);

export const useTrackReorder = (move: (id: string, beforeId: string | null) => void) => {
  // The row being carried, and the row the insertion line sits in front of.
  const [lifted, setLifted] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);

  const clear = () => {
    setLifted(null);
    setBefore(null);
  };

  return {
    lifted,
    before,
    /** Everything a row needs: `nextId` is the row under it, or null at the end. */
    row: (id: string, nextId: string | null) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
        event.dataTransfer.setData(TRACK_MIME, id);
        setLifted(id);
      },
      onDragEnd: clear,
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!isTrack(event)) return;

        // The list is a drop target for files as well, and a library row is one
        // for tracks — neither should answer a reorder.
        event.preventDefault();
        event.stopPropagation();

        const box = event.currentTarget.getBoundingClientRect();
        const below = event.clientY > box.top + box.height / 2;

        setBefore(below ? (nextId ?? END) : id);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!isTrack(event)) return;

        event.preventDefault();
        event.stopPropagation();

        const dragged = event.dataTransfer.getData(TRACK_MIME);
        const target = before;

        clear();

        if (dragged && target && dragged !== target) move(dragged, target === END ? null : target);
      },
    }),
  };
};
