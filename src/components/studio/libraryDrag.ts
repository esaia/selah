'use client';

import type { Category } from '@/lib/studio/AudioProvider';

import { useSortable } from './sortable';

/**
 * Reordering the music libraries by dragging.
 *
 * The same bargain the tracks make: no grip of its own, so the whole row is the
 * handle, and the list rearranges under the pointer rather than promising to.
 * A library lands in front of another, which is what the provider stores.
 *
 * All tracks is not in this list. It is not one of the operator's libraries but
 * the view of everything, and it stays at the top of both places that show it.
 */
export const useLibraryReorder = (
  categories: Category[],
  move: (id: string, beforeId: string | null) => void,
) =>
  useSortable(
    categories,
    category => category.id,
    (ids, moved) => move(moved, ids[ids.indexOf(moved) + 1] ?? null),
    { byHandle: false },
  );
