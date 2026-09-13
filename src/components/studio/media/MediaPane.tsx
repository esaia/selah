'use client';

import { ChevronDown, ChevronUp, Image as ImageIcon, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ContextMenu, useContextMenu } from '@/components/ui/ContextMenu';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import {
  deleteFolder,
  deleteLocalFile,
  isImageFile,
  loadFolders,
  loadLocalFiles,
  renameFolder,
  saveFolder,
  saveLocalFile,
  type LocalFile,
  type LocalFolder,
} from '@/lib/media/localMedia';
import { LOCAL_THEME, THEMES } from '@/lib/projector/themes';
import {
  clampMediaHeight,
  DEFAULT_MEDIA_HEIGHT,
  MEDIA_HEIGHT_VAR,
  MEDIA_MIN_HEIGHT,
  readMediaHeight,
  writeMediaHeight,
} from '@/lib/studio/mediaHeight';
import { useStudio } from '@/lib/studio/StudioProvider';

import { DROP_ZONE, leftZone, useDragEnded } from '@/components/studio/shared/dropZone';

const BUILT_IN = 'built-in';

export const MediaPane = () => {
  const { settings, update, setLocalBackground, tab, cardSize, setCardSize } = useStudio();

  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [shelf, setShelf] = useState<string>(BUILT_IN);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<LocalFolder | null>(null);
  const [dropping, setDropping] = useState(false);
  const shelfMenu = useContextMenu<LocalFolder>();

  useDragEnded(dropping, () => setDropping(false));
  const [dragging, setDragging] = useState(false);

  const picker = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (open) writeMediaHeight(readMediaHeight());
  }, [open]);

  useEffect(() => {
    const onResize = () => writeMediaHeight(clampMediaHeight(readMediaHeight()));

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startResize = (event: ReactPointerEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    setDragging(true);

    const startY = event.clientY;
    const startHeight = readMediaHeight();

    const onMove = (move: PointerEvent) => writeMediaHeight(clampMediaHeight(startHeight + (startY - move.clientY)));

    const onUp = () => {
      setDragging(false);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  useEffect(() => {
    if (!dragging) return;

    const previous = document.body.style.userSelect;

    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.userSelect = previous;
    };
  }, [dragging]);

  useEffect(() => {
    let live: string[] = [];

    void Promise.all([loadFolders(), loadLocalFiles()])
      .then(([shelves, stored]) => {
        const images = stored.filter(record => record.type.startsWith('image/'));

        setFolders(shelves);
        setFiles(images);
        setUrls(
          Object.fromEntries(
            images.map(record => {
              const url = URL.createObjectURL(record.file);

              live.push(url);

              return [record.id, url];
            }),
          ),
        );
      })
      .catch(() => undefined);

    return () => {
      live.forEach(url => URL.revokeObjectURL(url));
      live = [];
    };
  }, []);

  const onBuiltIn = shelf === BUILT_IN;
  const shown = onBuiltIn ? [] : files.filter(file => file.folder === shelf);

  const add = async (picked: File[]) => {
    if (onBuiltIn) return;

    for (const file of picked.filter(isImageFile)) {
      const record = await saveLocalFile(file, shelf);

      setFiles(current => [...current, record]);
      setUrls(current => ({ ...current, [record.id]: URL.createObjectURL(record.file) }));
    }
  };

  const remove = async (record: LocalFile) => {
    await deleteLocalFile(record.id);

    setFiles(current => current.filter(item => item.id !== record.id));

    if (settings.localImage?.id === record.id) setLocalBackground(null);
  };

  const newShelf = async () => {
    const folder = await saveFolder(`Media ${folders.length + 1}`);

    setFolders(current => [...current, folder]);
    setShelf(folder.id);
    setRenaming(folder.id);
  };

  const drop = (folder: LocalFolder) => async () => {
    await deleteFolder(folder.id);

    setFolders(current => current.filter(item => item.id !== folder.id));
    setFiles(current => current.map(file => (file.folder === folder.id ? { ...file, folder: undefined } : file)));
    setShelf(BUILT_IN);
  };

  const chosen = (id: string) => settings.theme === id;
  const chosenLocal = (id: string) => settings.theme === LOCAL_THEME && settings.localImage?.id === id;

  return (
    <div className="relative shrink-0 border-t border-studio-border bg-studio-bg">
      {open ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize the media pane"
          onPointerDown={startResize}
          onDoubleClick={() => writeMediaHeight(DEFAULT_MEDIA_HEIGHT)}
          title="Drag to resize · double-click to reset"
          className={cn(
            'absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize transition-colors duration-150',
            dragging ? 'bg-studio-accent/40' : 'hover:bg-studio-accent/20',
          )}
        />
      ) : null}

      <div className="flex h-9 items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => setOpen(current => !current)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-studio-faint uppercase
            transition-colors duration-150 hover:text-studio-text focus:outline-none"
        >
          <ImageIcon className="size-3.5" />
          Media
          {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </button>

        <span className="min-w-0 flex-1" />

        {tab === 'bible' || tab === 'lyrics' ? (
          <label className="flex min-w-0 items-center gap-2 text-[11px] text-studio-muted">
            <span className="hidden sm:inline">Card size</span>
            <input
              type="range"
              min={140}
              max={320}
              step={10}
              value={cardSize}
              onChange={event => setCardSize(Number(event.target.value))}
              style={{ '--range-fill': `${((cardSize - 140) / 180) * 100}%` } as CSSProperties}
              className="studio-range h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-studio-border
                sm:w-32"
            />
          </label>
        ) : null}

        <input
          ref={picker}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            void add([...(event.target.files ?? [])]);
            event.target.value = '';
          }}
        />

        {open && !onBuiltIn ? (
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="flex h-6 shrink-0 items-center gap-1.5 rounded-studio border border-studio-border px-2
              text-[11px] text-studio-text transition-colors duration-150 hover:bg-studio-surface
              focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            <Upload className="size-3.5" />
            <span className="hidden sm:inline">Add pictures</span>
          </button>
        ) : null}

      </div>

      {open ? (
        <div
          onDragOver={event => {
            if (onBuiltIn || ![...event.dataTransfer.types].includes('Files')) return;

            event.preventDefault();
            setDropping(true);
          }}
          onDragLeave={event => {
            if (leftZone(event)) setDropping(false);
          }}
          onDrop={event => {
            if (onBuiltIn || ![...event.dataTransfer.types].includes('Files')) return;

            event.preventDefault();
            setDropping(false);
            void add([...event.dataTransfer.files]);
          }}
          style={{ height: `var(${MEDIA_HEIGHT_VAR}, ${DEFAULT_MEDIA_HEIGHT}px)`, minHeight: MEDIA_MIN_HEIGHT }}
          className={cn('flex border-t border-studio-border', dropping && DROP_ZONE)}
        >
          <ul
            tabIndex={-1}
            onKeyDown={event => {
              if (event.key !== 'Delete' && event.key !== 'Backspace') return;
              if (onBuiltIn || event.target instanceof HTMLInputElement) return;

              const folder = folders.find(item => item.id === shelf);

              if (!folder) return;

              event.preventDefault();
              setConfirming(folder);
            }}
            className="studio-scroll w-28 shrink-0 overflow-y-auto border-r border-studio-border outline-none
              sm:w-40"
          >
            <li>
              <button
                type="button"
                onClick={() => setShelf(BUILT_IN)}
                className={cn(
                  'flex w-full items-center gap-2 border-b border-studio-border px-2.5 py-2 text-left text-xs',
                  'transition-colors duration-150 focus:outline-none',
                  onBuiltIn ? 'bg-studio-raised text-studio-text' : 'text-studio-muted hover:bg-studio-surface',
                )}
              >
                Built-in
                <span className="ml-auto text-[11px] text-studio-faint tabular-nums">{THEMES.length}</span>
              </button>
            </li>

            {folders.map(folder => (
              <li key={folder.id}>
                {renaming === folder.id ? (
                  <input
                    autoFocus
                    defaultValue={folder.name}
                    onBlur={event => {
                      const name = event.target.value.trim();

                      setRenaming(null);

                      if (name && name !== folder.name) {
                        setFolders(current =>
                          current.map(item => (item.id === folder.id ? { ...item, name } : item)),
                        );
                        void renameFolder(folder.id, name);
                      }
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                      if (event.key === 'Escape') setRenaming(null);
                    }}
                    className="w-full border-y border-studio-accent bg-studio-bg px-2.5 py-2 text-xs
                      text-studio-text focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShelf(folder.id)}
                    onDoubleClick={() => setRenaming(folder.id)}
                    onContextMenu={event => shelfMenu.open(event, folder)}
                    className={cn(
                      'flex w-full items-center gap-2 border-b border-studio-border px-2.5 py-2',
                      'text-left text-xs transition-colors duration-150 focus:outline-none',
                      shelf === folder.id
                        ? 'bg-studio-raised text-studio-text'
                        : 'text-studio-muted hover:bg-studio-surface',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{folder.name}</span>

                    <span className="text-[11px] text-studio-faint tabular-nums">
                      {files.filter(file => file.folder === folder.id).length}
                    </span>
                  </button>
                )}
              </li>
            ))}

            <li>
              <button
                type="button"
                onClick={() => void newShelf()}
                className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-xs text-studio-muted
                  transition-colors duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none"
              >
                <Plus className="size-3.5" />
                New shelf
              </button>
            </li>
          </ul>

          <div className="studio-scroll min-w-0 flex-1 overflow-y-auto p-2">
            {onBuiltIn ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    type="button"
                    title={theme.label}
                    aria-label={theme.label}
                    aria-pressed={chosen(theme.id)}
                    onClick={() => update({ theme: theme.id })}
                    className={cn(
                      'overflow-hidden rounded-[4px] transition-shadow duration-150 focus:outline-none',
                      chosen(theme.id) ? 'ring-2 ring-studio-accent' : 'ring-1 ring-studio-border hover:ring-studio-faint',
                    )}
                  >
                    <img src={theme.src} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <>
                {shown.length === 0 ? (
                  <div className="grid h-full place-items-center px-4 text-center">
                    <p className="text-xs text-studio-faint">
                      Drop pictures here.
                      <br />
                      <span className="text-[11px]">
                        They stay on this computer — a projector elsewhere fetches them from here.
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]">
                    {shown.map(record => (
                      <div key={record.id} className="group/tile relative">
                        <button
                          type="button"
                          title={record.name}
                          aria-label={record.name}
                          aria-pressed={chosenLocal(record.id)}
                          onClick={() => setLocalBackground(record)}
                          className={cn(
                            'block w-full overflow-hidden rounded-[4px] transition-shadow duration-150',
                            'focus:outline-none',
                            chosenLocal(record.id)
                              ? 'ring-2 ring-studio-accent'
                              : 'ring-1 ring-studio-border hover:ring-studio-faint',
                          )}
                        >
                          <img
                            src={urls[record.id]}
                            alt=""
                            loading="lazy"
                            className="aspect-video w-full object-cover"
                          />
                        </button>

                        <span className="absolute top-1 right-1 transition-opacity sm:opacity-0 sm:group-hover/tile:opacity-100">
                          <IconButton
                            label={`Remove ${record.name}`}
                            tone="danger"
                            onClick={() => void remove(record)}
                            className="size-6 bg-black/60 backdrop-blur-sm"
                          >
                            <Trash2 className="size-3.5" />
                          </IconButton>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}

      <ContextMenu
        menu={shelfMenu.menu}
        onClose={shelfMenu.close}
        items={folder => [
          { label: 'Rename', icon: Pencil, onSelect: () => setRenaming(folder.id) },
          { type: 'separator' },
          { label: 'Delete shelf', icon: Trash2, danger: true, onSelect: () => setConfirming(folder) },
        ]}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Delete this shelf?"
        message={`“${confirming?.name}” goes. The ${files.filter(file => file.folder === confirming?.id).length} pictures on it stay on this computer — they are simply unfiled.`}
        confirmLabel="Delete shelf"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) void drop(confirming)();
          setConfirming(null);
        }}
      />
    </div>
  );
};
