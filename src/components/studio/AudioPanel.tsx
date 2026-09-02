'use client';

import { useState, type ChangeEvent, type DragEvent } from 'react';
import { Check, Music, Play, Plus, Trash2, Upload } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAudio, type Track } from '@/lib/studio/AudioProvider';

import { DROP_ZONE } from './dropZone';
import { END, useTrackReorder } from './trackDrag';

/** Every track, as opposed to one of the operator's libraries. */
const ALL = '__all__';

const clock = (ms: number | null | undefined) => {
  if (!ms) return '';

  const total = Math.round(ms / 1000);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * One library in the left column.
 *
 * It is a drop target as well as a filter: filing a track is dragging it onto
 * the library it belongs in, which is how a presentation app does it and saves
 * a menu on every row.
 */
const LibraryRow = ({
  label,
  count,
  selected,
  onSelect,
  onDropTrack,
  onDelete,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onDropTrack: (event: DragEvent) => void;
  onDelete?: () => void;
}) => {
  const [over, setOver] = useState(false);

  return (
    <li
      onDragOver={event => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        event.preventDefault();
        setOver(false);
        onDropTrack(event);
      }}
      className={cn(
        'group/library flex items-center gap-2 border-l-2 py-1.5 pr-2 pl-2.5 text-xs transition-colors duration-150',
        selected
          ? 'border-studio-accent bg-studio-surface text-studio-text'
          : 'border-transparent text-studio-muted hover:bg-studio-surface',
        // Filing a track is a commitment, so the row it would go into is filled
        // rather than outlined: it is unmistakable at a glance mid-service.
        over && 'border-studio-accent bg-studio-accent text-white',
      )}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Music className={cn('size-3.5 shrink-0', over ? 'text-white' : 'text-studio-faint')} />
        <span className={cn('min-w-0 flex-1 truncate', selected && 'font-semibold')}>{label}</span>
      </button>

      {/* The count and the delete share one slot of fixed width, so revealing
          the second does not shove the row's contents sideways — the old hover
          added a control and moved everything the pointer was aiming at. */}
      <span className="relative flex size-6 shrink-0 items-center justify-end">
        <span
          className={cn(
            'text-[11px] tabular-nums transition-opacity duration-150',
            over ? 'text-white/80' : 'text-studio-faint',
            onDelete && 'group-hover/library:opacity-0 group-focus-within/library:opacity-0',
          )}
        >
          {count || ''}
        </span>

        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete the ${label} library`}
            title="Delete this library — the tracks themselves stay"
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-studio opacity-0 transition',
              'duration-150 group-hover/library:opacity-100 focus-visible:opacity-100 focus:outline-none',
              'focus-visible:ring-2 focus-visible:ring-studio-accent/40',
              over ? 'text-white' : 'text-studio-faint hover:text-studio-danger',
            )}
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </span>
    </li>
  );
};

/**
 * The music library: every track this account has, and the libraries the
 * operator files them into.
 *
 * There is no separate queue. A library *is* the running order — the one a
 * service needs is made by making a library for it — so a track is in exactly
 * one place and the rail plays straight out of it.
 *
 * Playback happens on the console's machine only — it never reaches the
 * projector — because the sound goes to the hall's desk, not through the
 * screen.
 */
export const AudioPanel = () => {
  const {
    tracks,
    categories,
    current,
    missing,
    error,
    addUrlTrack,
    addLocalFiles,
    removeTrack,
    addCategory,
    removeCategory,
    setTrackCategory,
    trackList,
    moveTrack,
    play,
  } = useAudio();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  // Which library the track column is showing, and the name being typed for a
  // new one. A library deleted while it is open falls back to everything.
  const [library, setLibrary] = useState(ALL);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  // Dragging: a file coming in from the desktop, and the row being moved —
  // onto a library to file it, or between rows to reorder the list.
  const [filesOver, setFilesOver] = useState(false);

  const open = categories.some(category => category.id === library) ? library : ALL;
  const shown = trackList(open === ALL ? null : open);

  // Reordering is scoped to the list being looked at: a library keeps its own
  // running order, and All tracks keeps its own.
  const reorder = useTrackReorder((id, beforeId) => void moveTrack(id, beforeId, open === ALL ? null : open));

  const file = (event: DragEvent, categoryId: string | null) => {
    const id = event.dataTransfer.getData('text/plain');

    if (id && tracks.some(track => track.id === id)) void setTrackCategory(id, categoryId);
  };

  // Files dropped into the track column are filed where the operator is
  // looking: they have already said which library they mean by opening it.
  const importFiles = async (event: DragEvent) => {
    const added = await addLocalFiles([...event.dataTransfer.files]);

    if (open !== ALL) await Promise.all(added.map(track => setTrackCategory(track.id, open)));
  };

  const create = () => {
    const trimmed = name.trim();

    setNaming(false);
    setName('');

    if (trimmed) void addCategory(trimmed);
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    void addLocalFiles([...(event.target.files ?? [])]);
    event.target.value = '';
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-studio-divider flex flex-wrap items-center gap-3 border-b p-3">
        <label className="border-studio-border text-studio-text hover:border-studio-faint flex shrink-0 cursor-pointer items-center gap-2 rounded-studio border px-2.5 py-1.5 text-xs transition hover:text-studio-text">
          <Upload className="size-3" />
          Add files
          <input type="file" accept="audio/*" multiple onChange={onFiles} className="hidden" />
        </label>

        <div className="flex min-w-[16rem] flex-1 items-center gap-2">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Title"
            className="border-studio-border bg-white placeholder:text-studio-faint w-20 shrink-0 rounded-studio border px-2.5 py-1.5 text-xs outline-none sm:w-32"
          />
          <input
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://… (a track by URL)"
            className="border-studio-border bg-white placeholder:text-studio-faint min-w-0 flex-1 rounded-studio border px-2.5 py-1.5 text-xs outline-none"
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
            className="text-studio-muted shrink-0 hover:text-studio-text"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {error ? <p className="text-studio-danger px-3 py-2 text-xs">{error}</p> : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[14rem_1fr] sm:grid-rows-1">
        {/* The libraries themselves. A track is filed by dragging it onto one,
            and unfiled by dragging it back onto All tracks. */}
        <ul
          className="studio-scroll border-studio-divider max-h-40 overflow-y-auto border-b py-1 sm:max-h-none
            sm:border-r sm:border-b-0"
        >
          <li
            className="text-studio-faint flex items-center justify-between gap-2 px-3 py-1.5 text-[11px]
              font-semibold tracking-wider uppercase"
          >
            Libraries
            <button
              type="button"
              onClick={() => setNaming(true)}
              aria-label="New library"
              title="New library"
              className="text-studio-muted hover:text-studio-text"
            >
              <Plus className="size-3.5" />
            </button>
          </li>

          <LibraryRow
            label="All tracks"
            count={tracks.length}
            selected={open === ALL}
            onSelect={() => setLibrary(ALL)}
            onDropTrack={event => file(event, null)}
          />

          {categories.map(category => (
            <LibraryRow
              key={category.id}
              label={category.name}
              count={tracks.filter(track => (track.categoryId ?? null) === category.id).length}
              selected={open === category.id}
              onSelect={() => setLibrary(category.id)}
              onDropTrack={event => file(event, category.id)}
              onDelete={() => void removeCategory(category.id)}
            />
          ))}

          {naming ? (
            <li className="flex items-center gap-1.5 px-3 py-1.5">
              <input
                autoFocus
                value={name}
                onChange={event => setName(event.target.value)}
                onBlur={create}
                onKeyDown={event => {
                  if (event.key === 'Enter') create();
                  if (event.key === 'Escape') {
                    setNaming(false);
                    setName('');
                  }
                }}
                placeholder="Library name"
                className="border-studio-border placeholder:text-studio-faint min-w-0 flex-1 rounded-studio border
                  bg-white px-2 py-1 text-xs outline-none"
              />
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={create}
                aria-label="Create the library"
                className="text-studio-muted hover:text-studio-text"
              >
                <Check className="size-3.5" />
              </button>
            </li>
          ) : null}
        </ul>

        {/* Files dropped here are added, and filed straight into the library
            that is open. */}
        <ul
          onDragOver={event => {
            if (![...event.dataTransfer.types].includes('Files')) return;

            event.preventDefault();
            setFilesOver(true);
          }}
          onDragLeave={event => {
            if (event.currentTarget === event.target) setFilesOver(false);
          }}
          onDrop={event => {
            event.preventDefault();
            setFilesOver(false);

            if (event.dataTransfer.files.length > 0) void importFiles(event);
          }}
          className={cn('studio-scroll overflow-y-auto py-1', filesOver && DROP_ZONE)}
        >
          <li className="text-studio-faint px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase">
            {open === ALL ? 'All tracks' : (categories.find(category => category.id === open)?.name ?? 'All tracks')}
          </li>

          {shown.map((track: Track, index: number) => {
            const unavailable = missing.has(track.id);
            const isCurrent = current?.id === track.id;
            const length = clock(track.durationMs);
            const last = index === shown.length - 1;

            return (
              <li
                key={track.id}
                {...reorder.row(track.id, shown[index + 1]?.id ?? null)}
                className={cn(
                  'group relative mx-1 flex cursor-grab items-center gap-2.5 rounded-studio px-2 py-1.5',
                  'transition-colors duration-150 active:cursor-grabbing',
                  isCurrent ? 'bg-studio-accent/10' : 'hover:bg-studio-surface',
                  reorder.lifted === track.id && 'opacity-40',
                )}
              >
                {/* Where the row being carried would land. Drawn over the row
                    rather than as a border on it, so the line keeps its square
                    ends instead of taking the row's rounded corners. */}
                {reorder.before === track.id || (last && reorder.before === END) ? (
                  <span
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute -inset-x-1 h-0.5 bg-studio-accent',
                      reorder.before === track.id ? '-top-px' : '-bottom-px',
                    )}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => play(track)}
                  disabled={unavailable}
                  title={`Play ${track.title}`}
                  aria-label={`Play ${track.title}`}
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-studio text-white transition-colors',
                    'duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    isCurrent ? 'bg-studio-accent' : 'bg-studio-slide',
                  )}
                >
                  <Play className="size-3.5" />
                </button>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-xs transition-colors duration-150',
                      isCurrent ? 'text-studio-accent font-semibold' : 'text-studio-text',
                    )}
                  >
                    {track.title}
                  </span>
                  <span className="text-studio-faint block truncate text-[11px]">
                    {unavailable ? 'On another computer' : track.artist}
                  </span>
                </span>

                {/* Same fixed slot as the libraries: the length steps aside for
                    the delete instead of the row rearranging itself. */}
                <span className="relative flex h-6 w-10 shrink-0 items-center justify-end">
                  <span
                    className="text-studio-faint text-[11px] tabular-nums transition-opacity duration-150
                      group-hover:opacity-0 group-focus-within:opacity-0"
                  >
                    {length}
                  </span>

                  <button
                    type="button"
                    onClick={() => void removeTrack(track.id)}
                    aria-label={`Delete ${track.title}`}
                    title={`Delete ${track.title}`}
                    className="text-studio-faint hover:text-studio-danger absolute inset-0 flex items-center
                      justify-end rounded-studio opacity-0 transition duration-150 group-hover:opacity-100
                      focus:outline-none focus-visible:opacity-100 focus-visible:ring-2
                      focus-visible:ring-studio-accent/40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </span>
              </li>
            );
          })}

          {shown.length === 0 ? (
            <li className="text-studio-faint px-3 py-6 text-center text-xs">
              {filesOver
                ? 'Drop to add.'
                : open === ALL
                  ? 'Nothing yet. Drop files here — they stay on this computer.'
                  : 'Nothing filed here yet. Drop files here, or drag a track onto this library.'}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
};
