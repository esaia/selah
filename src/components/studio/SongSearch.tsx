'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';

import { normalizeName, transliterate } from '@/lib/bible/passage';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { songDragProps } from './Setlist';

/**
 * The shortcut as this platform writes it, for the hint in the library header.
 *
 * Read after mount rather than while rendering: the console is server rendered,
 * and a hint decided by `navigator` is a different string on the server than in
 * the browser — which is a hydration mismatch, and throws the whole tree away.
 * Everyone gets the portable spelling for one paint; a Mac swaps it in.
 */
export const useSearchHint = () =>
  useSyncExternalStore(
    // Nothing to subscribe to: which keyboard is under the operator does not
    // change while the console is open.
    () => () => {},
    () => (/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘F' : 'Ctrl F'),
    () => 'Ctrl F',
  );

/**
 * Both spellings of a string: as written, and transliterated into Latin — the
 * same pair the book search indexes on, so "ami" finds ამის… without switching
 * the keyboard to Georgian.
 */
const keysOf = (value: string) => {
  const normalized = normalizeName(value);

  return [normalized, normalizeName(transliterate(normalized))];
};

interface Entry {
  song: Song;
  keys: string[];
  lines: { line: string; keys: string[] }[];
}

/**
 * Everything a song can be found by, built once per library rather than per
 * keystroke: the title, and every line of every slide so a half-remembered
 * phrase finds the song it belongs to.
 */
const indexOf = (songs: Song[]): Entry[] =>
  songs.map(song => ({
    song,
    keys: keysOf(song.title),
    lines: song.slides
      .flatMap(slide => slide.text.split('\n'))
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => ({ line, keys: keysOf(line) })),
  }));

interface Result {
  song: Song;
  rank: number;
  line?: string;
}

/** Title prefix, then title substring, then a line of the lyrics. */
const matchOf = (entry: Entry, probes: string[]) => {
  const hit = (test: (key: string, probe: string) => boolean) =>
    entry.keys.some(key => probes.some(probe => test(key, probe)));

  if (hit((key, probe) => key.startsWith(probe))) return { rank: 0 };
  if (hit((key, probe) => key.includes(probe))) return { rank: 1 };

  const found = entry.lines.find(({ keys }) => keys.some(key => probes.some(probe => key.includes(probe))));

  return found ? { rank: 2, line: found.line } : null;
};

/**
 * ProPresenter's ⌘F: a palette over the workspace that searches the whole song
 * library from anywhere, without reaching for the Lyrics tab first. Arrow keys
 * walk the results, Enter opens the song, ⇧Enter drops it on the playlist.
 *
 * It floats without dimming the room behind it, and its backdrop takes no
 * pointer events, so a row can be dragged straight out onto the playlist while
 * the palette stays open for the next song.
 */
export const SongSearch = ({ onClose }: { onClose: () => void }) => {
  const { songs, setTab, setActiveSongId, placeInSetlist, setlist } = useStudio();

  // Mounted only while the palette is open, so it always opens empty.
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  // Held in a ref so the outside-click effect keys on `open` alone.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => indexOf(songs), [songs]);

  const results = useMemo((): Result[] => {
    const needle = normalizeName(query);

    if (!needle) return songs.map(song => ({ song, rank: 0 }));

    // A Latin query stays itself; a Georgian one is folded to Latin too, so
    // either keyboard reaches either spelling of the library.
    const probes = [...new Set([needle, normalizeName(transliterate(needle))])];

    return index
      .flatMap<Result>(entry => {
        const match = matchOf(entry, probes);

        return match ? [{ song: entry.song, ...match }] : [];
      })
      .sort((a, b) => a.rank - b.rank || a.song.title.localeCompare(b.song.title));
  }, [index, query, songs]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // With the backdrop transparent to the mouse, close-on-outside-click has to
  // come from the document. `mousedown` rather than `click`, so it fires before
  // whatever was clicked behind takes focus.
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) onCloseRef.current();
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Keep the highlighted row in view while the arrows walk past the fold.
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  const openSong = (song: Song) => {
    setTab('lyrics');
    setActiveSongId(song.id);
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor(current => (results.length === 0 ? 0 : (current + 1) % results.length));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(current => (results.length === 0 ? 0 : (current - 1 + results.length) % results.length));
      return;
    }

    if (event.key === 'Enter') {
      const picked = results[cursor]?.song;

      if (!picked) return;

      event.preventDefault();

      if (event.shiftKey) {
        placeInSetlist(picked.id, setlist.length);
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
              setCursor(0);
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
              {...songDragProps(song.id)}
              title="Drag onto the playlist"
              onMouseMove={() => setCursor(position)}
              onClick={() => openSong(song)}
              className={cn(
                'flex w-full cursor-grab items-baseline gap-3 px-4 py-2 text-left',
                position === cursor && 'bg-studio-accent/10',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-studio-text">{song.title}</span>
                {line ? <span className="mt-0.5 block truncate text-[11px] text-studio-muted">{line}</span> : null}
              </span>

              <span className="shrink-0 text-[11px] text-studio-faint">{song.slides.length} slides</span>
            </div>
          ))}

          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-studio-faint">
              {songs.length === 0 ? 'No songs in the library yet.' : `Nothing matches “${query.trim()}”.`}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-studio-divider px-4 py-2 text-[11px] text-studio-faint">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>⇧↵ add to playlist</span>
          <span>drag onto the playlist</span>
          <span className="ml-auto">esc close</span>
        </div>
      </div>
    </div>
  );
};
