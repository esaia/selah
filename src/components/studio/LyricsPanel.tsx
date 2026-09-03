'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import {
  HiOutlineDocumentAdd,
  HiOutlineDownload,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUpload,
} from 'react-icons/hi';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { parseDroppedFiles } from '@/lib/lyrics/propresenter';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { LyricCard } from './LyricCard';
import { NewSongModal } from './NewSongModal';
import { Setlist, songDragProps } from './Setlist';
import { SlideEditor } from './SlideEditor';
import { useSearchHint } from './SongSearch';
import { SongEditor } from './SongEditor';

// Generated from a ProPresenter bundle and served as a static file, so a church
// with no bundle of its own still starts with a full library — and the 150 kB
// is only fetched if they ask for it.
const BUILT_IN_LIBRARY = '/lyrics/library.json';

/**
 * The Lyrics tab: songs imported straight from a ProPresenter bundle, listed on
 * the left and laid out as slides on the right. Clicking a slide sends it to the
 * projector exactly as clicking a verse does, so ← and → step through a song the
 * same way they step through a passage.
 */
export const LyricsPanel = ({ onSearch }: { onSearch: () => void }) => {
  const {
    settings,
    songs,
    activeSongId,
    setActiveSongId,
    importSongs,
    saveSong,
    removeSong,
    clearSongs,
    setlist,
    placeInSetlist,
    live,
    selectLyric,
    cardSize,
  } = useStudio();

  const fileRef = useRef<HTMLInputElement>(null);
  const searchHint = useSearchHint();

  const [busy, setBusy] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<Song | null>(null);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editing, setEditing] = useState<Song | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = songs.find(song => song.id === activeSongId) ?? songs[0] ?? null;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];

    event.target.value = '';

    if (files.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const imported = await parseDroppedFiles(files);

      if (imported.length === 0) {
        setError('No lyrics found in that file. Export a bundle or a .pro document from ProPresenter.');
        return;
      }

      await importSongs(imported);
    } catch (failure) {
      setError(
        (failure as Error).message ||
          'That file could not be read. It should be a ProPresenter .proBundle or .pro document.',
      );
    } finally {
      setBusy(false);
    }
  };

  const loadBuiltIn = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(BUILT_IN_LIBRARY);

      if (!response.ok) throw new Error(response.statusText);

      const library = (await response.json()) as { songs?: Song[] };

      await importSongs(library.songs ?? []);
    } catch (failure) {
      setError((failure as Error).message || 'The built-in songs could not be loaded.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-3 lg:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-60">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".proBundle,.pro,.zip"
          className="hidden"
          onChange={handleFiles}
        />

        <Button
          variant="accent"
          icon={<HiOutlineUpload className="text-sm" />}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? 'Importing…' : 'Import from ProPresenter'}
        </Button>

        <div className="flex gap-2">
          <Button
            className="min-w-0 flex-1 px-2"
            icon={<HiOutlineDownload className="text-sm" />}
            onClick={() => void loadBuiltIn()}
          >
            Built-in songs
          </Button>

          <Button
            className="min-w-0 flex-1 px-2"
            icon={<HiOutlineDocumentAdd className="text-sm" />}
            onClick={() => setCreating(true)}
          >
            New song
          </Button>
        </div>

        {songs.length > 0 ? <Setlist onEdit={setEditing} /> : null}

        {songs.length > 0 ? (
          <button
            type="button"
            onClick={onSearch}
            title="Search the library"
            className="mt-1 flex items-center justify-between gap-2 rounded-studio px-0.5 py-0.5 text-left
              transition-colors duration-150 hover:bg-studio-surface focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            <span className="text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
              Library · {songs.length}
            </span>

            <span className="flex items-center gap-1 text-[11px] text-studio-faint">
              <HiOutlineSearch className="text-xs" />
              {searchHint}
            </span>
          </button>
        ) : null}

        {/* Stacked, the column has no height of its own to divide up, so the
            list takes its natural height under a cap rather than a share. */}
        <div
          className="studio-scroll max-h-56 overflow-y-auto rounded-studio border border-studio-border
            lg:max-h-none lg:min-h-0 lg:flex-1"
        >
          {songs.map(song => (
            <div
              key={song.id}
              {...songDragProps(song.id)}
              title="Drag onto the playlist"
              className={cn(
                'group/song flex cursor-grab items-center gap-1 border-b border-studio-divider last:border-b-0',
                song.id === active?.id ? 'bg-studio-accent/10' : 'hover:bg-studio-surface',
              )}
            >
              <button
                type="button"
                onClick={() => setActiveSongId(song.id)}
                className="min-w-0 flex-1 px-2.5 py-2 text-left focus:outline-none"
              >
                <span
                  className={cn(
                    'block truncate text-xs',
                    song.id === active?.id ? 'font-semibold text-studio-text' : 'text-studio-muted',
                  )}
                >
                  {song.title}
                </span>
                <span className="block text-[11px] text-studio-faint">{song.slides.length} slides</span>
              </button>

              <span className="flex shrink-0 pr-1 opacity-0 transition-opacity group-hover/song:opacity-100">
                <IconButton
                  label={`Add ${song.title} to the playlist`}
                  onClick={() => placeInSetlist(song.id, setlist.length)}
                >
                  <HiOutlinePlus className="text-sm" />
                </IconButton>

                <IconButton label={`Edit ${song.title}`} onClick={() => setEditing(song)}>
                  <HiOutlinePencil className="text-sm" />
                </IconButton>

                <IconButton label={`Remove ${song.title}`} tone="danger" onClick={() => setConfirmingRemove(song)}>
                  <HiOutlineTrash className="text-sm" />
                </IconButton>
              </span>
            </div>
          ))}

          {songs.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-studio-faint">No songs imported yet.</p>
          ) : null}
        </div>

        {songs.length > 0 ? (
          <Button variant="ghost" onClick={() => setConfirmingClear(true)}>
            Remove all songs
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(confirmingRemove)}
        title="Remove this song?"
        message={`“${confirmingRemove?.title}” and its ${confirmingRemove?.slides.length} slides are deleted, and it leaves the playlist. Importing the bundle again brings it back.`}
        confirmLabel="Remove song"
        onCancel={() => setConfirmingRemove(null)}
        onConfirm={() => {
          if (confirmingRemove) void removeSong(confirmingRemove.id);
          setConfirmingRemove(null);
        }}
      />

      <ConfirmDialog
        open={confirmingClear}
        title="Remove all songs?"
        message={`This deletes all ${songs.length} imported songs and empties the playlist. The bundle itself is untouched — you can import it again.`}
        confirmLabel="Remove all songs"
        onCancel={() => setConfirmingClear(false)}
        onConfirm={() => {
          void clearSongs();
          setConfirmingClear(false);
        }}
      />

      {creating ? (
        <NewSongModal
          onClose={() => setCreating(false)}
          onDraft={song => {
            setCreating(false);
            setEditing(song);
          }}
        />
      ) : null}

      {editing ? <SongEditor song={editing} onClose={() => setEditing(null)} /> : null}

      {editingSlide !== null && active ? (
        <SlideEditor
          key={`${active.id}-${editingSlide}`}
          slide={active.slides[editingSlide]}
          index={editingSlide}
          onClose={() => setEditingSlide(null)}
          onSave={text =>
            void saveSong({
              ...active,
              slides: active.slides.map((item, position) => (position === editingSlide ? { ...item, text } : item)),
            })
          }
        />
      ) : null}

      <div className="studio-scroll min-w-0 px-1 pb-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {error ? (
          <p className="mb-3 rounded-studio border border-studio-danger/30 bg-red-50 px-3 py-2 text-xs text-studio-danger">
            {error}
          </p>
        ) : null}

        {!active ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center lg:h-full">
            <p className="text-sm font-medium text-studio-text">No songs yet</p>
            <p className="max-w-sm text-xs text-studio-muted">
              Press <strong className="font-semibold text-studio-text">New song</strong> to type one in, or import a
              ProPresenter bundle — in ProPresenter, select your playlist and choose File → Export → Bundle. Only the
              lyrics are read; media stays in ProPresenter.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold text-studio-text">{active.title}</h2>

            <div
              className="grid gap-x-4 gap-y-3"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}
            >
              {active.slides.map((slide, index) => (
                <LyricCard
                  key={slide.id}
                  slide={slide}
                  index={index}
                  size={cardSize}
                  font={settings.lyricsFont}
                  align={settings.lyricsAlign}
                  isLive={live?.kind === 'lyrics' && live.songId === active.id && live.slideIndex === index}
                  onGoLive={() => selectLyric(active, index)}
                  onEdit={() => setEditingSlide(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
