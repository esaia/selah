'use client';

import { useState, type CSSProperties, type DragEvent } from 'react';
import { ChevronDown, ChevronUp, ListMusic, Music, Pause, Play } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAudio, type Track } from '@/lib/studio/AudioProvider';
import { useStudio } from '@/lib/studio/StudioProvider';

import { DROP_ZONE } from './dropZone';
import { LIFTED_SLOT } from './sortable';
import { useTrackReorder } from './trackDrag';

/** Three bars, animated only on the track actually playing. */
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

/** Every track, as opposed to one of the operator's libraries. */
const ALL = '__all__';

/** How long a list runs, in the words a running order is planned in. */
const runtime = (tracks: Track[]) => {
  const total = tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0);

  if (total <= 0) return '';

  const minutes = Math.round(total / 60000);

  if (minutes < 60) return `${minutes} min`;

  return `${Math.floor(minutes / 60)} hr ${String(minutes % 60).padStart(2, '0')} min`;
};

/**
 * One library in the picker. A row rather than an option in a dropdown: which
 * libraries exist, and which one is open, are both worth being able to see at a
 * glance mid-service — a native menu hides the answer until it is clicked, and
 * covers the verse behind it while it is open.
 */
const LibraryRow = ({
  icon,
  label,
  count,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className={cn(
      'flex w-full items-center gap-2 border-l-2 py-1 pr-3 pl-2.5 text-left transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40 focus-visible:ring-inset',
      // Accent means live in this rail — it is what the playing track wears —
      // so the open library is marked as a selection instead: a grey fill and
      // a rule down its edge.
      selected
        ? 'border-studio-accent bg-studio-surface text-studio-text'
        : 'border-transparent text-studio-muted hover:bg-studio-surface',
    )}
  >
    <span className="shrink-0 text-studio-faint">{icon}</span>

    <span className={cn('min-w-0 flex-1 truncate text-xs', selected && 'font-semibold')}>{label}</span>

    {count > 0 ? <span className="shrink-0 text-[11px] text-studio-faint tabular-nums">{count}</span> : null}
  </button>
);

/**
 * The music, under the preview — the shape a presentation app puts its audio
 * in. The picker at the top switches between the libraries from the Audio tab,
 * so a bed can be found without leaving the passage that is on screen.
 *
 * There is no separate queue: a library is the running order, so what plays
 * here is what the Audio tab holds, in the order it holds it.
 */
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
    setTrackCategory,
    trackList,
    moveTrack,
  } = useAudio();
  const { setTab } = useStudio();

  const [view, setView] = useState(ALL);
  const [listsOpen, setListsOpen] = useState(true);
  const [dragging, setDragging] = useState(false);

  // A library deleted from the Audio tab must not leave the rail looking at
  // nothing.
  const open = categories.some(category => category.id === view) ? view : ALL;
  const shown = trackList(open === ALL ? null : open);

  // Reordering is scoped to the list being looked at: a library keeps its own
  // running order, and All tracks keeps its own.
  const reorder = useTrackReorder(shown, (id, beforeId) =>
    void moveTrack(id, beforeId, open === ALL ? null : open),
  );
  const span = runtime(shown);

  // Dropped straight onto the rail, a file is meant for the library the
  // operator is looking at.
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
        if (event.currentTarget === event.target) setDragging(false);
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

      {/* The libraries, the way a presentation app shows them: a short standing
          list above their contents, collapsible when the passages below need
          the room. */}
      {listsOpen ? (
        <div className="studio-scroll max-h-28 shrink-0 overflow-y-auto border-b border-studio-divider py-1">
          <LibraryRow
            icon={<ListMusic className="size-3.5" />}
            label="All tracks"
            count={tracks.length}
            selected={open === ALL}
            onSelect={() => setView(ALL)}
          />

          {categories.map(category => (
            <LibraryRow
              key={category.id}
              icon={<Music className="size-3.5" />}
              label={category.name}
              count={tracks.filter(track => (track.categoryId ?? null) === category.id).length}
              selected={open === category.id}
              onSelect={() => setView(category.id)}
            />
          ))}
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
                  'flex cursor-grab items-center gap-1 border-b border-studio-divider px-1.5 py-1.5 last:border-b-0',
                  // Stopping a track takes its highlight off the row; fading it
                  // out matches the sound, which is on its own ramp.
                  'transition-colors duration-200 active:cursor-grabbing',
                  isCurrent ? 'bg-studio-accent/10' : 'hover:bg-studio-surface',
                  reorder.lifted === track.id && LIFTED_SLOT,
                )}
              >
                <button
                  type="button"
                  onClick={() => playTrack(track, open === ALL ? null : open)}
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
              </div>
            );
          })
        )}
      </div>

      {/* Set once, before a service, and it governs both the ramp in and the
          ramp out — so a bed can be brought under a prayer and taken away
          again without either being noticed. */}
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
