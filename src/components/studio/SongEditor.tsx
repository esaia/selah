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

  const setText = (index: number, text: string) => {
    setSlides(current => current.map((slide, position) => (position === index ? { ...slide, text } : slide)));
  };

  const save = async () => {
    setSaving(true);

    await saveSong({
      ...song,
      title: title.trim() || song.title,
      slides: slides.filter(slide => slide.text.trim().length > 0),
    });

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="border-ink-800 bg-ink-900 flex h-[34rem] w-full max-w-2xl flex-col rounded-xl border"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-ink-850 flex items-center gap-3 border-b px-4 py-3">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            aria-label="Song title"
          />
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-500 hover:text-white">
            <X className="size-4" />
          </button>
        </header>

        <div className="studio-scroll flex-1 space-y-2 overflow-y-auto p-4">
          {slides.map((slide, index) => (
            <div key={slide.id} className="flex gap-2">
              <span className="text-ink-700 w-5 pt-2 text-xs">{index + 1}</span>

              <textarea
                value={slide.text}
                onChange={event => setText(index, event.target.value)}
                rows={3}
                className="border-ink-800 bg-ink-950 focus:border-brand-500 flex-1 rounded-md border px-3 py-2 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() => setSlides(current => current.filter((_, position) => position !== index))}
                aria-label={`Delete slide ${index + 1}`}
                className="text-ink-500 hover:text-live self-start pt-2"
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
            className="border-ink-800 text-ink-500 hover:border-ink-700 flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-xs transition hover:text-white"
          >
            <Plus className="size-3" />
            Add a slide
          </button>
        </div>

        <footer className="border-ink-850 flex justify-end gap-2 border-t px-4 py-3">
          <button type="button" onClick={onClose} className="text-ink-500 px-3 py-1.5 text-xs hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="bg-brand-500 text-ink-950 hover:bg-brand-400 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
};
