'use client';

import { useEffect, type DragEvent } from 'react';

export const DROP_ZONE = 'bg-studio-accent/5 outline-2 outline-dashed outline-studio-accent -outline-offset-4';

export const DROP_LINE = 'border-studio-accent';

export const leftZone = (event: DragEvent<HTMLElement>) =>
  !event.currentTarget.contains(event.relatedTarget as Node | null);

export const useDragEnded = (lit: boolean, clear: () => void) => {
  useEffect(() => {
    if (!lit) return;

    window.addEventListener('dragend', clear);
    window.addEventListener('drop', clear);

    return () => {
      window.removeEventListener('dragend', clear);
      window.removeEventListener('drop', clear);
    };
  }, [lit, clear]);
};
