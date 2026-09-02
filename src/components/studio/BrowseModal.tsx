'use client';

import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { bookMatches, bookName, booksOf, normalizeName, type BookEntry } from '@/lib/bible/passage';
import { chapterCount, verseCount } from '@/lib/bible/versification';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

interface Crumb {
  label: string;
  onClick?: () => void;
}

const Breadcrumb = ({ parts }: { parts: Crumb[] }) => (
  <div className="flex min-w-0 items-center gap-2 text-sm">
    {parts.map((part, index) => (
      <span key={part.label} className="flex min-w-0 items-center gap-2">
        {index > 0 ? <span className="text-studio-faint">›</span> : null}

        {part.onClick ? (
          <button
            type="button"
            onClick={part.onClick}
            className="truncate text-studio-muted transition-colors duration-150 hover:text-studio-text"
          >
            {part.label}
          </button>
        ) : (
          <span className="truncate font-semibold text-studio-text">{part.label}</span>
        )}
      </span>
    ))}
  </div>
);

const STATES = {
  idle: 'border-studio-border bg-white text-studio-text hover:border-studio-faint hover:bg-studio-surface',
  edge: 'border-studio-text bg-studio-surface font-semibold text-studio-text',
  inside: 'border-studio-border bg-studio-surface font-semibold text-studio-text',
} as const;

const GridButton = ({
  state = 'idle',
  className,
  ...rest
}: { state?: keyof typeof STATES } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cn(
      'h-10 rounded-studio border text-sm transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      STATES[state],
      className,
    )}
    {...rest}
  />
);

interface Range {
  from: number;
  to: number;
}

/**
 * Browse to a passage when the reference is not on the tip of the tongue:
 * book, then chapter, then a verse range.
 *
 * The grids are drawn straight from the static versification table, so they
 * appear the instant a book is picked, and corrected from the API once the
 * passage is actually fetched.
 */
export const BrowseModal = ({
  initialBook = null,
  onClose,
}: {
  initialBook?: BookEntry | null;
  onClose: () => void;
}) => {
  const { settings, addPassage, goLive, loadChapterCount, loadVerseCount } = useStudio();

  // Opened by typing a bare book name: start on that book's chapters.
  const [book, setBook] = useState<BookEntry | null>(initialBook);
  const [chapter, setChapter] = useState<number | null>(null);
  const [counts, setCounts] = useState(() => ({
    chapters: initialBook ? chapterCount(initialBook.book) : 0,
    verses: 0,
  }));
  const [range, setRange] = useState<Range | null>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const lang = settings.adminLang;
  const step = !book ? 'books' : !chapter ? 'chapters' : 'verses';

  const books = useMemo(() => booksOf(lang), [lang]);
  const needle = normalizeName(query);
  const matches = useMemo(() => books.filter(entry => bookMatches(entry.book, needle)), [books, needle]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickBook = (entry: BookEntry) => {
    setBook(entry);
    setChapter(null);
    setRange(null);
    setCounts({ chapters: chapterCount(entry.book), verses: 0 });
  };

  const pickChapter = (next: number) => {
    if (!book) return;

    setChapter(next);
    setRange(null);
    setCounts(current => ({ ...current, verses: verseCount(book.book, next, lang) }));
  };

  // The static table is a hint drawn instantly; the translation is the truth,
  // so both grids correct themselves as soon as the API can say.
  useEffect(() => {
    if (!book) return;

    let cancelled = false;

    void loadChapterCount({ book: book.book, lang, version: settings.adminVersion })
      .then(chapters => {
        if (chapters && !cancelled) setCounts(current => ({ ...current, chapters }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [book, lang, loadChapterCount, settings.adminVersion]);

  useEffect(() => {
    if (!book || !chapter) return;

    let cancelled = false;

    void loadVerseCount({ book: book.book, chapter, lang, version: settings.adminVersion })
      .then(verses => {
        if (verses && !cancelled) setCounts(current => ({ ...current, verses }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [book, chapter, lang, loadVerseCount, settings.adminVersion]);

  /** Tap to select, tap again to extend, tap a third time to start over. */
  const pickVerse = (verse: number) => {
    setRange(current =>
      !current || current.from !== current.to || verse === current.from
        ? { from: verse, to: verse }
        : { from: Math.min(current.from, verse), to: Math.max(current.from, verse) },
    );
  };

  const verseState = (verse: number): keyof typeof STATES => {
    if (!range) return 'idle';
    if (verse === range.from || verse === range.to) return 'edge';

    return verse > range.from && verse < range.to ? 'inside' : 'idle';
  };

  const [error, setError] = useState('');

  const add = async (from: number | null, to: number | null) => {
    if (!book || !chapter) return;

    try {
      const block = await addPassage({ book: book.book, chapter, from, to });

      onClose();

      if (block) goLive(block.id, 0);
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  const rangeLabel = range ? (range.to > range.from ? `${range.from}-${range.to}` : `${range.from}`) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6" onClick={onClose}>
      <div
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-studio-lg bg-white shadow-studio-modal"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-studio-border px-5 py-3">
          <Breadcrumb
            parts={[
              {
                label: settings.adminVersion,
                onClick: book
                  ? () => {
                      setBook(null);
                      setChapter(null);
                      setRange(null);
                    }
                  : undefined,
              },
              ...(book ? [{ label: book.name, onClick: chapter ? () => pickBook(book) : undefined }] : []),
              ...(chapter ? [{ label: `Chapter ${chapter}` }] : []),
            ]}
          />

          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="studio-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 'books' ? (
            <>
              <div className="relative mb-3 flex items-center">
                <Search className="pointer-events-none absolute left-3 size-4 text-studio-faint" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  placeholder="Filter books"
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && matches.length > 0) {
                      event.preventDefault();
                      pickBook(matches[0]);
                    }
                  }}
                  className="h-9 w-full rounded-studio border border-studio-border bg-white pr-3 pl-9 text-sm
                    text-studio-text placeholder:text-studio-faint focus:outline-none focus-visible:ring-2
                    focus-visible:ring-studio-accent/40"
                />
              </div>

              {matches.length === 0 ? (
                <p className="pt-10 text-center text-sm text-studio-muted">No book matches “{query}”.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-3 md:grid-cols-4">
                  {matches.map(entry => (
                    <GridButton key={entry.book} onClick={() => pickBook(entry)} className="truncate px-3 text-left">
                      {entry.name}
                    </GridButton>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {step === 'chapters' ? (
            <div className="grid grid-cols-6 gap-2 pb-2 sm:grid-cols-8 md:grid-cols-10">
              {Array.from({ length: counts.chapters }, (_, index) => index + 1).map(number => (
                <GridButton key={number} onClick={() => pickChapter(number)}>
                  {number}
                </GridButton>
              ))}
            </div>
          ) : null}

          {step === 'verses' ? (
            <div className="pb-2">
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {Array.from({ length: counts.verses }, (_, index) => index + 1).map(number => (
                  <GridButton key={number} state={verseState(number)} onClick={() => pickVerse(number)}>
                    {number}
                  </GridButton>
                ))}
              </div>

              <p className="mt-4 text-sm text-studio-muted">
                Tap a verse to select it, tap another to extend the range, then tap again to start over.
              </p>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-studio-border px-5 py-3">
          {error ? <p className="mr-auto text-xs text-studio-danger">{error}</p> : null}
          {step === 'verses' ? (
            <>
              <Button size="md" onClick={() => void add(null, null)}>
                Whole chapter
              </Button>

              <Button
                variant="accent"
                size="md"
                disabled={!range}
                onClick={() => (range ? void add(range.from, range.to) : undefined)}
              >
                {range && book && chapter
                  ? `Add ${bookName(book.book, lang)} ${chapter}:${rangeLabel}`
                  : 'Select a verse'}
              </Button>
            </>
          ) : null}

          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        </footer>
      </div>
    </div>
  );
};
