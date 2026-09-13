'use client';

import type { Category } from '@/lib/studio/AudioProvider';

import { useSortable } from '@/components/studio/shared/sortable';

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
