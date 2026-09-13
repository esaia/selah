'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal, useModalClose } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import type { Song } from '@/lib/types';

export const ImportPicker = ({
  songs,
  allowance,
  onCancel,
  onImport,
}: {
  songs: Song[];
  allowance: number;
  onCancel: () => void;
  onImport: (chosen: Song[]) => void;
}) => {
  const closeRef = useModalClose();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(songs.slice(0, allowance).map(song => song.title)));

  const full = picked.size >= allowance;

  const toggle = (title: string) =>
    setPicked(current => {
      const next = new Set(current);

      if (next.has(title)) next.delete(title);
      else if (next.size < allowance) next.add(title);

      return next;
    });

  return (
    <Modal
      open
      onClose={onCancel}
      closeRef={closeRef}
      width="max-w-xl"
      title={`Choose what to bring in`}
      footer={
        <>
          <p className="mr-auto text-xs text-studio-muted">
            <span className={full ? 'text-studio-accent' : 'text-studio-text'}>
              {picked.size} of {allowance}
            </span>{' '}
            chosen, out of {songs.length} in the bundle
          </p>

          <Button onClick={() => closeRef.current?.()}>Cancel</Button>

          <Button
            variant="accent"
            disabled={picked.size === 0}
            onClick={() => closeRef.current?.(() => onImport(songs.filter(song => picked.has(song.title))))}
          >
            Import {picked.size === 1 ? 'this song' : `these ${picked.size}`}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-studio-muted">
        This bundle has {songs.length} songs and there is room for {allowance}. Tick the ones you need — the rest of
        the bundle is untouched, so you can come back for more once you have made room, or on Pro.
      </p>

      <ul className="studio-scroll mt-3 max-h-80 overflow-y-auto rounded-studio border border-studio-border">
        {songs.map(song => {
          const on = picked.has(song.title);

          return (
            <li key={song.title} className="border-b border-studio-divider last:border-b-0">
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150',
                  on ? 'text-studio-text' : 'text-studio-muted',
                  !on && full ? 'opacity-45' : 'hover:bg-studio-surface',
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(song.title)}
                  className="size-3.5 shrink-0 accent-[var(--color-studio-accent)]"
                />

                <span className="min-w-0 flex-1 truncate">{song.title}</span>

                <span className="shrink-0 text-[11px] text-studio-faint">
                  {song.slides.length} {song.slides.length === 1 ? 'slide' : 'slides'}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};
