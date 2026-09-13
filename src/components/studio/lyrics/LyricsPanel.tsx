'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  HiOutlineDocumentAdd,
  HiOutlineUpload,
} from 'react-icons/hi';

import { Button } from '@/components/ui/Button';
import { ceiling } from '@/lib/billing/entitlements';
import { isPlanLimit } from '@/lib/billing/limits';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/cn';
import { songsInPlaylist } from '@/lib/lyrics/lists';
import { parseDroppedFiles } from '@/lib/lyrics/propresenter';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

import { DROP_ZONE, leftZone, useDragEnded } from '@/components/studio/shared/dropZone';
import { ImportPicker } from '@/components/studio/pickers/ImportPicker';
import { NewSongModal } from '@/components/studio/modals/NewSongModal';
import { SongRail } from '@/components/studio/lyrics/SongRail';
import { SlideEditor } from '@/components/studio/lyrics/SlideEditor';
import { SlideGrid } from '@/components/studio/lyrics/SlideGrid';
import { SongEditor } from '@/components/studio/lyrics/SongEditor';

export const LyricsPanel = ({ onSearch }: { onSearch: () => void }) => {
  const {
    songs,
    plan,
    isGuest,
    usage,
    room,
    noteLimit,
    activeSongId,
    importSongs,
    saveSong,
    removeSongs,
    playlists,
    open,
    songCue,
  } = useStudio();

  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<Song[] | null>(null);
  const [editingSlide, setEditingSlide] = useState<{ song: Song; index: number } | null>(null);
  const [editing, setEditing] = useState<Song | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [choosing, setChoosing] = useState<{ songs: Song[]; allowance: number; shelf: string } | null>(null);

  useDragEnded(dropping, () => setDropping(false));

  const active = songs.find(song => song.id === activeSongId) ?? songs[0] ?? null;

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

  const bundleName = (files: File[]) =>
    (files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') : `Import ${new Date().toLocaleDateString()}`).trim() ||
    'Import';

  const saveSongQuietly = (song: Song) => {
    void saveSong(song).catch(failure => {
      if (!isPlanLimit(failure)) setError((failure as Error).message);
    });
  };

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

      const held = new Set(songs.map(song => song.title.toLowerCase()));
      const fresh = imported.filter(song => !held.has(song.title.toLowerCase()));
      const limit = ceiling(plan, isGuest, 'songs');
      const room = limit === null ? null : Math.max(0, limit - (usage.songs ?? 0));

      if (room !== null && fresh.length > room) {
        setChoosing({ songs: fresh, allowance: room, shelf: bundleName(files) });
        return;
      }

      await importSongs(imported, bundleName(files));
    } catch (failure) {
      if (isPlanLimit(failure)) return;

      setError(
        (failure as Error).message ||
          'That file could not be read. It should be a ProPresenter .proBundle or .pro document.',
      );
    } finally {
      setBusy(false);
    }
  };

  const importChosen = async (chosen: Song[]) => {
    const shelf = choosing?.shelf;

    setChoosing(null);
    setBusy(true);

    try {
      await importSongs(chosen, shelf);
    } catch (failure) {
      if (!isPlanLimit(failure)) setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];

    event.target.value = '';

    void importFiles(files);
  };

  const carriesFiles = (event: DragEvent<HTMLElement>) => [...event.dataTransfer.types].includes('Files');

  return (
    <div
      onDragOver={event => {
        if (!carriesFiles(event)) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDropping(true);
      }}
      onDragLeave={event => {
        if (leftZone(event)) setDropping(false);
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

        <Button
          icon={<HiOutlineDocumentAdd className="text-sm" />}
          onClick={() => (room('songs') ? setCreating(true) : noteLimit('songs'))}
        >
          New song
        </Button>

        <SongRail onEdit={setEditing} onRemove={setConfirmingRemove} onSearch={onSearch} />

      </div>

      {choosing ? (
        <ImportPicker
          songs={choosing.songs}
          allowance={choosing.allowance}
          onCancel={() => setChoosing(null)}
          onImport={chosen => void importChosen(chosen)}
        />
      ) : null}

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

      {editingSlide ? (
        <SlideEditor
          key={`${editingSlide.song.id}-${editingSlide.index}`}
          song={editingSlide.song}
          slide={editingSlide.song.slides[editingSlide.index]}
          index={editingSlide.index}
          onClose={() => setEditingSlide(null)}
          onSave={edited =>
            saveSongQuietly({
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

            <div aria-hidden className="hidden lg:block lg:h-[70vh]" />
          </div>
        )}
      </div>
    </div>
  );
};
