'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

import { bookMatches, normalizeName, type BookEntry } from '@/lib/bible/passage';
import { cn } from '@/lib/cn';

const Row = ({
  name,
  chosen,
  onPick,
}: {
  name: string;
  chosen: boolean;
  onPick: () => void;
}) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={chosen}
    onClick={onPick}
    className={cn(
      'flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-sm',
      'transition-colors duration-150 hover:bg-studio-surface focus:outline-none focus-visible:bg-studio-surface',
      chosen ? 'font-semibold text-studio-text' : 'text-studio-muted',
    )}
  >
    <Check className={cn('size-3.5 shrink-0', chosen ? 'text-studio-accent' : 'opacity-0')} />
    <span className="truncate">{name}</span>
  </button>
);

export const BookScope = ({
  books,
  value,
  onPick,
  className,
}: {
  books: BookEntry[];
  value: number | null;
  onPick: (book: number | null) => void;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const label = books.find(entry => entry.book === value)?.name ?? 'Whole Bible';

  const needle = normalizeName(filter);
  const shown = useMemo(() => books.filter(entry => bookMatches(entry.book, needle)), [books, needle]);

  useEffect(() => {
    if (!open) return;

    filterRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open]);

  const pick = (book: number | null) => {
    onPick(book);
    setOpen(false);
    setFilter('');
  };

  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Which book to search"
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-studio border border-studio-border bg-studio-bg px-3',
          'text-sm transition-colors duration-150 hover:border-studio-faint focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-studio-accent/40',
          value ? 'font-semibold text-studio-text' : 'text-studio-muted',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="size-3.5 shrink-0 text-studio-faint" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-60 rounded-studio border border-studio-border bg-studio-bg p-1
            shadow-studio-modal"
        >
          <div className="relative mb-1 flex items-center">
            <Search className="pointer-events-none absolute left-2.5 size-3.5 text-studio-faint" />
            <input
              ref={filterRef}
              type="text"
              value={filter}
              placeholder="Filter books"
              onChange={event => setFilter(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && shown.length > 0) {
                  event.preventDefault();
                  pick(shown[0].book);
                }
              }}
              className="h-8 w-full rounded-[4px] border border-studio-border bg-studio-bg pr-2 pl-8 text-sm
                text-studio-text placeholder:text-studio-faint focus:outline-none focus-visible:ring-2
                focus-visible:ring-studio-accent/40"
            />
          </div>

          <div className="studio-scroll max-h-64 overflow-y-auto">
            <Row name="Whole Bible" chosen={value === null} onPick={() => pick(null)} />

            {shown.length > 0 ? (
              shown.map(entry => (
                <Row
                  key={entry.book}
                  name={entry.name}
                  chosen={value === entry.book}
                  onPick={() => pick(entry.book)}
                />
              ))
            ) : (
              <p className="px-2 py-3 text-center text-xs text-studio-muted">No book matches “{filter}”.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
