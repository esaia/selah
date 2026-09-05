'use client';

import { Library, ListMusic } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { HiOutlinePencil, HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { Kbd } from '@/components/ui/Kbd';
import { cn } from '@/lib/cn';
import { songsInLibrary, songsInPlaylist } from '@/lib/lyrics/lists';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { OpenList, Song } from '@/lib/types';

import { SortHandle } from './SortHandle';
import { useSearchHint } from './SongSearch';

const DRAG_TYPE = 'application/x-studio-song';

/**
 * One per kind, because a dragover is only told the *types* on the clipboard,
 * never their contents — so the type itself has to say whether what is coming
 * is a shelf or a running order, and a library cannot be dropped among the
 * playlists.
 */
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

/**
 * Makes a row draggable onto a library or a playlist, wherever that row lives.
 *
 * One song or a whole selection: the ids ride as one comma-separated string,
 * because a drag carries text and eleven songs dragged together are one act.
 */
export const songDragProps = (songs: string | string[]) => {
  const ids = (Array.isArray(songs) ? songs : [songs]).join(',');

  const count = Array.isArray(songs) ? songs.length : 1;

  return {
    draggable: true,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.setData(DRAG_TYPE, ids);
      event.dataTransfer.setData('text/plain', ids);
      event.dataTransfer.effectAllowed = 'move';

      // Carrying several, the row under the pointer is the wrong picture: it
      // says one song is moving while three are. The browser will only take a
      // node that is in the document, so the count is built off-screen, handed
      // over, and taken away once the drag has its snapshot.
      if (count > 1) {
        // The count sits below and right of the pointer rather than under it:
        // the anchor is the corner of a transparent margin, so the cursor has
        // somewhere to be that is not on top of the number it is carrying.
        const ghost = document.createElement('div');
        const chip = document.createElement('div');

        ghost.className = 'pointer-events-none fixed -top-40 left-0 pt-4 pl-4';
        chip.textContent = `${count} songs`;
        chip.className =
          'rounded-studio bg-studio-accent px-2.5 py-1.5 text-xs font-semibold text-studio-onaccent shadow-studio';

        ghost.append(chip);
        document.body.append(ghost);
        event.dataTransfer.setDragImage(ghost, 0, 0);

        setTimeout(() => ghost.remove(), 0);
      }
    },
  };
};

const readDragged = (event: DragEvent<HTMLElement>): string[] =>
  (event.dataTransfer.getData(DRAG_TYPE) || event.dataTransfer.getData('text/plain'))
    .split(',')
    .filter(Boolean);

/**
 * Which half of the row the pointer is over, read from the event so a fast drop
 * still lands where it was aimed.
 */
const sideOf = (event: DragEvent<HTMLElement>) => {
  const box = event.currentTarget.getBoundingClientRect();

  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
};

const same = (a: OpenList, b: OpenList) => a.kind === b.kind && a.id === b.id;

/** One shelf or one running order, as a row in the top pane. */
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
} & Record<string, unknown>) => (
  <li
    {...drag}
    className={cn(
      // Full-bleed rows divided by a line, exactly as the songs read
      // underneath: the two panes are one list of lists and its contents, and
      // an inset pill on top of a flush row below reads as two components that
      // happen to be stacked.
      'group/list relative flex items-center gap-1 border-b border-studio-border pr-1 transition-colors',
      'duration-150 last:border-b-0',
      chosen ? 'bg-studio-lift' : 'hover:bg-studio-surface',
      over && 'ring-1 ring-inset ring-studio-accent',
      // Drawn over the row, so the rows below do not step down a pixel as the
      // line moves between them.
      lineAbove && 'before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-studio-accent',
      lineBelow && 'after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-px after:bg-studio-accent',
    )}
  >
    {editing ? (
      // Named on the spot rather than in a dialog: a list is made and named in
      // one motion, and the row it will occupy is where the name belongs.
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
          {/* A shelf or a running order, said in the margin. The word above
              only names the section; a row picked up mid-list, or dragged out
              of one, still has to say what it is. */}
          {kind === 'library' ? (
            <Library className={cn('size-3.5 shrink-0', chosen ? 'text-studio-accent' : 'text-studio-faint')} />
          ) : (
            <ListMusic className={cn('size-3.5 shrink-0', chosen ? 'text-studio-accent' : 'text-studio-faint')} />
          )}

          <span className={cn('truncate', chosen ? 'font-semibold text-studio-text' : 'text-studio-muted')}>
            {name}
          </span>
        </button>

        {/* Just the count. Renaming is a double-click on the name, and
            deleting is the Delete key on the list that is open — two gestures
            the operator already has, against two buttons that were on every
            row waiting to be moused over. */}
        <span className="shrink-0 pr-1.5 text-[11px] text-studio-faint tabular-nums">{count}</span>
      </>
    )}
  </li>
);

/**
 * The song rail: the lists on top, what is in the open one underneath.
 *
 * ProPresenter's arrangement, because it is the one every operator in the room
 * already knows — and because the two things genuinely are different. A
 * library is where a song lives, so there is exactly one row for it and moving
 * it files it somewhere else. A playlist only names songs in an order, so the
 * same song sits on a dozen of them and deleting one takes nothing but the
 * order.
 *
 * A song dragged from the bottom pane onto a library row moves house; dropped
 * on a playlist row it joins the end of that order.
 */
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

  const playlist = playlists.find(list => list.id === open.id);
  const shown = open.kind === 'playlist' ? songsInPlaylist(songs, playlist) : songsInLibrary(songs, libraries, open.id);

  const openName =
    (open.kind === 'playlist' ? playlist?.name : libraries.find(list => list.id === open.id)?.name) ?? 'Songs';

  const countOf = (list: OpenList) =>
    list.kind === 'playlist'
      ? songsInPlaylist(songs, playlists.find(item => item.id === list.id)).length
      : songsInLibrary(songs, libraries, list.id).length;

  // Where a dragged shelf or order would land, drawn as a line between rows.
  const [listDrop, setListDrop] = useState<{ kind: OpenList['kind']; at: number } | null>(null);

  /** Songs dropped on a list row: filed there, or added to that order. */
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

    void placeInPlaylist(list.id, songIds, target?.songs.length ?? 0);
  };

  /** A shelf or an order dropped among its own kind, at the line. */
  const dropList = (kind: OpenList['kind'], at: number) => (event: DragEvent<HTMLElement>) => {
    const id = event.dataTransfer.getData(LIST_TYPE[kind]);

    event.preventDefault();
    event.stopPropagation();
    setListDrop(null);

    if (!id) return;

    const ids = (kind === 'library' ? libraries : playlists).map(item => item.id);
    const from = ids.indexOf(id);
    const without = ids.filter(item => item !== id);
    // Taking it out first shifts every later slot down by one.
    const target = from !== -1 && from < at ? at - 1 : at;

    without.splice(Math.max(0, Math.min(target, without.length)), 0, id);

    void orderLists(kind, without);
  };

  const listRow = (list: OpenList, name: string, index: number) => (
    <ListRow
      key={list.id}
      kind={list.kind}
      {...listDragProps(list.kind, list.id)}
      onDragOver={(event: DragEvent<HTMLElement>) => {
        // A song arriving is a filing, and lands on the row itself; a row of
        // the same kind arriving is a reorder, and lands on the line between.
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
      lineBelow={listDrop?.kind === list.kind && listDrop.at === index + 1}
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
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* The lists. Short by design: a church has a handful of each, and the
          songs underneath are what the operator is actually reading. */}
      <div
        tabIndex={-1}
        // Delete takes out the list that is open — a playlist always, a
        // library only while another one remains, since an import has to land
        // somewhere. Never while a name is being typed: Backspace there is a
        // letter, not a verdict.
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
        {/* Banded, so the two sections read as headings over their rows rather
            than as a third kind of row among them. Both bands share a ground:
            what has to stand out on this rail is the list that is open, not
            the word above it. */}
        <div className="flex items-center justify-between border-b border-studio-border bg-studio-surface px-2.5 py-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-studio-muted uppercase">Library</span>

          <IconButton label="New library" onClick={() => void addLibrary(`Library ${libraries.length + 1}`)}>
            <HiOutlinePlus className="text-xs" />
          </IconButton>
        </div>

        <ul onDragLeave={() => setListDrop(null)}>
          {libraries.map((library, index) => listRow({ kind: 'library', id: library.id }, library.name, index))}
        </ul>

        <div className="flex items-center justify-between border-y border-studio-border bg-studio-surface px-2.5 py-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-studio-muted uppercase">Playlist</span>

          <IconButton label="New playlist" onClick={() => void addPlaylist(`Playlist ${playlists.length + 1}`)}>
            <HiOutlinePlus className="text-xs" />
          </IconButton>
        </div>

        <ul onDragLeave={() => setListDrop(null)}>
          {playlists.map((list, index) => listRow({ kind: 'playlist', id: list.id }, list.name, index))}
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

      {/* Keyed by the list, so opening another one mounts a fresh selection:
          rows picked on the last list would otherwise stay picked on a list
          that never contained them. */}
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
        onPlace={(songIds, index) => open.kind === 'playlist' && void placeInPlaylist(open.id, songIds, index)}
        onDrop={songIds => open.kind === 'playlist' && void removeFromPlaylist(open.id, songIds)}
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

/** The open list's songs: filed by title on a shelf, in order on a playlist. */
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

  /**
   * The rows the operator has picked out, and the one they picked first.
   *
   * ProPresenter's gesture, because it is the one every operator already has
   * in their hands: a plain click opens a song and starts a new selection,
   * ⌘/Ctrl adds and removes one, and Shift takes everything between here and
   * where the selection started. Dragging any picked row drags the lot.
   */
  const [picked, setPicked] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<number | null>(null);

  // Sending a slide is the operator moving on to the next thing, and rows they
  // picked out a moment ago are no longer what they are working with. Adjusted
  // during the render that brings the new slide in rather than in an effect,
  // so the highlight never survives a frame it should not.
  const onWall = live?.kind === 'lyrics' ? `${live.songId}:${live.slideIndex}` : '';
  const [wasOnWall, setWasOnWall] = useState(onWall);

  if (wasOnWall !== onWall) {
    setWasOnWall(onWall);
    setPicked([]);
    setAnchor(null);
  }



  // Dragged with a line, never by rearranging under the pointer: one row and
  // eleven then behave the same way, and the list holds still while the line
  // says where the drop lands.
  const items = songs;

  // A click anywhere but on a row is the operator done with the selection —
  // including the empty space below the last one, which is inside the list but
  // is not a song. Only the rows themselves are exempt, because clicking those
  // is the gesture that makes the selection.
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

  /** Is this row part of a selection of several, rather than a row on its own? */
  const manyPicked = (songId: string) => picked.length > 1 && picked.includes(songId);

  /** Lit up: the song being worked on, or one picked out alongside it. */
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
      // Delete takes out whatever is picked: off the running order on a
      // playlist, out of the library for good on a shelf — where it asks
      // first, because that one cannot be undone.
      onKeyDown={event => {
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
          {...songDragProps(manyPicked(song.id) ? picked : song.id)}
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
          className={cn(
            'group/song flex cursor-grab items-center gap-1 border-b border-studio-divider last:border-b-0',
            // Filled with the accent, so what the operator has hold of is
            // found without reading a word — the song that is open, and every
            // row picked out with it. A solid fill rather than a wash: yellow
            // at low opacity over this ground goes olive. The open one is told
            // from the rest of a selection by its weight.
            lit(song.id) ? 'bg-studio-accent-soft' : 'hover:bg-studio-surface',
            // Drawn over the row rather than added to it: a border here is two
            // pixels of extra height, so every row below the pointer jumped a
            // little as the line moved between them.
            'relative',
            running &&
              dropIndex === index &&
              'before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-studio-accent',
            running &&
              dropIndex === index + 1 &&
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
                // Yellow is a light colour: what sits on it is ink.
                lit(song.id) ? 'text-studio-onaccent' : 'text-studio-muted',
              )}
            >
              {song.title}
            </span>
          </button>

          {/* Only the pencil. Taking a song off a running order and deleting
              one from the library are both the Delete key, which is where the
              operator's hand already is once the rows are picked. */}
          <span className="flex shrink-0 pr-1 opacity-0 transition-opacity group-hover/song:opacity-100">
            <IconButton
              label={`Edit ${song.title}`}
              onClick={() => onEdit(song)}
              // On the yellow row the button is ink on a darkening of it: the
              // default tone hovers to white on a raised surface, which on
              // this fill is white on cream.
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
    </ul>
  );
};
