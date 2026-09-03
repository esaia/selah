'use client';

import type { Track } from '@/lib/studio/AudioProvider';

import { useSortable } from './sortable';

/**
 * Reordering the music by dragging.
 *
 * The rows carry no grip of their own — the play button is their rail — so the
 * whole row is the handle. Everything else is the console's ordinary sortable:
 * the list rearranges under the pointer and the move is written on release.
 *
 * A track lands in front of another, which is what the provider stores, so the
 * order is committed as the one row that moved rather than as a renumbering of
 * the whole list.
 */
export const useTrackReorder = (shown: Track[], move: (id: string, beforeId: string | null) => void) =>
  useSortable(
    shown,
    track => track.id,
    (ids, moved) => move(moved, ids[ids.indexOf(moved) + 1] ?? null),
    { byHandle: false },
  );
