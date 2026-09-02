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
 *
 * What comes back is *which take* is playing — 0 for dark, otherwise 1 or 2,
 * alternating with every flash. A browser restarts a CSS animation only when
 * the animation's name changes, so a second Flash pressed while the first is
 * still blinking used to write the identical rule, change nothing, and go
 * unseen: the screen finished the first flash and then sat there while every
 * further press quietly extended the state that was hiding them. Two names for
 * one blink is what makes the second press land.
 */
export const useFlash = (at: number, now: number | null): number => {
  const [seen, setSeen] = useState(at);
  const [lit, setLit] = useState(0);

  if (at !== seen) {
    setSeen(at);

    // Only worth playing if it was fired within living memory: a screen opening
    // mid-service reads the stored run, and must not strobe at a flash from ten
    // minutes ago.
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

/**
 * The blinks themselves, four over the flash.
 *
 * The two keyframes are identical; which one is named is only how a flash
 * interrupts the one before it.
 */
export const flashAnimation = (lit: number) =>
  lit ? `${lit === 2 ? 'timer-flash-b' : 'timer-flash'} ${FLASH_MS / 4}ms ease-in-out 4` : undefined;
