'use client';

import { useEffect, useRef } from 'react';

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
