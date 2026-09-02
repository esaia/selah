'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type PointerEvent } from 'react';

import { cn } from '@/lib/cn';
import { clampRailWidth, RAIL_MIN_WIDTH, RAIL_WIDTH_VAR, readRailWidth, writeRailWidth } from '@/lib/studio/railWidth';

import { AudioPlaylist } from './AudioPlaylist';
import { PreviewPanel } from './PreviewPanel';

/**
 * The output rail: what the projector is showing, and what the service is
 * going to play, in the fixed place a presentation app keeps them.
 *
 * Its width is a per-machine preference — the operator's desk screen and the
 * laptop they rehearse on want different splits — so it lives in this browser
 * rather than in the account, and reaches the layout as a CSS variable the
 * document sets before it paints. See `lib/studio/railWidth`.
 */
export const RightRail = () => {
  const [dragging, setDragging] = useState(false);

  // The blocking script in the root layout has normally set this already; this
  // covers the case where it could not run (a CSP, an extension) at the cost of
  // one frame at the default width.
  useLayoutEffect(() => writeRailWidth(readRailWidth()), []);

  // A rail sized on a wide screen must give the running order its room back on
  // a narrower one.
  useEffect(() => {
    const onResize = () => writeRailWidth(clampRailWidth(readRailWidth()));

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startResize = useCallback((event: PointerEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    setDragging(true);

    const startX = event.clientX;
    const startWidth = readRailWidth();

    // The handle is on the left edge, so dragging left widens the rail.
    const onMove = (move: globalThis.PointerEvent) =>
      writeRailWidth(clampRailWidth(startWidth + (startX - move.clientX)));

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
      style={{ width: `var(${RAIL_WIDTH_VAR}, ${RAIL_MIN_WIDTH}px)` }}
      className="relative hidden shrink-0 flex-col border-l border-studio-border bg-white lg:flex"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the output rail"
        onPointerDown={startResize}
        onDoubleClick={() => writeRailWidth(RAIL_MIN_WIDTH)}
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
