'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { bookMatches, booksOf, normalizeName } from '@/lib/bible/passage';
import { chapterCount, verseCount } from '@/lib/bible/versification';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

/**
 * Browse to a passage when the reference is not on the tip of the tongue.
 *
 * The chapter and verse grids come from a static versification table rather
 * than the API, so they are drawn the instant a book is picked. The table is a
 * hint: the imported passage is whatever the translation actually has.
 */
export const BrowseModal = ({ onClose }: { onClose: () => void }) => {
  const { settings, addPassage, goLive } = useStudio();
  const [filter, setFilter] = useState('');
  const [book, setBook] = useState<number | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);

  const lang = settings.adminLang;
  const books = useMemo(() => booksOf(lang), [lang]);
  const needle = normalizeName(filter);
  const shown = useMemo(() => books.filter(entry => bookMatches(entry.book, needle)), [books, needle]);

  const open = async (from: number | null) => {
    if (!book || !chapter) return;

    const block = await addPassage({ book, chapter, from, to: from });

    onClose();

    if (block) goLive(block.id, from ? 0 : 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="border-ink-800 bg-ink-900 flex h-[32rem] w-full max-w-3xl flex-col overflow-hidden rounded-xl border"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-ink-850 flex items-center gap-3 border-b px-4 py-3">
          <input
            autoFocus
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder="Find a book"
            className="placeholder:text-ink-700 flex-1 bg-transparent text-sm outline-none"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-500 hover:text-white">
            <X className="size-4" />
          </button>
        </header>

        <div className="grid flex-1 grid-cols-[1fr_1fr_1fr] overflow-hidden">
          <ul className="studio-scroll border-ink-850 overflow-y-auto border-r py-2">
            {shown.map(entry => (
              <li key={entry.book}>
                <button
                  type="button"
                  onClick={() => {
                    setBook(entry.book);
                    setChapter(null);
                  }}
                  className={cn(
                    'w-full px-4 py-1.5 text-left text-sm transition',
                    book === entry.book ? 'bg-ink-800 text-white' : 'text-ink-300 hover:bg-ink-850',
                  )}
                >
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="studio-scroll border-ink-850 overflow-y-auto border-r p-3">
            {book ? (
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: chapterCount(book) }, (_, index) => index + 1).map(number => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => setChapter(number)}
                    className={cn(
                      'rounded py-1.5 text-xs transition',
                      chapter === number ? 'bg-brand-500 text-ink-950' : 'text-ink-300 hover:bg-ink-850',
                    )}
                  >
                    {number}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-ink-700 p-2 text-xs">Pick a book.</p>
            )}
          </div>

          <div className="studio-scroll overflow-y-auto p-3">
            {book && chapter ? (
              <>
                <button
                  type="button"
                  onClick={() => void open(null)}
                  className="border-ink-800 hover:border-ink-700 mb-2 w-full rounded border py-1.5 text-xs transition"
                >
                  Whole chapter
                </button>

                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: verseCount(book, chapter, lang) }, (_, index) => index + 1).map(number => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => void open(number)}
                      className="text-ink-300 hover:bg-ink-850 rounded py-1.5 text-xs transition"
                    >
                      {number}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-ink-700 p-2 text-xs">Then a chapter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
