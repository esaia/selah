'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Search } from 'lucide-react';

import { parseReference } from '@/lib/bible/passage';
import { useStudio } from '@/lib/studio/StudioProvider';

/**
 * The console's one text box. Typing a reference and pressing enter imports the
 * passage and puts its first verse on the projector — the whole path from
 * thought to screen in one gesture.
 */
export const SearchBar = ({ onBrowse }: { onBrowse: () => void }) => {
  const { settings, addPassage, goLive, loading } = useStudio();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const reference = parseReference(input, settings.adminLang);

    if (!reference) {
      setError('Try something like “John 3:16” or “Psalm 23”.');
      return;
    }

    setError('');

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
  };

  return (
    <form onSubmit={submit} className="relative">
      <Search className="text-ink-500 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />

      <input
        value={input}
        onChange={event => setInput(event.target.value)}
        placeholder="John 3:16-18"
        aria-label="Passage reference"
        className="border-ink-800 bg-ink-900 placeholder:text-ink-700 focus:border-brand-500 w-full rounded-lg border py-2.5 pr-24 pl-9 text-sm outline-none"
      />

      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-2">
        {loading ? <Loader2 className="text-ink-500 size-4 animate-spin" /> : null}

        <button
          type="button"
          onClick={onBrowse}
          className="border-ink-800 text-ink-300 hover:border-ink-700 hover:text-white rounded-md border px-2 py-1 text-xs transition"
        >
          Browse
        </button>
      </div>

      {error ? <p className="text-live mt-2 text-xs">{error}</p> : null}
    </form>
  );
};
