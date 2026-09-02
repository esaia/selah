'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import { useStudio } from '@/lib/studio/StudioProvider';
import type { Song } from '@/lib/types';

/**
 * Edit a song's slides.
 *
 * A ProPresenter import is a good start and rarely the final shape: a chorus
 * gets repeated, a verse gets split across two slides. Saving republishes the
 * projector if the song is live, and clears it if the live slide was deleted.
 */
export const SongEditor = ({ song, onClose }: { song: Song; onClose: () => void }) => {
  const { saveSong } = useStudio();
  const [title, setTitle] = useState(song.title);
  const [slides, setSlides] = useState(song.slides);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setText = (index: number, text: string) => {
    setSlides(current => current.map((slide, position) => (position === index ? { ...slide, text } : slide)));
  };

  const save = async () => {
    setSaving(true);
    setError('');

    try {
      await saveSong({
        ...song,
        title: title.trim() || song.title,
        slides: slides.filter(slide => slide.text.trim().length > 0),
      });

      onClose();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="border-studio-border bg-white flex h-[34rem] w-full max-w-2xl flex-col rounded-studio-lg border"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-studio-divider flex items-center gap-3 border-b px-4 py-3">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            aria-label="Song title"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="text-studio-muted hover:text-studio-text">
            <X className="size-4" />
          </button>
        </header>

        <div className="studio-scroll flex-1 space-y-2 overflow-y-auto p-4">
          {slides.map((slide, index) => (
            <div key={slide.id} className="flex gap-2">
              <span className="text-studio-faint w-5 pt-2 text-xs">{index + 1}</span>

              <textarea
                value={slide.text}
                onChange={event => setText(index, event.target.value)}
                rows={3}
                className="border-studio-border bg-white focus:border-studio-accent flex-1 rounded-studio border px-3 py-2 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() => setSlides(current => current.filter((_, position) => position !== index))}
                aria-label={`Delete slide ${index + 1}`}
                className="text-studio-muted hover:text-studio-danger self-start pt-2"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setSlides(current => [...current, { id: `${song.id}-${current.length}-${Date.now()}`, text: '' }])
            }
            className="border-studio-border text-studio-muted hover:border-studio-faint flex w-full items-center justify-center gap-2 rounded-studio border border-dashed py-2 text-xs transition hover:text-studio-text"
          >
            <Plus className="size-3" />
            Add a slide
          </button>
        </div>

        <footer className="border-studio-divider flex items-center justify-end gap-2 border-t px-4 py-3">
          {error ? <p className="mr-auto text-xs text-studio-danger">{error}</p> : null}
          <button type="button" onClick={onClose} className="text-studio-muted px-3 py-1.5 text-xs hover:text-studio-text">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="bg-studio-accent text-white hover:bg-studio-accent rounded-studio px-3 py-1.5 text-xs font-medium transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
};
