'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal, useModalClose } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { hasWords, langsOf, textOf, withText } from '@/lib/lyrics/langs';
import type { Song, SongSlide } from '@/lib/types';

/**
 * Edit the words of a single slide.
 *
 * `SongEditor` rewrites a whole song and re-splits it into slides, which is the
 * right tool for importing or restructuring but far too much machinery for
 * fixing one typo mid-service. This touches only the slide it was opened on and
 * leaves every other slide, and the slide breaks, exactly as they were.
 */
export const SlideEditor = ({
  song,
  slide,
  index,
  onSave,
  onClose,
}: {
  song: Song;
  slide?: SongSlide;
  index: number;
  onSave: (slide: SongSlide) => void;
  onClose: () => void;
}) => {
  const blank: SongSlide = { id: `${song.id}-${index}`, text: '' };

  // Mounted per slide by its caller, so the box never shows the previous
  // slide's words for a frame and no effect is needed to correct it.
  const [draft, setDraft] = useState(slide ?? blank);
  const close = useModalClose();

  const langs = langsOf(song);
  const dirty = JSON.stringify(draft) !== JSON.stringify(slide ?? blank);
  const savable = hasWords(draft) && dirty;

  const save = () =>
    close.current?.(() => {
      onSave(draft);
      onClose();
    });

  return (
    <Modal
      open
      onClose={onClose}
      closeRef={close}
      title={`Edit slide ${index + 1}`}
      // Room for the languages side by side; one alone keeps the narrow box it
      // has always had.
      width={langs.length > 2 ? 'max-w-4xl' : langs.length > 1 ? 'max-w-3xl' : undefined}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={() => close.current?.()}>
            Cancel
          </Button>
          <Button variant="accent" size="md" onClick={save} disabled={!savable}>
            Save
          </Button>
        </>
      }
    >
      {/* One box per language the song is in — the typo being fixed mid-service
          is as likely to be in the translation as in the original. */}
      <div className={cn('space-y-3', langs.length > 1 && 'sm:flex sm:gap-3 sm:space-y-0')}>
        {langs.map((lang, position) => (
          <div key={lang.id} className="min-w-0 flex-1">
            {langs.length > 1 ? (
              <span className="mb-1 block text-[10px] font-semibold tracking-wider text-studio-faint uppercase">
                {lang.label || `Language ${position + 1}`}
              </span>
            ) : null}

            <textarea
              value={textOf(song, draft, lang.id)}
              onChange={event => setDraft(current => withText(song, current, lang.id, event.target.value))}
              rows={5}
              autoFocus={position === 0}
              aria-label={
                langs.length > 1
                  ? `Slide ${index + 1} in ${lang.label || `language ${position + 1}`}`
                  : `Slide ${index + 1}`
              }
              // Cmd/Ctrl+Enter saves: the operator is often mid-service and
              // reaching for the mouse costs more than the edit did.
              onKeyDown={event => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && savable) save();
              }}
              className="w-full resize-y rounded-studio border border-studio-border p-3 text-sm leading-relaxed
                text-studio-text focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
            />
          </div>
        ))}
      </div>

      <p className="mt-2 text-xs text-studio-muted">
        Line breaks are kept for the slide list but ignored on screen, where the text is re-wrapped to fit.
      </p>
    </Modal>
  );
};
