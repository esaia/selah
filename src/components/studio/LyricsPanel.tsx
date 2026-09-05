'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  HiOutlineDocumentAdd,
  HiOutlineUpload,
} from 'react-icons/hi';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/cn';
import { songsInPlaylist } from '@/lib/lyrics/lists';
import { parseDroppedFiles } from '@/lib/lyrics/propresenter';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { DROP_ZONE } from './dropZone';
import { NewSongModal } from './NewSongModal';
import { SongRail } from './SongRail';
import { SlideEditor } from './SlideEditor';
import { SlideGrid } from './SlideGrid';
import { SongEditor } from './SongEditor';

/**
 * The Lyrics tab: songs imported straight from a ProPresenter bundle, listed on
 * the left and laid out as slides on the right. Clicking a slide sends it to the
 * projector exactly as clicking a verse does, so ← and → step through a song the
 * same way they step through a passage.
 */
export const LyricsPanel = ({ onSearch }: { onSearch: () => void }) => {
  const {
    songs,
    activeSongId,
    importSongs,
    saveSong,
    removeSongs,
    clearSongs,
    playlists,
    open,
    songCue,
  } = useStudio();

  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<Song[] | null>(null);
  const [editingSlide, setEditingSlide] = useState<{ song: Song; index: number } | null>(null);
  const [editing, setEditing] = useState<Song | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);

  const active = songs.find(song => song.id === activeSongId) ?? songs[0] ?? null;

  // The whole running order when the open list is one and the song is on it,
  // and that song alone otherwise. A playlist the active song is not on has
  // nothing to say about it, and a library is a shelf rather than an order.
  const ordered = songsInPlaylist(
    songs,
    playlists.find(list => list.id === open.id),
  );

  const shown =
    active && open.kind === 'playlist' && ordered.some(song => song.id === active.id)
      ? ordered
      : active
        ? [active]
        : [];

  /** What the bundle is called, which is what its shelf is called. */
  const bundleName = (files: File[]) =>
    (files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') : `Import ${new Date().toLocaleDateString()}`).trim() ||
    'Import';

  const importFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const imported = await parseDroppedFiles(files);

      if (imported.length === 0) {
        setError('No lyrics found in that file. Export a bundle or a .pro document from ProPresenter.');
        return;
      }

      await importSongs(imported, bundleName(files));
    } catch (failure) {
      setError(
        (failure as Error).message ||
          'That file could not be read. It should be a ProPresenter .proBundle or .pro document.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];

    event.target.value = '';

    void importFiles(files);
  };

  // A bundle dragged off the desktop onto the tab is the same import as the
  // button — the operator should not have to find the button first. Only a
  // drag carrying files answers here; a song being dragged onto the playlist
  // is the setlist's own business.
  const carriesFiles = (event: DragEvent<HTMLElement>) => [...event.dataTransfer.types].includes('Files');

  return (
    // The right-hand padding belongs to the slide column, not to this box: the
    // column is what scrolls, and a gutter outside it left the scrollbar
    // floating in a strip of white with the rail on the far side of it.
    <div
      onDragOver={event => {
        if (!carriesFiles(event)) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDropping(true);
      }}
      onDragLeave={event => {
        if (event.currentTarget === event.target) setDropping(false);
      }}
      onDrop={event => {
        if (!carriesFiles(event)) return;

        event.preventDefault();
        setDropping(false);

        void importFiles([...event.dataTransfer.files]);
      }}
      className={cn('flex min-h-0 flex-1 flex-col gap-4 py-3 pl-4 lg:flex-row', dropping && DROP_ZONE)}
    >
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

        <Button icon={<HiOutlineDocumentAdd className="text-sm" />} onClick={() => setCreating(true)}>
          New song
        </Button>

        <SongRail onEdit={setEditing} onRemove={setConfirmingRemove} onSearch={onSearch} />

        {songs.length > 0 ? (
          <Button variant="ghost" onClick={() => setConfirmingClear(true)}>
            Remove all songs
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(confirmingRemove)}
        title={confirmingRemove && confirmingRemove.length > 1 ? 'Remove these songs?' : 'Remove this song?'}
        message={
          confirmingRemove && confirmingRemove.length > 1
            ? `${confirmingRemove.length} songs and their ${confirmingRemove.reduce((total, song) => total + song.slides.length, 0)} slides are deleted, and they leave every playlist. Importing the bundle again brings them back.`
            : `“${confirmingRemove?.[0]?.title}” and its ${confirmingRemove?.[0]?.slides.length} slides are deleted, and it leaves the playlist. Importing the bundle again brings it back.`
        }
        confirmLabel={confirmingRemove && confirmingRemove.length > 1 ? 'Remove songs' : 'Remove song'}
        onCancel={() => setConfirmingRemove(null)}
        onConfirm={() => {
          if (confirmingRemove) void removeSongs(confirmingRemove.map(song => song.id));
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

      {/* The song is carried alongside the index: with a whole playlist laid
          out, "slide 4" alone no longer says which song's slide 4. */}
      {editingSlide ? (
        <SlideEditor
          key={`${editingSlide.song.id}-${editingSlide.index}`}
          song={editingSlide.song}
          slide={editingSlide.song.slides[editingSlide.index]}
          index={editingSlide.index}
          onClose={() => setEditingSlide(null)}
          onSave={edited =>
            void saveSong({
              ...editingSlide.song,
              slides: editingSlide.song.slides.map((item, position) =>
                position === editingSlide.index ? edited : item,
              ),
            })
          }
        />
      ) : null}

      <div className="studio-scroll min-w-0 pr-4 pl-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {error ? (
          <p className="mb-3 rounded-studio border border-studio-danger/30 bg-studio-danger/10 px-3 py-2 text-xs text-studio-danger">
            {error}
          </p>
        ) : null}

        {!active ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center lg:h-full">
            <p className="text-sm font-medium text-studio-text">No songs yet</p>
            <p className="max-w-sm text-xs text-studio-muted">
              Press <strong className="font-semibold text-studio-text">New song</strong> to type one in, or import a
              ProPresenter bundle — in ProPresenter, select your playlist and choose File → Export → Bundle, then press{' '}
              <strong className="font-semibold text-studio-text">Import from ProPresenter</strong> or drop the bundle
              anywhere on this tab. Only the lyrics are read; media stays in ProPresenter.
            </p>
          </div>
        ) : (
          /* A song picked off the playlist is one item of a running order, so
             the whole order is laid out and the one that was asked for is
             scrolled to — the next song is then a scroll away rather than
             another trip to the rail. A song picked out of the library is the
             only thing the operator asked to see, and it is all they get. */
          <div className="space-y-6">
            {shown.map(song => (
              <SlideGrid
                key={song.id}
                song={song}
                heading={shown.length > 1}
                scrollTo={shown.length > 1 && song.id === songCue?.id}
                cue={songCue?.at}
                onEditSlide={index => setEditingSlide({ song, index })}
              />
            ))}

            {/* Room under the last song, so every song in the order can be
                taken to the top of the panel — the last one included. Without
                it the list stops where its cards stop, and picking the last
                song moves nothing: it is already as far down as it goes. */}
            <div aria-hidden className="h-[70vh]" />
          </div>
        )}
      </div>
    </div>
  );
};
