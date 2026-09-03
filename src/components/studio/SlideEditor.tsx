'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal, useModalClose } from '@/components/ui/Modal';
import type { SongSlide } from '@/lib/types';

/**
 * Edit the words of a single slide.
 *
 * `SongEditor` rewrites a whole song and re-splits it into slides, which is the
 * right tool for importing or restructuring but far too much machinery for
 * fixing one typo mid-service. This touches only the slide it was opened on and
 * leaves every other slide, and the slide breaks, exactly as they were.
 */
export const SlideEditor = ({
  slide,
  index,
  onSave,
  onClose,
}: {
  slide?: SongSlide;
  index: number;
  onSave: (text: string) => void;
  onClose: () => void;
}) => {
  // Mounted per slide by its caller, so the box never shows the previous
  // slide's words for a frame and no effect is needed to correct it.
  const [text, setText] = useState(slide?.text ?? '');
  const close = useModalClose();

  const dirty = text !== (slide?.text ?? '');

  const save = () =>
    close.current?.(() => {
      onSave(text);
      onClose();
    });

  return (
    <Modal
      open
      onClose={onClose}
      closeRef={close}
      title={`Edit slide ${index + 1}`}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={() => close.current?.()}>
            Cancel
          </Button>
          <Button variant="accent" size="md" onClick={save} disabled={!text.trim() || !dirty}>
            Save
          </Button>
        </>
      }
    >
      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        rows={5}
        autoFocus
        // Cmd/Ctrl+Enter saves: the operator is often mid-service and reaching
        // for the mouse costs more than the edit did.
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && text.trim() && dirty) save();
        }}
        className="w-full resize-y rounded-studio border border-studio-border p-3 text-sm leading-relaxed
          text-studio-text focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      />

      <p className="mt-2 text-xs text-studio-muted">
        Line breaks are kept for the slide list but ignored on screen, where the text is re-wrapped to fit.
      </p>
    </Modal>
  );
};
