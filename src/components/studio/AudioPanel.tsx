'use client';

import { useState, type ChangeEvent } from 'react';
import { ListPlus, Pause, Play, Plus, Square, Trash2, Upload, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAudio, type Track } from '@/lib/studio/AudioProvider';

const clock = (ms: number | null | undefined) => {
  if (!ms) return '';

  const total = Math.round(ms / 1000);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * The music library.
 *
 * Playback happens on the console's machine only — it never reaches the
 * projector — because the sound goes to the hall's desk, not through the
 * screen.
 */
export const AudioPanel = () => {
  const {
    tracks,
    playlist,
    current,
    playing,
    position,
    duration,
    volume,
    loop,
    fadeMs,
    missing,
    error,
    addUrlTrack,
    addLocalFiles,
    removeTrack,
    addToPlaylist,
    removeFromPlaylist,
    play,
    togglePlay,
    stop,
    seek,
    setVolume,
    setLoop,
    setFadeMs,
  } = useAudio();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    void addLocalFiles([...(event.target.files ?? [])]);
    event.target.value = '';
  };

  const row = (track: Track, inPlaylist: boolean) => {
    const unavailable = missing.has(track.id);

    return (
      <li key={track.id} className="group flex items-center gap-2 px-3 py-1.5 text-sm">
        <button
          type="button"
          onClick={() => play(track)}
          disabled={unavailable}
          aria-label={`Play ${track.title}`}
          className="text-ink-500 hover:text-white disabled:opacity-30"
        >
          <Play className="size-3.5" />
        </button>

        <span className={cn('flex-1 truncate', current?.id === track.id ? 'text-brand-400' : 'text-ink-300')}>
          {track.title}
          {unavailable ? <span className="text-ink-700 ml-2 text-xs">on another computer</span> : null}
        </span>

        <span className="text-ink-700 text-xs">{clock(track.durationMs)}</span>

        <div className="hidden gap-1 group-hover:flex">
          <button
            type="button"
            onClick={() => (inPlaylist ? removeFromPlaylist(track.id) : addToPlaylist(track.id))}
            aria-label={inPlaylist ? 'Remove from the playlist' : 'Add to the playlist'}
            className="text-ink-500 hover:text-white"
          >
            {inPlaylist ? <X className="size-3.5" /> : <ListPlus className="size-3.5" />}
          </button>

          {inPlaylist ? null : (
            <button
              type="button"
              onClick={() => void removeTrack(track.id)}
              aria-label={`Delete ${track.title}`}
              className="text-ink-500 hover:text-live"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-ink-850 flex items-center gap-3 border-b p-3">
        <label className="border-ink-800 text-ink-300 hover:border-ink-700 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition hover:text-white">
          <Upload className="size-3" />
          Add files
          <input type="file" accept="audio/*" multiple onChange={onFiles} className="hidden" />
        </label>

        <div className="flex flex-1 items-center gap-2">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Title"
            className="border-ink-800 bg-ink-900 placeholder:text-ink-700 w-32 rounded-md border px-2.5 py-1.5 text-xs outline-none"
          />
          <input
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://… (a track by URL)"
            className="border-ink-800 bg-ink-900 placeholder:text-ink-700 flex-1 rounded-md border px-2.5 py-1.5 text-xs outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!url.trim()) return;

              void addUrlTrack({ title: title.trim() || url.split('/').pop() || 'Track', src: url.trim() });
              setUrl('');
              setTitle('');
            }}
            aria-label="Add the track"
            className="text-ink-500 hover:text-white"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {error ? <p className="text-live px-3 py-2 text-xs">{error}</p> : null}

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <ul className="studio-scroll border-ink-850 overflow-y-auto border-r py-1">
          <li className="text-ink-700 px-3 py-1 text-xs">Library</li>
          {tracks.map(track => row(track, false))}
          {tracks.length === 0 ? (
            <li className="text-ink-700 px-3 py-6 text-center text-xs">
              Nothing yet. Files you add stay on this computer.
            </li>
          ) : null}
        </ul>

        <ul className="studio-scroll overflow-y-auto py-1">
          <li className="text-ink-700 px-3 py-1 text-xs">Playlist</li>
          {playlist
            .map(id => tracks.find(track => track.id === id))
            .filter((track): track is Track => Boolean(track))
            .map(track => row(track, true))}
        </ul>
      </div>

      <div className="border-ink-850 flex items-center gap-4 border-t px-3 py-2.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!current}
          aria-label={playing ? 'Pause' : 'Play'}
          className="text-ink-300 hover:text-white disabled:opacity-30"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>

        <button
          type="button"
          onClick={stop}
          disabled={!current}
          aria-label="Stop"
          className="text-ink-300 hover:text-white disabled:opacity-30"
        >
          <Square className="size-4" />
        </button>

        <span className="text-ink-500 w-40 truncate text-xs">{current?.title ?? 'Nothing playing'}</span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.5}
          value={position}
          onChange={event => seek(Number(event.target.value))}
          className="accent-brand-500 flex-1"
          aria-label="Position"
        />

        <label className="text-ink-500 flex items-center gap-2 text-xs">
          Vol
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={event => setVolume(Number(event.target.value))}
            className="accent-brand-500 w-20"
          />
        </label>

        <label className="text-ink-500 flex items-center gap-2 text-xs" title="Fade in and out, in milliseconds">
          Fade
          <input
            type="range"
            min={0}
            max={5000}
            step={100}
            value={fadeMs}
            onChange={event => setFadeMs(Number(event.target.value))}
            className="accent-brand-500 w-20"
          />
        </label>

        <label className="text-ink-500 flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={loop}
            onChange={event => setLoop(event.target.checked)}
            className="accent-brand-500"
          />
          Loop
        </label>
      </div>
    </div>
  );
};
