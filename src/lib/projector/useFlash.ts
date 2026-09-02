'use client';

import { useEffect, useState } from 'react';

import { FLASH_MS } from '@/lib/timer/model';

/**
 * A flash is an event, not a state: the console bumps a stamp, and every screen
 * that sees a *new* value plays it once. Read during render rather than in an
 * effect, so the pulse lands on the same paint as the payload.
 *
 * The run has one stamp and each message has its own, so an operator can blink
 * a single note without strobing everything else — which is why this is a hook
 * a screen calls once per thing that can be flashed, and not a flag on a state.
 */
export const useFlash = (at: number, now: number | null) => {
  const [seen, setSeen] = useState(at);
  const [flashingAt, setFlashingAt] = useState(0);

  if (at !== seen) {
    setSeen(at);

    // Only worth playing if it was fired within living memory: a screen opening
    // mid-service reads the stored run, and must not strobe at a flash from ten
    // minutes ago.
    setFlashingAt(now !== null && now - at <= FLASH_MS * 4 ? at : 0);
  }

  useEffect(() => {
    if (!flashingAt) return;

    const id = setTimeout(() => setFlashingAt(0), FLASH_MS);

    return () => clearTimeout(id);
  }, [flashingAt]);

  return flashingAt > 0;
};

/** The blinks themselves, four over the flash. */
export const flashAnimation = (lit: boolean) =>
  lit ? `timer-flash ${FLASH_MS / 4}ms ease-in-out 4` : undefined;
