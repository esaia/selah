'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ListPlus, Loader2, Pencil, Trash2, Upload, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { parseDroppedFiles } from '@/lib/lyrics/propresenter';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { SongEditor } from './SongEditor';

/**
 * Songs and the setlist.
 *
 * A song is a title and an ordered list of slides — the same shape ProPresenter
 * exports, which is where most of them come from. Going live on a slide follows
 * the same path a verse does, so the projector and the stream need to know
 * nothing about songs at all.
 */
export const LyricsPanel = () => {
  const {
    songs,
    setlist,
    activeSongId,
    setActiveSongId,
    importSongs,
    removeSong,
    placeInSetlist,
    removeFromSetlist,
    live,
    selectLyric,
    cardSize,
  } = useStudio();

  const [filter, setFilter] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Song | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = songs.find(song => song.id === activeSongId) ?? null;

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    return needle ? songs.filter(song => song.title.toLowerCase().includes(needle)) : songs;
  }, [filter, songs]);

  const ordered = useMemo(
    () => setlist.map(id => songs.find(song => song.id === id)).filter((song): song is Song => Boolean(song)),
    [setlist, songs],
  );

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];

    event.target.value = '';

    if (files.length === 0) return;

    setImporting(true);
    setError('');

    try {
      const parsed = await parseDroppedFiles(files);

      if (parsed.length === 0) {
        setError('Nothing in there looked like a ProPresenter document.');
        return;
      }

      await importSongs(parsed);
    } catch {
      setError('That file could not be read.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="border-ink-850 flex w-64 shrink-0 flex-col border-r">
        <div className="border-ink-850 border-b p-3">
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Find a song"
            className="border-ink-800 bg-ink-900 placeholder:text-ink-700 focus:border-brand-500 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none"
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border-ink-800 text-ink-300 hover:border-ink-700 mt-2 flex w-full items-center justify-center gap-2 rounded-md border py-1.5 text-xs transition hover:text-white"
          >
            {importing ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
            Import from ProPresenter
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".pro,.proBundle,.zip"
            multiple
            onChange={onFiles}
            className="hidden"
          />

          {error ? <p className="text-live mt-2 text-xs">{error}</p> : null}
        </div>

        <ul className="studio-scroll flex-1 overflow-y-auto py-1">
          {shown.map(song => (
            <li key={song.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => setActiveSongId(song.id)}
                className={cn(
                  'flex-1 truncate px-3 py-1.5 text-left text-sm transition',
                  activeSongId === song.id ? 'bg-ink-850 text-white' : 'text-ink-300 hover:bg-ink-900',
                )}
              >
                {song.title}
              </button>

              <div className="hidden gap-0.5 pr-2 group-hover:flex">
                <button
                  type="button"
                  onClick={() => placeInSetlist(song.id, setlist.length)}
                  title="Add to the setlist"
                  className="text-ink-500 hover:text-white"
                >
                  <ListPlus className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(song)}
                  title="Edit"
                  className="text-ink-500 hover:text-white"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeSong(song.id)}
                  title="Delete"
                  className="text-ink-500 hover:text-live"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}

          {shown.length === 0 ? (
            <li className="text-ink-700 px-3 py-6 text-center text-xs">
              No songs yet. Import a ProPresenter bundle to fill the library in one go.
            </li>
          ) : null}
        </ul>

        {ordered.length > 0 ? (
          <div className="border-ink-850 border-t p-3">
            <h3 className="text-ink-500 text-xs">Setlist</h3>

            <ol className="mt-2 space-y-1">
              {ordered.map((song, index) => (
                <li key={song.id} className="group flex items-center gap-2 text-xs">
                  <span className="text-ink-700 w-4">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setActiveSongId(song.id)}
                    className="text-ink-300 flex-1 truncate text-left hover:text-white"
                  >
                    {song.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromSetlist(song.id)}
                    aria-label={`Remove ${song.title} from the setlist`}
                    className="text-ink-700 hidden hover:text-white group-hover:block"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div className="studio-scroll flex-1 overflow-y-auto p-4">
        {active ? (
          <>
            <h2 className="text-sm">{active.title}</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {active.slides.map((slide, index) => {
                const isLive = live?.kind === 'lyrics' && live.songId === active.id && live.slideIndex === index;

                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => selectLyric(active, index)}
                    style={{ width: cardSize }}
                    className={cn(
                      'min-h-28 rounded-lg border p-3 text-left text-xs leading-relaxed whitespace-pre-line transition',
                      isLive
                        ? 'border-live bg-live/15'
                        : 'border-ink-800 bg-ink-900 hover:border-ink-700 hover:bg-ink-850',
                    )}
                  >
                    {slide.text}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-ink-700 py-24 text-center text-sm">Pick a song to see its slides.</p>
        )}
      </div>

      {editing ? <SongEditor song={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
};
