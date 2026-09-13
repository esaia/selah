'use client';

import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
} from 'react-icons/hi';

import { Modal, useModalClose } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { slidesFrom } from '@/lib/lyrics/text';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

interface Result {
  id: string;
  source: string;
  key: string;
  title: string;
  artist: string;
  image: string;
}

const MIN_TERM = 2;

const SETTLE_MS = 300;

const INPUT =
  'w-full rounded-studio border border-studio-border bg-studio-bg py-2 text-sm text-studio-text outline-none ' +
  'placeholder:text-studio-faint focus:border-studio-accent focus-visible:ring-2 focus-visible:ring-studio-accent/40';

const seedId = () => `song-${Date.now()}`;

const jsonOf = async (url: string, signal?: AbortSignal) => {
  const response = await fetch(url, { signal });
  const body = await response.json();

  if (!response.ok) throw new Error((body as { error?: string }).error || response.statusText);

  return body;
};

const Choice = ({
  label,
  hint,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-studio border
      border-studio-border bg-studio-surface px-3 text-center transition-colors duration-150
      hover:border-studio-accent hover:bg-studio-lift focus:outline-none focus-visible:ring-2
      focus-visible:ring-studio-accent/40 disabled:cursor-not-allowed disabled:opacity-40
      disabled:hover:border-studio-border disabled:hover:bg-studio-surface"
  >
    <span className="text-2xl text-studio-muted">{icon}</span>
    <span className="text-sm font-medium text-studio-text">{label}</span>
    <span className="text-[11px] leading-tight text-studio-faint">{hint}</span>
  </button>
);

export const NewSongModal = ({ onClose, onDraft }: { onClose: () => void; onDraft: (song: Song) => void }) => {
  const { saveSong, setActiveSongId } = useStudio();
  const [name, setName] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [taking, setTaking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = useModalClose();

  const term = name.trim();

  useEffect(() => {
    if (!searching) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (term.length < MIN_TERM) {
        setResults(null);
        setLooking(false);

        return;
      }

      setLooking(true);
      setError('');

      try {
        const body = (await jsonOf(`/api/lyrics/search?q=${encodeURIComponent(term)}`, controller.signal)) as {
          results: Result[];
        };

        setResults(body.results);
        setLooking(false);
      } catch (failure) {
        if (controller.signal.aborted) return;

        setError((failure as Error).message);
        setLooking(false);
      }
    }, SETTLE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searching, term]);

  const blank = (title: string) => {
    const seed = seedId();

    return { id: seed, title, slides: [{ id: `${seed}-0`, text: '' }] };
  };

  const empty = async () => {
    setBusy(true);
    setError('');

    try {
      const saved = await saveSong(blank(term));

      close.current?.(() => {
        if (saved) setActiveSongId(saved.id);

        onClose();
      });
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  };

  const take = async (result: Result) => {
    setTaking(result.id);
    setError('');

    try {
      const body = (await jsonOf(
        `/api/lyrics?source=${encodeURIComponent(result.source)}&key=${encodeURIComponent(result.key)}`,
      )) as { lyrics: string };

      const seed = seedId();
      const drafted = { id: seed, title: result.title, slides: slidesFrom(body.lyrics, seed) };

      close.current?.(() => onDraft(drafted));
    } catch (failure) {
      setError((failure as Error).message);
      setTaking(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeRef={close}
      width="max-w-xl"
      title={
        searching ? (
          <button
            type="button"
            onClick={() => {
              setSearching(false);
              setResults(null);
              setError('');
            }}
            className="inline-flex items-center gap-1.5 text-studio-muted transition-colors duration-150
              hover:text-studio-text focus:outline-none"
          >
            <HiOutlineArrowLeft className="text-sm" />
            Web search
          </button>
        ) : (
          'New song'
        )
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-studio-faint uppercase">
            {searching ? 'Song' : 'Name'}
          </span>

          <span className="relative block">
            {searching ? (
              <HiOutlineSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-studio-faint" />
            ) : null}

            <input
              autoFocus
              value={name}
              onChange={event => setName(event.target.value)}
              disabled={busy || taking !== null}
              placeholder={searching ? 'Title, or title and artist' : 'What the song is called'}
              className={cn(INPUT, searching ? 'pr-9 pl-9' : 'px-3')}
            />

            {looking ? (
              <HiOutlineRefresh className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-studio-faint" />
            ) : null}
          </span>
        </label>

        {searching ? (
          <div className="studio-scroll -mx-1 max-h-72 min-h-[9rem] space-y-1 overflow-y-auto px-1">
            {results?.map(result => (
              <button
                key={result.id}
                type="button"
                disabled={taking !== null}
                onClick={() => void take(result)}
                className={cn(
                  `flex w-full items-center gap-3 rounded-studio px-2 py-2 text-left transition-colors duration-150
                   hover:bg-studio-surface focus:outline-none focus-visible:ring-2
                   focus-visible:ring-studio-accent/40 disabled:cursor-default`,
                  taking !== null && taking !== result.id ? 'opacity-40' : null,
                )}
              >
                <span
                  className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden
                    rounded-[4px] bg-studio-surface text-studio-faint"
                >
                  <Music className="size-4" />

                  {result.image ? (
                    <img
                      src={result.image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-studio-text">{result.title}</span>
                  <span className="block truncate text-xs text-studio-faint">{result.artist}</span>
                </span>

                <span
                  className="shrink-0 rounded-full border border-studio-border px-2 py-0.5 text-[10px]
                    font-medium text-studio-faint"
                >
                  {result.source}
                </span>

                {taking === result.id ? (
                  <span className="flex shrink-0 items-center gap-1.5 pr-1 text-xs text-studio-muted">
                    <HiOutlineRefresh className="animate-spin" />
                    Fetching the words…
                  </span>
                ) : null}
              </button>
            ))}

            {results === null ? (
              <p className="px-2 py-10 text-center text-xs text-studio-faint">
                {term.length < MIN_TERM
                  ? 'Type a couple of letters and the results come to you.'
                  : 'Looking…'}
              </p>
            ) : null}

            {results?.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-studio-faint">
                Nothing by that name in any of the four. A song your church wrote is one you type in yourself.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Choice
              label="Quick lyrics"
              hint="Type the slides now"
              icon={<HiOutlineDocumentText />}
              disabled={!term}
              onClick={() => close.current?.(() => onDraft(blank(term)))}
            />

            <Choice
              label="Web search"
              hint="Look the song up"
              icon={<HiOutlineSearch />}
              onClick={() => setSearching(true)}
            />

            <Choice
              label="Empty song"
              hint="Add it, fill it in later"
              icon={<HiOutlinePlus />}
              disabled={!term || busy}
              onClick={() => void empty()}
            />
          </div>
        )}

        {error ? (
          <p className="rounded-studio border border-studio-danger/30 bg-studio-danger/10 px-3 py-2 text-xs text-studio-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
