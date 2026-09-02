'use client';

import { useCallback, useEffect, useState, useSyncExternalStore, type PointerEvent } from 'react';

import { cn } from '@/lib/cn';

import { AudioPlaylist } from './AudioPlaylist';
import { PreviewPanel } from './PreviewPanel';

/** The width it has always been, and the narrowest the preview stays useful. */
const MIN_WIDTH = 320;

/** Past this the rail is taking room the running order needs more. */
const MAX_WIDTH = 720;

const WIDTH_KEY = 'studioRailWidth';

/** Never wider than the window can spare, whatever was saved on a bigger one. */
const clampWidth = (width: number) =>
  Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 520)));

/**
 * The saved width, as an external store rather than state seeded by an effect.
 * The server has no window to clamp against, so it renders the default and the
 * client subscribes to the real value — which is what useSyncExternalStore is
 * for, and it avoids a render pass that exists only to correct the first one.
 */
const listeners = new Set<() => void>();
let snapshot: number | null = null;

const widthStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => {
    if (snapshot === null) {
      const saved = Number(localStorage.getItem(WIDTH_KEY));
      snapshot = clampWidth(Number.isFinite(saved) && saved > 0 ? saved : MIN_WIDTH);
    }

    return snapshot;
  },
  getServer: () => MIN_WIDTH,
  set: (width: number) => {
    snapshot = width;

    try {
      localStorage.setItem(WIDTH_KEY, String(width));
    } catch {
      // Non-critical.
    }

    listeners.forEach(listener => listener());
  },
};

/**
 * The output rail: what the projector is showing, and what the service is
 * going to play, in the fixed place a presentation app keeps them.
 *
 * Its width is a per-machine preference — the operator's desk screen and the
 * laptop they rehearse on want different splits — so it lives in this browser
 * rather than in the account.
 */
export const RightRail = () => {
  const width = useSyncExternalStore(widthStore.subscribe, widthStore.get, widthStore.getServer);
  const [dragging, setDragging] = useState(false);

  // A rail sized on a wide screen must give the running order its room back on
  // a narrower one.
  useEffect(() => {
    const onResize = () => widthStore.set(clampWidth(widthStore.get()));

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startResize = useCallback((event: PointerEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    setDragging(true);

    const startX = event.clientX;
    const startWidth = widthStore.get();

    // The handle is on the left edge, so dragging left widens the rail.
    const onMove = (move: globalThis.PointerEvent) => widthStore.set(clampWidth(startWidth + (startX - move.clientX)));

    const onUp = () => {
      setDragging(false);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, []);

  // Selecting the verse text behind the cursor while dragging looks broken.
  useEffect(() => {
    if (!dragging) return;

    const previous = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.userSelect = previous;
    };
  }, [dragging]);

  return (
    <aside
      style={{ width }}
      className="relative hidden shrink-0 flex-col border-l border-studio-border bg-white lg:flex"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the output rail"
        onPointerDown={startResize}
        onDoubleClick={() => widthStore.set(MIN_WIDTH)}
        title="Drag to resize · double-click to reset"
        className={cn(
          'absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize transition-colors duration-150',
          dragging ? 'bg-studio-accent/40' : 'hover:bg-studio-accent/20',
        )}
      />

      <PreviewPanel />

      <AudioPlaylist />
    </aside>
  );
};
