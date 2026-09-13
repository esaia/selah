'use client';

import type { Track } from '@/lib/studio/AudioProvider';

import { useSortable } from '@/components/studio/shared/sortable';

export const useTrackReorder = (shown: Track[], move: (id: string, beforeId: string | null) => void) =>
  useSortable(
    shown,
    track => track.id,
    (ids, moved) => move(moved, ids[ids.indexOf(moved) + 1] ?? null),
    { byHandle: false },
  );
