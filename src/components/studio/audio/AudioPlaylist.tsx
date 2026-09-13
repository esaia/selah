'use client';

import { useState, type CSSProperties, type DragEvent, type HTMLAttributes } from 'react';
import { Check, ChevronDown, ChevronUp, ListMusic, Music, Pause, Play, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAudio, type Track } from '@/lib/studio/AudioProvider';
import { useStudio } from '@/lib/studio/StudioProvider';

import { DROP_ZONE, leftZone, useDragEnded } from '@/components/studio/shared/dropZone';
import { useLibraryReorder } from '@/components/studio/audio/libraryDrag';
import { LIFTED_SLOT } from '@/components/studio/shared/sortable';
import { useTrackReorder } from '@/components/studio/audio/trackDrag';

const BARS = [
  { duration: 780, delay: 0, rest: 0.55 },
  { duration: 1020, delay: 160, rest: 1 },
  { duration: 880, delay: 340, rest: 0.7 },
];

const Equalizer = () => (
  <span className="flex h-3 items-end gap-[2px]" aria-hidden>
    {BARS.map(({ duration, delay, rest }) => (
      <span
        key={delay}
        className="studio-equalizer h-3 w-[3px] rounded-full bg-current"
        style={
          {
            '--equalizer-duration': `${duration}ms`,
            '--equalizer-delay': `${delay}ms`,
            '--equalizer-rest': rest,
          } as CSSProperties
        }
      />
    ))}
  </span>
);

const clock = (ms: number | null | undefined) => {
  if (!ms || ms <= 0) return '';

  const total = Math.round(ms / 1000);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const ALL = '__all__';

const runtime = (tracks: Track[]) => {
  const total = tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0);

  if (total <= 0) return '';

  const minutes = Math.round(total / 60000);

  if (minutes < 60) return `${minutes} min`;

  return `${Math.floor(minutes / 60)} hr ${String(minutes % 60).padStart(2, '0')} min`;
};

const LibraryRow = ({
  icon,
  label,
  count,
  selected,
  onSelect,
  onDelete,
  lifted,
  ...drag
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  lifted?: boolean;
} & HTMLAttributes<HTMLButtonElement> & { draggable?: boolean }) => (
  <button
    type="button"
    onClick={onSelect}
    onKeyDown={event => {
      if (onDelete && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        onDelete();
      }
    }}
    aria-pressed={selected}
    {...drag}
    className={cn(
      'flex w-full items-center gap-2 border-l-2 py-1 pr-3 pl-2.5 text-left transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40 focus-visible:ring-inset',
      selected
        ? 'border-studio-accent bg-studio-surface text-studio-text'
        : 'border-transparent text-studio-muted hover:bg-studio-surface',
      'cursor-pointer',
      drag.draggable && 'active:cursor-grabbing',
      lifted && LIFTED_SLOT,
    )}
  >
    <span className="shrink-0 text-studio-faint">{icon}</span>

    <span className={cn('min-w-0 flex-1 truncate text-xs', selected && 'font-semibold')}>{label}</span>

    {count > 0 ? <span className="shrink-0 text-[11px] text-studio-faint tabular-nums">{count}</span> : null}
  </button>
);

export const AudioPlaylist = () => {
  const {
    tracks,
    categories,
    current,
    playing,
    missing,
    fadeMs,
    setFadeMs,
    playTrack,
    addLocalFiles,
    addCategory,
    setTrackCategory,
    trackList,
    moveTrack,
    moveCategory,
    removeTrack,
    removeCategory,
  } = useAudio();
  const { setTab } = useStudio();

  const [view, setView] = useState(ALL);
  const [listsOpen, setListsOpen] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  useDragEnded(dragging, () => setDragging(false));

  const open = categories.some(category => category.id === view) ? view : ALL;
  const shown = trackList(open === ALL ? null : open);

  const reorder = useTrackReorder(shown, (id, beforeId) =>
    void moveTrack(id, beforeId, open === ALL ? null : open),
  );

  const libraries = useLibraryReorder(categories, (id, beforeId) => void moveCategory(id, beforeId));

  const span = runtime(shown);

  const create = () => {
    const trimmed = name.trim();

    setNaming(false);
    setName('');

    if (trimmed) void addCategory(trimmed);
  };

  const drop = async (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);

    const added = await addLocalFiles(event.dataTransfer.files);

    if (open !== ALL) await Promise.all(added.map(track => setTrackCategory(track.id, open)));
  };

  return (
    <div
      onDragOver={event => {
        if ([...event.dataTransfer.types].includes('Files')) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={event => {
        if (leftZone(event)) setDragging(false);
      }}
      onDrop={drop}
      className={cn('flex min-h-0 flex-1 flex-col', dragging && DROP_ZONE)}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-studio-divider px-2 pl-3">
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
          Audio
        </span>

        <button
          type="button"
          aria-expanded={listsOpen}
          onClick={() => setListsOpen(current => !current)}
          title={listsOpen ? 'Hide the libraries' : 'Show the libraries'}
          aria-label={listsOpen ? 'Hide the libraries' : 'Show the libraries'}
          className="flex size-6 shrink-0 items-center justify-center rounded-studio text-studio-faint
            transition-colors duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none
            focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        >
          {listsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>

      {listsOpen ? (
        <div
          className="studio-scroll max-h-28 shrink-0 overflow-y-auto border-b border-studio-divider py-1"
          {...libraries.list()}
        >
          <div className="flex items-center justify-between gap-2 py-1 pr-3 pl-2.5">
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
              Libraries
            </span>

            <button
              type="button"
              onClick={() => setNaming(true)}
              aria-label="New library"
              title="New library"
              className="shrink-0 text-studio-muted hover:text-studio-text"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <LibraryRow
            icon={<ListMusic className="size-3.5" />}
            label="All tracks"
            count={tracks.length}
            selected={open === ALL}
            onSelect={() => setView(ALL)}
          />

          {libraries.items.map(category => (
            <LibraryRow
              key={category.id}
              icon={<Music className="size-3.5" />}
              label={category.name}
              count={tracks.filter(track => (track.categoryId ?? null) === category.id).length}
              selected={open === category.id}
              onSelect={() => setView(category.id)}
              onDelete={() => void removeCategory(category.id)}
              lifted={libraries.lifted === category.id}
              {...libraries.row(category.id)}
            />
          ))}

          {naming ? (
            <div className="flex items-center gap-1.5 py-1 pr-3 pl-2.5">
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
                className="min-w-0 flex-1 rounded-studio border border-studio-border bg-studio-bg px-2 py-1 text-xs
                  outline-none placeholder:text-studio-faint"
              />
              <button
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={create}
                aria-label="Create the library"
                className="shrink-0 text-studio-muted hover:text-studio-text"
              >
                <Check className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-studio-divider px-3">
        <span className="min-w-0 truncate text-[11px] tracking-wide text-studio-faint uppercase">
          {shown.length === 0 ? 'Empty' : `${shown.length} item${shown.length === 1 ? '' : 's'}`}
          {span ? ` · ${span}` : ''}
        </span>
      </div>

      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto" {...reorder.list()}>
        {shown.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-studio-faint">
            {dragging ? (
              'Drop to add.'
            ) : open === ALL ? (
              <>
                No music yet.{' '}
                <button
                  type="button"
                  onClick={() => setTab('audio')}
                  className="font-medium text-studio-accent underline-offset-2 hover:underline"
                >
                  Open the Audio tab
                </button>{' '}
                to add some.
              </>
            ) : (
              'Nothing in this library yet.'
            )}
          </p>
        ) : (
          reorder.items.map(track => {
            const isCurrent = current?.id === track.id;
            const length = clock(track.durationMs);
            const unavailable = missing.has(track.id);

            return (
              <div
                key={track.id}
                {...reorder.row(track.id)}
                className={cn(
                  'group flex cursor-grab items-center gap-1 border-b border-studio-divider px-1.5 py-1.5',
                  'last:border-b-0',
                  'transition-colors duration-200 active:cursor-grabbing',
                  isCurrent ? 'bg-studio-accent/10' : 'hover:bg-studio-surface',
                  reorder.lifted === track.id && LIFTED_SLOT,
                )}
              >
                <button
                  type="button"
                  onClick={() => playTrack(track, open === ALL ? null : open)}
                  onKeyDown={event => {
                    if (event.key === 'Backspace' || event.key === 'Delete') {
                      event.preventDefault();
                      void removeTrack(track.id);
                    }
                  }}
                  disabled={unavailable}
                  title={isCurrent && playing ? 'Fade out' : `Play ${track.title}`}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-studio px-1 py-0.5 text-left
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
                    disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-studio',
                      'transition-colors duration-200',
                      isCurrent ? 'bg-studio-accent text-studio-onaccent' : 'bg-studio-slide text-white',
                    )}
                  >
                    {isCurrent && playing ? (
                      <Equalizer />
                    ) : isCurrent ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-xs text-studio-text transition-colors duration-200',
                        isCurrent && 'font-semibold',
                      )}
                    >
                      {track.title}
                    </span>
                    <span className="block truncate text-[11px] text-studio-faint">
                      {unavailable ? 'On another computer' : length ? `${length} · ${track.artist}` : track.artist}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void removeTrack(track.id)}
                  aria-label={`Delete ${track.title}`}
                  title={`Delete ${track.title}`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-studio text-studio-faint
                    opacity-0 transition duration-150 group-hover:opacity-100 hover:text-studio-danger
                    focus:outline-none focus-visible:opacity-100 focus-visible:ring-2
                    focus-visible:ring-studio-accent/40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <label className="flex h-9 shrink-0 items-center gap-2 border-t border-studio-divider px-3">
        <span className="shrink-0 text-[11px] text-studio-faint">Fade</span>

        <input
          type="range"
          min={0}
          max={5000}
          step={100}
          value={fadeMs}
          aria-label="Fade length"
          onChange={event => setFadeMs(Number(event.target.value))}
          style={{ '--range-fill': `${(fadeMs / 5000) * 100}%` } as CSSProperties}
          className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border"
        />

        <span className="w-10 shrink-0 text-right text-[11px] text-studio-muted tabular-nums">
          {fadeMs === 0 ? 'Off' : `${(fadeMs / 1000).toFixed(1)}s`}
        </span>
      </label>
    </div>
  );
};
