'use client';

import { useEffect, useRef } from 'react';

/**
 * Persist `value` a beat after it stops changing.
 *
 * The console mutates its workspace constantly — a slider drag is dozens of
 * renders — and every one of those used to be a synchronous localStorage write.
 * Against a database they have to be coalesced, and the first render must not
 * write back what it just read.
 */
export const useDebouncedSave = <T>(value: T, save: (value: T) => void, delay = 600) => {
  const saveRef = useRef(save);
  const loaded = useRef(false);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }

    const timer = setTimeout(() => saveRef.current(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);
};
