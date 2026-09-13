'use client';

import { useEffect, useState } from 'react';

import { FLASH_MS } from '@/lib/timer/model';

export const useFlash = (at: number, now: number | null): number => {
  const [seen, setSeen] = useState(at);
  const [lit, setLit] = useState(0);

  if (at !== seen) {
    setSeen(at);

    const worth = now !== null && now - at <= FLASH_MS * 4;

    setLit(current => (worth ? (current === 1 ? 2 : 1) : 0));
  }

  useEffect(() => {
    if (!lit) return;

    const id = setTimeout(() => setLit(0), FLASH_MS);

    return () => clearTimeout(id);
  }, [lit]);

  return lit;
};

export const flashAnimation = (lit: number) =>
  lit ? `${lit === 2 ? 'timer-flash-b' : 'timer-flash'} ${FLASH_MS / 4}ms ease-in-out 4` : undefined;
