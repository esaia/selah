'use client';

import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { bookMatches, bookName, booksOf, normalizeName, toSharedBook, type BookEntry } from '@/lib/bible/passage';
import {
  MIN_SEARCH_LENGTH,
  searchVerses,
  snippetAround,
  splitOnMatch,
  type VerseHit,
} from '@/lib/bible/search';
import { chapterCount, verseCount } from '@/lib/bible/versification';
import { cn } from '@/lib/cn';
import { isPlanLimit } from '@/lib/billing/limits';
import { useStudio } from '@/lib/studio/StudioProvider';

import { BookScope } from '@/components/studio/lyrics/BookScope';

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
  idle: 'border-studio-border bg-studio-bg text-studio-text hover:border-studio-faint hover:bg-studio-surface',
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

export const BrowseModal = ({
  initialBook = null,
  initialQuery = '',
  onClose,
}: {
  initialBook?: BookEntry | null;
  initialQuery?: string;
  onClose: () => void;
}) => {
  const { settings, addPassage, goLive, loadChapterCount, loadVerseCount } = useStudio();

  const [book, setBook] = useState<BookEntry | null>(initialBook);
  const [chapter, setChapter] = useState<number | null>(null);
  const [counts, setCounts] = useState(() => ({
    chapters: initialBook ? chapterCount(initialBook.book) : 0,
    verses: 0,
  }));
  const [range, setRange] = useState<Range | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  const [found, setFound] = useState<{ asked: string; hits: VerseHit[] }>({ asked: '', hits: [] });

  const [scope, setScope] = useState<number | null>(null);

  const lang = settings.adminLang;
  const step = !book ? 'books' : !chapter ? 'chapters' : 'verses';

  const books = useMemo(() => booksOf(lang), [lang]);
  const needle = normalizeName(query);
  const matches = useMemo(() => books.filter(entry => bookMatches(entry.book, needle)), [books, needle]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const term = query.trim();
  const searchable = term.length >= MIN_SEARCH_LENGTH;
  const asked = `${lang}|${settings.adminVersion}|${scope ?? ''}|${term}`;
  const hits = found.asked === asked ? found.hits : [];
  const searching = searchable && found.asked !== asked;

  useEffect(() => {
    if (!searchable) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      void searchVerses({ lang, version: settings.adminVersion, query: term, book: scope }, controller.signal)
        .then(results => setFound({ asked, hits: results }))
        .catch(() => {
          if (!controller.signal.aborted) setFound({ asked, hits: [] });
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [asked, lang, scope, searchable, settings.adminVersion, term]);

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

  const [adding, setAdding] = useState<string | null>(null);

  const put = async (
    request: { book: number; chapter: number; from: number | null; to: number | null },
    marker: string,
  ) => {
    if (adding) return;

    setError('');
    setAdding(marker);

    try {
      const block = await addPassage(request);

      onClose();

      if (block) goLive(block.id, 0);
    } catch (failure) {
      if (isPlanLimit(failure)) onClose();
      else setError((failure as Error).message);
    } finally {
      setAdding(null);
    }
  };

  const add = (from: number | null, to: number | null) =>
    book && chapter ? void put({ book: book.book, chapter, from, to }, from === null ? 'chapter' : 'range') : undefined;

  const addHit = (hit: VerseHit) =>
    void put(
      { book: toSharedBook(hit.book, lang), chapter: hit.chapter, from: hit.verse, to: hit.verse },
      `${hit.book}-${hit.chapter}-${hit.verse}`,
    );

  const rangeLabel = range ? (range.to > range.from ? `${range.from}-${range.to}` : `${range.from}`) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-studio-lg bg-studio-bg shadow-studio-modal"
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
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex min-w-0 flex-1 items-center">
                  <Search className="pointer-events-none absolute left-3 size-4 text-studio-faint" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    placeholder="A book, or words in a verse"
                    onChange={event => setQuery(event.target.value)}
                    onKeyDown={event => {
                      if (event.key !== 'Enter') return;

                      if (matches.length > 0) {
                        event.preventDefault();
                        pickBook(matches[0]);
                      } else if (hits.length > 0) {
                        event.preventDefault();
                        addHit(hits[0]);
                      }
                    }}
                    className="h-9 w-full rounded-studio border border-studio-border bg-studio-bg pr-3 pl-9 text-sm
                      text-studio-text placeholder:text-studio-faint focus:outline-none focus-visible:ring-2
                      focus-visible:ring-studio-accent/40"
                  />
                </div>

                {searchable ? (
                  <BookScope books={books} value={scope} onPick={setScope} className="shrink-0 sm:w-48" />
                ) : null}
              </div>

              {matches.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {matches.map(entry => (
                    <GridButton key={entry.book} onClick={() => pickBook(entry)} className="truncate px-3 text-left">
                      {entry.name}
                    </GridButton>
                  ))}
                </div>
              ) : null}

              {searchable ? (
                <div className={cn('pb-2', matches.length > 0 && 'mt-5 border-t border-studio-border pt-4')}>
                  <p className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-studio-faint">
                    In the text{scope ? ` · ${bookName(scope, lang)}` : ''}
                    {searching ? <span className="normal-case tracking-normal">searching…</span> : null}
                  </p>

                  {hits.length === 0 ? (
                    <p className="py-6 text-center text-sm text-studio-muted">
                      {searching
                        ? 'Looking…'
                        : `Nothing in ${scope ? bookName(scope, lang) : settings.adminVersion} says “${term}”.`}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {hits.map(hit => {
                        const shared = toSharedBook(hit.book, lang);
                        const [before, match, after] = splitOnMatch(snippetAround(hit.text, term), term);
                        const marker = `${hit.book}-${hit.chapter}-${hit.verse}`;

                        return (
                          <button
                            key={marker}
                            type="button"
                            disabled={adding !== null}
                            onClick={() => addHit(hit)}
                            className={cn(
                              'rounded-studio border border-studio-border bg-studio-bg px-3 py-2 text-left',
                              'transition-colors duration-150 hover:border-studio-faint hover:bg-studio-surface',
                              'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                              'disabled:opacity-60',
                              adding === marker && 'border-studio-text bg-studio-surface',
                            )}
                          >
                            <span className="block text-sm text-studio-text">
                              {before}
                              <mark className="rounded-[3px] bg-studio-accent/20 text-studio-text">{match}</mark>
                              {after}
                            </span>

                            <span className="mt-1 block text-xs text-studio-muted">
                              {bookName(shared, lang)} {hit.chapter}:{hit.verse}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : matches.length === 0 ? (
                <p className="pt-10 text-center text-sm text-studio-muted">
                  No book matches “{query}”. Type {MIN_SEARCH_LENGTH} letters or more to search the text as well.
                </p>
              ) : null}
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
              <Button
                size="md"
                loading={adding === 'chapter'}
                disabled={adding !== null}
                onClick={() => add(null, null)}
              >
                Whole chapter
              </Button>

              <Button
                variant="accent"
                size="md"
                loading={adding === 'range'}
                disabled={!range || adding !== null}
                onClick={() => (range ? add(range.from, range.to) : undefined)}
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
