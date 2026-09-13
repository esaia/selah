'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';

import { normalizeName, transliterate } from '@/lib/bible/passage';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { cardLangOf, textOf } from '@/lib/lyrics/langs';
import { homeOf } from '@/lib/lyrics/lists';

import { songDragProps } from '@/components/studio/lyrics/SongRail';

export const useSearchHint = () =>
  useSyncExternalStore(
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘F' : 'Ctrl F'),
    () => 'Ctrl F',
  );

const keysOf = (value: string) => {
  const normalized = normalizeName(value);

  return [normalized, normalizeName(transliterate(normalized))];
};

const marked = (text: string, probes: string[]) =>
  text.split(/(\s+)/).map(part => ({
    part,
    hit: part.trim().length > 0 && keysOf(part).some(key => probes.some(probe => key.includes(probe))),
  }));

const Marked = ({ text, probes }: { text: string; probes: string[] }) => (
  <>
    {marked(text, probes).map(({ part, hit }, index) =>
      hit ? (
        <span key={index} className="text-studio-accent-soft">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      ),
    )}
  </>
);

interface Entry {
  song: Song;
  keys: string[];
  lines: { line: string; keys: string[] }[];
}

const indexOf = (songs: Song[]): Entry[] =>
  songs.map(song => ({
    song,
    keys: keysOf(song.title),
    lines: song.slides
      .flatMap(slide => [slide.text, ...Object.values(slide.alt ?? {})])
      .flatMap(text => text.split('\n'))
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => ({ line, keys: keysOf(line) })),
  }));

interface Result {
  song: Song;
  rank: number;
  line?: string;
}

const matchOf = (entry: Entry, probes: string[]) => {
  const hit = (test: (key: string, probe: string) => boolean) =>
    entry.keys.some(key => probes.some(probe => test(key, probe)));

  if (hit((key, probe) => key.startsWith(probe))) return { rank: 0 };
  if (hit((key, probe) => key.includes(probe))) return { rank: 1 };

  const found = entry.lines.find(({ keys }) => keys.some(key => probes.some(probe => key.includes(probe))));

  return found ? { rank: 2, line: found.line } : null;
};

export const SongSearch = ({ onClose }: { onClose: () => void }) => {
  const { songs, setTab, setActiveSongId, placeInPlaylist, playlists, open, libraries } = useStudio();

  const libraryOf = (song: Song) =>
    libraries.find(list => list.id === (song.libraryId ?? homeOf(libraries)))?.name ?? '';

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(-1);

  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => indexOf(songs), [songs]);

  const probes = useMemo(() => {
    const needle = normalizeName(query);

    return needle ? [...new Set([needle, normalizeName(transliterate(needle))])] : [];
  }, [query]);

  const results = useMemo((): Result[] => {
    const needle = normalizeName(query);

    if (!needle) return songs.map(song => ({ song, rank: 0 }));

    return index
      .flatMap<Result>(entry => {
        const match = matchOf(entry, probes);

        return match ? [{ song: entry.song, ...match }] : [];
      })
      .sort((a, b) => a.rank - b.rank || a.song.title.localeCompare(b.song.title));
  }, [index, probes, query, songs]);

  const previewing = results[cursor]?.song ?? null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) onCloseRef.current();
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    if (cursor >= 0) listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  const openSong = (song: Song) => {
    setTab('lyrics');
    setActiveSongId(song.id);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor(current => (results.length === 0 ? -1 : (current + 1) % results.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(current => {
        if (results.length === 0) return -1;

        return current < 0 ? results.length - 1 : (current - 1 + results.length) % results.length;
      });
      return;
    }

    if (event.key === 'Enter') {
      const picked = results[cursor]?.song;

      if (!picked) return;

      event.preventDefault();

      if (event.shiftKey && open.kind === 'playlist') {
        const list = playlists.find(item => item.id === open.id);

        void placeInPlaylist(open.id, [picked.id], list?.songs.length ?? 0).catch(() => {});
        onClose();
        return;
      }

      openSong(picked);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] flex justify-center px-4 pt-[13vh]">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search the song library"
        className="pointer-events-auto flex h-fit max-h-[70vh] w-full max-w-md flex-col overflow-hidden
          rounded-studio-lg bg-studio-bg shadow-studio-modal ring-1 ring-studio-border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <HiOutlineSearch className="shrink-0 text-lg text-studio-faint" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Library"
            onChange={event => {
              setQuery(event.target.value);
              setCursor(-1);
            }}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base text-studio-text placeholder:text-studio-faint
              focus:outline-none"
          />
        </div>

        <div ref={listRef} className="studio-scroll min-h-0 flex-1 overflow-y-auto border-t border-studio-divider">
          {results.map(({ song, line }, position) => (
            <div
              key={song.id}
              {...songDragProps(song.id, song.title)}
              onDragEnd={onClose}
              onDragStart={event => {
                songDragProps(song.id, song.title).onDragStart(event);
                setCursor(position);
              }}
              title="Click to see it · drag onto a playlist · double-click to open"
              onClick={() => setCursor(position)}
              onDoubleClick={() => openSong(song)}
              className={cn(
                'flex w-full cursor-pointer items-baseline gap-3 px-4 py-2 text-left',
                position === cursor && 'bg-studio-raised',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-studio-text">
                  <Marked text={song.title} probes={probes} />
                </span>
                {line ? (
                  <span className="mt-0.5 block truncate text-[11px] text-studio-muted">
                    <Marked text={line} probes={probes} />
                  </span>
                ) : null}
              </span>

              <span className="flex shrink-0 items-baseline gap-3 text-[11px] text-studio-faint">
                {libraryOf(song) ? <span className="max-w-32 truncate">{libraryOf(song)}</span> : null}
                <span>{song.slides.length} slides</span>
              </span>
            </div>
          ))}

          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-studio-faint">
              {songs.length === 0 ? 'No songs in the library yet.' : `Nothing matches “${query.trim()}”.`}
            </p>
          ) : null}
        </div>

        {previewing ? (
          <div className="shrink-0 border-t border-studio-divider px-4 py-2">
            <div className="studio-scroll flex gap-1.5 overflow-x-auto">
              {previewing.slides.slice(0, 8).map((slide, index) => (
                <span
                  key={slide.id}
                  className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-[3px]
                    bg-studio-slide p-1.5 text-center text-[9px] leading-tight text-white/90"
                >
                  <span className="line-clamp-4">
                    {textOf(previewing, slide, cardLangOf(previewing)).split('\n').join(' ') || `Slide ${index + 1}`}
                  </span>
                </span>
              ))}

              {previewing.slides.length > 8 ? (
                <span className="flex shrink-0 items-center px-1 text-[11px] text-studio-faint">
                  +{previewing.slides.length - 8}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex shrink-0 gap-3 border-t border-studio-divider px-4 py-2 text-[11px] text-studio-faint">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>⇧↵ add to playlist</span>
          <span>drag onto a playlist</span>
          <span className="ml-auto">esc close</span>
        </div>
      </div>
    </div>
  );
};
