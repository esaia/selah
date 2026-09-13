'use client';

import { Library, ListMusic, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import { HiOutlinePencil, HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ContextMenu, useContextMenu } from '@/components/ui/ContextMenu';
import { IconButton } from '@/components/ui/IconButton';
import { Kbd } from '@/components/ui/Kbd';
import { cn } from '@/lib/cn';
import { songsInLibrary, songsInPlaylist } from '@/lib/lyrics/lists';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { OpenList, Song } from '@/lib/types';

import { SortHandle } from '@/components/studio/shared/SortHandle';
import { useSearchHint } from '@/components/studio/lyrics/SongSearch';

const DRAG_TYPE = 'application/x-studio-song';

const LIST_TYPE = {
  library: 'application/x-studio-library',
  playlist: 'application/x-studio-playlist',
} as const;

const listDragProps = (kind: OpenList['kind'], id: string) => ({
  draggable: true,
  onDragStart: (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData(LIST_TYPE[kind], id);
    event.dataTransfer.effectAllowed = 'move';
  },
});

export const songDragProps = (songs: string | string[], label?: string) => {
  const ids = (Array.isArray(songs) ? songs : [songs]).join(',');
  const count = Array.isArray(songs) ? songs.length : 1;

  return {
    draggable: true,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.setData(DRAG_TYPE, ids);
      event.dataTransfer.setData('text/plain', ids);
      event.dataTransfer.effectAllowed = 'move';

      const said = count > 1 ? `${count} songs` : label;

      if (!said) return;

      const ghost = document.createElement('div');

      ghost.textContent = said;
      ghost.className =
        'pointer-events-none fixed top-[-100px] left-0 text-xs font-semibold whitespace-nowrap text-studio-text ' +
        '[text-shadow:0_1px_4px_#000]';

      document.body.append(ghost);
      event.dataTransfer.setDragImage(ghost, 10, ghost.getBoundingClientRect().height / 2);

      setTimeout(() => ghost.remove(), 0);
    },
  };
};

const readDragged = (event: DragEvent<HTMLElement>): string[] =>
  (event.dataTransfer.getData(DRAG_TYPE) || event.dataTransfer.getData('text/plain'))
    .split(',')
    .filter(Boolean);

const sideOf = (event: DragEvent<HTMLElement>) => {
  const box = event.currentTarget.getBoundingClientRect();

  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
};

const same = (a: OpenList, b: OpenList) => a.kind === b.kind && a.id === b.id;

const ListRow = ({
  kind,
  name,
  count,
  chosen,
  over,
  lineAbove,
  lineBelow,
  editing,
  onOpen,
  onRename,
  onDone,
  onContextMenu,
  ...drag
}: {
  kind: OpenList['kind'];
  name: string;
  count: number;
  chosen: boolean;
  over: boolean;
  lineAbove?: boolean;
  lineBelow?: boolean;
  editing: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDone: (name: string) => void;
  onContextMenu: (event: MouseEvent) => void;
} & Record<string, unknown>) => (
  <li
    {...drag}
    onContextMenu={onContextMenu}
    className={cn(
      'group/list relative flex items-center gap-1 border-b border-studio-border pr-1 transition-colors',
      'duration-150 last:border-b-0',
      chosen ? 'bg-studio-raised' : 'hover:bg-studio-surface',
      over && 'ring-1 ring-inset ring-studio-accent',
      lineAbove && 'before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-studio-accent',
      lineBelow && 'after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-px after:bg-studio-accent',
    )}
  >
    {editing ? (
      <input
        autoFocus
        defaultValue={name}
        onBlur={event => onDone(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') onDone(name);
        }}
        className="min-w-0 flex-1 border-y border-studio-accent bg-studio-bg px-2.5 py-2 text-xs
          text-studio-text focus:outline-none"
      />
    ) : (
      <>
        <button
          type="button"
          onClick={onOpen}
          onDoubleClick={onRename}
          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-xs focus:outline-none"
        >
          {kind === 'library' ? (
            <Library className={cn('size-3.5 shrink-0', chosen ? 'text-studio-accent' : 'text-studio-faint')} />
          ) : (
            <ListMusic className={cn('size-3.5 shrink-0', chosen ? 'text-studio-accent' : 'text-studio-faint')} />
          )}

          <span className={cn('truncate', chosen ? 'font-semibold text-studio-text' : 'text-studio-muted')}>
            {name}
          </span>
        </button>

        <span className="shrink-0 pr-1.5 text-[11px] text-studio-faint tabular-nums">{count}</span>
      </>
    )}
  </li>
);

export const SongRail = ({ onEdit, onRemove, onSearch }: {
  onEdit: (song: Song) => void;
  onRemove: (songs: Song[]) => void;
  onSearch: () => void;
}) => {
  const {
    songs,
    libraries,
    playlists,
    open,
    openList,
    addLibrary,
    addPlaylist,
    renameList,
    removeList,
    orderLists,
    moveSongsToLibrary,
    placeInPlaylist,
    removeFromPlaylist,
    activeSongId,
    setActiveSongId,
  } = useStudio();

  const searchHint = useSearchHint();

  const [renaming, setRenaming] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<{ list: OpenList; name: string; count: number } | null>(null);
  const listMenu = useContextMenu<{ list: OpenList; name: string }>();

  const playlist = playlists.find(list => list.id === open.id);
  const shown = open.kind === 'playlist' ? songsInPlaylist(songs, playlist) : songsInLibrary(songs, libraries, open.id);

  const openName =
    (open.kind === 'playlist' ? playlist?.name : libraries.find(list => list.id === open.id)?.name) ?? 'Songs';

  const countOf = (list: OpenList) =>
    list.kind === 'playlist'
      ? songsInPlaylist(songs, playlists.find(item => item.id === list.id)).length
      : songsInLibrary(songs, libraries, list.id).length;

  const [listDrop, setListDrop] = useState<{ kind: OpenList['kind']; at: number } | null>(null);

  const dropOnList = (list: OpenList) => (event: DragEvent<HTMLElement>) => {
    const songIds = readDragged(event);

    setOver(null);

    if (songIds.length === 0) return;

    event.preventDefault();
    event.stopPropagation();

    if (list.kind === 'library') {
      void moveSongsToLibrary(songIds, list.id);
      return;
    }

    const target = playlists.find(item => item.id === list.id);

    void placeInPlaylist(list.id, songIds, target?.songs.length ?? 0).catch(() => {});
  };

  const dropList = (kind: OpenList['kind'], at: number) => (event: DragEvent<HTMLElement>) => {
    const id = event.dataTransfer.getData(LIST_TYPE[kind]);

    event.preventDefault();
    event.stopPropagation();
    setListDrop(null);

    if (!id) return;

    const ids = (kind === 'library' ? libraries : playlists).map(item => item.id);
    const from = ids.indexOf(id);
    const without = ids.filter(item => item !== id);
    const target = from !== -1 && from < at ? at - 1 : at;

    without.splice(Math.max(0, Math.min(target, without.length)), 0, id);

    void orderLists(kind, without);
  };

  const listRow = (list: OpenList, name: string, index: number, last: number) => (
    <ListRow
      key={list.id}
      kind={list.kind}
      {...listDragProps(list.kind, list.id)}
      onDragOver={(event: DragEvent<HTMLElement>) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE)) {
          event.preventDefault();
          event.stopPropagation();
          setOver(list.id);
          return;
        }

        if (!event.dataTransfer.types.includes(LIST_TYPE[list.kind])) return;

        event.preventDefault();
        event.stopPropagation();
        setListDrop({ kind: list.kind, at: sideOf(event) === 'before' ? index : index + 1 });
      }}
      onDragLeave={() => {
        setOver(current => (current === list.id ? null : current));
        setListDrop(null);
      }}
      onDrop={(event: DragEvent<HTMLElement>) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE)) return dropOnList(list)(event);

        dropList(list.kind, sideOf(event) === 'before' ? index : index + 1)(event);
      }}
      lineAbove={listDrop?.kind === list.kind && listDrop.at === index}
      lineBelow={listDrop?.kind === list.kind && listDrop.at === index + 1 && index === last}
      name={name}
      count={countOf(list)}
      chosen={same(open, list)}
      over={over === list.id}
      editing={renaming === list.id}
      onOpen={() => openList(list)}
      onRename={() => setRenaming(list.id)}
      onDone={value => {
        setRenaming(null);

        if (value.trim() && value.trim() !== name) void renameList(list, value.trim());
      }}
      onContextMenu={(event: MouseEvent) => listMenu.open(event, { list, name })}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key !== 'Delete' && event.key !== 'Backspace') return;
          if (event.target instanceof HTMLInputElement) return;
          if (open.kind === 'library' && libraries.length < 2) return;

          event.preventDefault();
          setConfirming({ list: open, name: openName, count: countOf(open) });
        }}
        className="studio-scroll max-h-64 shrink-0 overflow-y-auto rounded-studio border border-studio-border
          outline-none"
      >
        <div className="flex items-center justify-between border-b border-studio-border bg-studio-surface px-2.5 py-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-studio-muted uppercase">Library</span>

          <IconButton label="New library" onClick={() => void addLibrary(`Library ${libraries.length + 1}`).catch(() => {})}>
            <HiOutlinePlus className="text-xs" />
          </IconButton>
        </div>

        <ul onDragLeave={() => setListDrop(null)}>
          {libraries.map((library, index) =>
            listRow({ kind: 'library', id: library.id }, library.name, index, libraries.length - 1),
          )}
        </ul>

        <div className="flex items-center justify-between border-y border-studio-border bg-studio-surface px-2.5 py-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-studio-muted uppercase">Playlist</span>

          <IconButton label="New playlist" onClick={() => void addPlaylist(`Playlist ${playlists.length + 1}`).catch(() => {})}>
            <HiOutlinePlus className="text-xs" />
          </IconButton>
        </div>

        <ul onDragLeave={() => setListDrop(null)}>
          {playlists.map((list, index) =>
            listRow({ kind: 'playlist', id: list.id }, list.name, index, playlists.length - 1),
          )}
        </ul>

        {libraries.length === 0 && playlists.length === 0 ? (
          <p className="px-3 py-3 text-center text-[11px] text-studio-faint">
            Make a library to file songs on, and a playlist to run a service from.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onSearch}
        title="Search every song"
        className="flex items-center justify-between gap-2 rounded-studio px-0.5 py-0.5 text-left transition-colors
          duration-150 hover:bg-studio-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      >
        <span className="min-w-0 truncate text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
          {openName} · {shown.length}
        </span>

        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-studio-faint">
          <HiOutlineSearch className="text-xs" />
          <Kbd>{searchHint}</Kbd>
        </span>
      </button>

      <SongList
        key={`${open.kind}:${open.id}`}
        songs={shown}
        open={open}
        activeSongId={activeSongId}
        dropIndex={dropIndex}
        setDropIndex={setDropIndex}
        onOpenSong={setActiveSongId}
        onEdit={onEdit}
        onRemove={onRemove}
        onPlace={(songIds, index) => open.kind === 'playlist' && void placeInPlaylist(open.id, songIds, index).catch(() => {})}
        onDrop={songIds => open.kind === 'playlist' && void removeFromPlaylist(open.id, songIds)}
      />

      <ContextMenu
        menu={listMenu.menu}
        onClose={listMenu.close}
        items={({ list, name }) => [
          {
            label: 'Rename',
            icon: Pencil,
            onSelect: () => setRenaming(list.id),
          },
          { type: 'separator' },
          {
            label: list.kind === 'playlist' ? 'Delete playlist' : 'Delete library',
            icon: Trash2,
            danger: true,
            disabled: list.kind === 'library' && libraries.length < 2,
            onSelect: () => setConfirming({ list, name, count: countOf(list) }),
          },
        ]}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.list.kind === 'playlist' ? 'Delete this playlist?' : 'Delete this library?'}
        message={
          confirming?.list.kind === 'playlist'
            ? `“${confirming.name}” and the order of its ${confirming.count} songs go. The songs themselves stay in their libraries.`
            : `The ${confirming?.count ?? 0} songs on “${confirming?.name}” are filed on “${libraries.find(list => list.id !== confirming?.list.id)?.name ?? ''}” instead. Nothing is deleted but the shelf.`
        }
        confirmLabel={confirming?.list.kind === 'playlist' ? 'Delete playlist' : 'Delete library'}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) void removeList(confirming.list);
          setConfirming(null);
        }}
      />
    </div>
  );
};

const SongList = ({
  songs,
  open,
  activeSongId,
  dropIndex,
  setDropIndex,
  onOpenSong,
  onEdit,
  onRemove,
  onPlace,
  onDrop,
}: {
  songs: Song[];
  open: OpenList;
  activeSongId: string | null;
  dropIndex: number | null;
  setDropIndex: (index: number | null) => void;
  onOpenSong: (id: string) => void;
  onEdit: (song: Song) => void;
  onRemove: (songs: Song[]) => void;
  onPlace: (songIds: string[], index: number) => void;
  onDrop: (songIds: string[]) => void;
}) => {
  const { live } = useStudio();

  const running = open.kind === 'playlist';

  const [picked, setPicked] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<number | null>(null);

  const onWall = live?.kind === 'lyrics' ? `${live.songId}:${live.slideIndex}` : '';
  const [wasOnWall, setWasOnWall] = useState(onWall);

  if (wasOnWall !== onWall) {
    setWasOnWall(onWall);
    setPicked([]);
    setAnchor(null);
  }

  const items = songs;

  const box = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const clear = (event: PointerEvent) => {
      const onRow = event.target instanceof Element && event.target.closest('li');

      if (onRow && box.current?.contains(onRow)) return;

      setPicked(current => (current.length > 0 ? [] : current));
    };

    window.addEventListener('pointerdown', clear);

    return () => window.removeEventListener('pointerdown', clear);
  }, []);

  const chosen = items.filter(item => picked.includes(item.id));
  const songMenu = useContextMenu<Song[]>();

  const manyPicked = (songId: string) => picked.length > 1 && picked.includes(songId);

  const lit = (songId: string) => songId === activeSongId || picked.includes(songId);

  return (
    <ul
      ref={box}
      onDragOver={
        running
          ? event => {
              if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;

              event.preventDefault();
              setDropIndex(items.length);
            }
          : undefined
      }
      onDragLeave={() => setDropIndex(null)}
      onDrop={
        running
          ? event => {
              const songIds = readDragged(event);

              event.preventDefault();
              setDropIndex(null);

              if (songIds.length > 0) onPlace(songIds, items.length);
            }
          : undefined
      }
      tabIndex={-1}
      onKeyDown={event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
          if (picked.length === 0) return;

          event.preventDefault();
          setPicked(items.map(item => item.id));
          return;
        }

        if (event.key !== 'Delete' && event.key !== 'Backspace') return;
        if (chosen.length === 0) return;

        event.preventDefault();

        if (running) {
          onDrop(chosen.map(item => item.id));
        } else {
          onRemove(chosen);
        }
      }}
      className={cn(
        'studio-scroll max-h-56 overflow-y-auto rounded-studio border outline-none lg:max-h-none lg:min-h-0 lg:flex-1',
        running && dropIndex !== null ? 'border-studio-accent' : 'border-studio-border',
      )}
    >
      {items.map((song, index) => (
        <li
          key={song.id}
          {...songDragProps(manyPicked(song.id) ? picked : song.id, song.title)}
          onDragOver={
            running
              ? event => {
                  if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;

                  event.preventDefault();
                  event.stopPropagation();
                  setDropIndex(sideOf(event) === 'before' ? index : index + 1);
                }
              : undefined
          }
          onDrop={
            running
              ? event => {
                  const songIds = readDragged(event);

                  event.preventDefault();
                  event.stopPropagation();
                  setDropIndex(null);

                  if (songIds.length > 0) onPlace(songIds, sideOf(event) === 'before' ? index : index + 1);
                }
              : undefined
          }
          title={running ? undefined : 'Drag onto a playlist, or onto another library'}
          onContextMenu={event => {
            const targets = picked.includes(song.id) ? chosen : [song];

            if (!picked.includes(song.id)) {
              setPicked([song.id]);
              setAnchor(index);
            }

            songMenu.open(event, targets);
          }}
          className={cn(
            'group/song flex cursor-grab items-center gap-1 border-b border-studio-divider last:border-b-0',
            lit(song.id) ? 'bg-studio-accent-soft' : 'hover:bg-studio-surface',
            'relative',
            running &&
              dropIndex === index &&
              'before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-studio-accent',
            running &&
              dropIndex === index + 1 &&
              index === items.length - 1 &&
              'after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-px after:bg-studio-accent',
          )}
        >
          {running ? (
            <SortHandle index={index} className={cn('ml-1 w-4', lit(song.id) && 'text-studio-onaccent')} />
          ) : null}

          <button
            type="button"
            onClick={event => {
              if (event.metaKey || event.ctrlKey) {
                setPicked(current =>
                  current.includes(song.id) ? current.filter(id => id !== song.id) : [...current, song.id],
                );
                setAnchor(index);
                return;
              }

              if (event.shiftKey && anchor !== null) {
                const [from, to] = anchor < index ? [anchor, index] : [index, anchor];

                setPicked(items.slice(from, to + 1).map(item => item.id));
                return;
              }

              setPicked([song.id]);
              setAnchor(index);
              onOpenSong(song.id);
            }}
            className="min-w-0 flex-1 px-2.5 py-2 text-left focus:outline-none"
          >
            <span
              className={cn(
                'block truncate text-xs',
                lit(song.id) ? 'text-studio-onaccent' : 'text-studio-muted',
              )}
            >
              {song.title}
            </span>
          </button>

          <span className="flex shrink-0 pr-1 opacity-0 transition-opacity group-hover/song:opacity-100">
            <IconButton
              label={`Edit ${song.title}`}
              onClick={() => onEdit(song)}
              className={cn(
                lit(song.id) && 'text-studio-onaccent hover:bg-studio-onaccent/10 hover:text-studio-onaccent',
              )}
            >
              <HiOutlinePencil className="text-sm" />
            </IconButton>
          </span>
        </li>
      ))}

      {items.length === 0 ? (
        <li className="px-3 py-6 text-center text-xs text-studio-faint">
          {running ? 'Drag songs here to build this service.' : 'No songs on this shelf yet.'}
        </li>
      ) : null}

      <ContextMenu
        menu={songMenu.menu}
        onClose={songMenu.close}
        items={targets => [
          ...(targets.length === 1
            ? [{ label: 'Edit', icon: Pencil, onSelect: () => onEdit(targets[0]) }]
            : []),
          { type: 'separator' as const },
          {
            label:
              (running ? 'Remove from playlist' : 'Delete') + (targets.length > 1 ? ` (${targets.length})` : ''),
            icon: Trash2,
            danger: true,
            onSelect: () => (running ? onDrop(targets.map(item => item.id)) : onRemove(targets)),
          },
        ]}
      />
    </ul>
  );
};
