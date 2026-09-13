'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type PointerEvent } from 'react';

import { cn } from '@/lib/cn';
import { clampRailWidth, RAIL_MIN_WIDTH, RAIL_WIDTH_VAR, readRailWidth, writeRailWidth } from '@/lib/studio/railWidth';

import { AudioPlaylist } from '@/components/studio/audio/AudioPlaylist';
import { PreviewPanel } from '@/components/studio/preview/PreviewPanel';

export const RightRail = ({ onSettings }: { onSettings: (tab: string) => void }) => {
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => writeRailWidth(readRailWidth()), []);

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
      className="relative hidden shrink-0 flex-col border-l border-studio-border bg-studio-bg lg:flex"
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

      <PreviewPanel onSettings={onSettings} />

      <AudioPlaylist />
    </aside>
  );
};
