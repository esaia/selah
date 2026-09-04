'use client';

import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import {
  HiOutlineChevronDoubleDown,
  HiOutlineChevronDoubleUp,
  HiOutlineMenuAlt2,
  HiOutlineSearch,
  HiPlus,
} from 'react-icons/hi';

import { Button } from '@/components/ui/Button';
import { findBook, parseReference, type BookEntry } from '@/lib/bible/passage';
import { useStudio } from '@/lib/studio/StudioProvider';

import { BrowseModal } from './BrowseModal';
import { useSearchHint } from './SongSearch';

/**
 * The console's one text box. Typing a reference and pressing enter imports the
 * passage and puts its first verse on the projector — the whole path from
 * thought to screen in one gesture.
 *
 * Whether the browser is open is the console's business, not this bar's: the
 * find shortcut opens it from anywhere on the Bible tab, the same key that
 * opens the song library on the tab next door.
 */
export const SearchBar = ({
  browsing,
  onBrowse,
}: {
  browsing: boolean;
  onBrowse: (open: boolean) => void;
}) => {
  const { settings, addPassage, goLive, loading, blocks, setAllCollapsed } = useStudio();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [jumpTo, setJumpTo] = useState<BookEntry | null>(null);

  const hint = useSearchHint();

  const openBrowse = (book: BookEntry | null) => {
    setJumpTo(book);
    onBrowse(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const reference = parseReference(input, settings.adminLang);

    if (!reference) {
      // A bare book name is a reasonable thing to type: open Browse on that
      // book's chapters rather than rejecting it.
      const book = findBook(input, settings.adminLang);

      if (book) {
        setError('');
        setInput('');
        openBrowse(book);
        return;
      }

      setError('Could not read that reference. Try a book, chapter and verse — or use Browse.');
      return;
    }

    setError('');

    try {
      const block = await addPassage({
        book: reference.book,
        chapter: reference.chapter,
        from: reference.verse,
        to: reference.verseTo ?? reference.verse,
      });

      if (!block) {
        setError('That chapter has no such verse.');
        return;
      }

      setInput('');
      goLive(block.id, 0);
    } catch (failure) {
      setError((failure as Error).message);
    }
  };

  const allCollapsed = blocks.length > 0 && blocks.every(block => block.collapsed);

  return (
    <>
      <form onSubmit={submit}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <HiOutlineSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-studio-faint" />

          <input
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Search a passage, e.g. John 3:16-18"
            aria-label="Passage reference"
            className="h-9 w-full rounded-studio border border-studio-border bg-studio-bg pr-3 pl-9 text-sm
              text-studio-text placeholder:text-studio-faint focus:border-studio-accent focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          />
        </div>

        <Button
          type="submit"
          variant="accent"
          size="md"
          className="shrink-0"
          disabled={loading || !input.trim()}
          icon={loading ? <Loader2 className="size-3.5 animate-spin" /> : <HiPlus className="text-sm" />}
        >
          Add
        </Button>

        <Button
          size="md"
          className="shrink-0"
          title={`Browse the books · ${hint}`}
          onClick={() => openBrowse(null)}
          icon={<HiOutlineMenuAlt2 className="text-sm" />}
        >
          Browse
        </Button>

        {blocks.length > 0 ? (
          <Button
            size="md"
            className="shrink-0"
            onClick={() => setAllCollapsed(!allCollapsed)}
            icon={
              allCollapsed ? (
                <HiOutlineChevronDoubleDown className="text-sm" />
              ) : (
                <HiOutlineChevronDoubleUp className="text-sm" />
              )
            }
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
        ) : null}
      </div>

        {error ? <p className="mt-2 text-xs text-studio-danger">{error}</p> : null}
      </form>

      {browsing ? (
        <BrowseModal
          initialBook={jumpTo}
          onClose={() => {
            onBrowse(false);
            setJumpTo(null);
          }}
        />
      ) : null}
    </>
  );
};
