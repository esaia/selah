'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { HiOutlineX } from 'react-icons/hi';

import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';

/** How long the dialog has to leave. Must match `studio-modal-out` in the sheet. */
const LEAVE_MS = 120;

/**
 * Close the dialog: play it out, then do the thing.
 *
 * With no argument it runs the dialog's own `onClose`; with one, that instead —
 * which is how a confirm button gets the same exit as a cancel button.
 */
export type ModalClose = (after?: () => void) => void;

/**
 * A handle on a dialog's exit, for the buttons inside it.
 *
 * The chrome — the backdrop, the X, Escape — leaves on its own. Anything the
 * dialog's own footer does has to be routed through this, or the dialog is
 * unmounted by its parent mid-animation and simply vanishes.
 */
export const useModalClose = () => useRef<ModalClose | null>(null);

/** A centred dialog with a title bar and a footer for its actions. */
export const Modal = ({
  open,
  onClose,
  closeRef,
  title,
  width = 'max-w-lg',
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Filled with this dialog's `ModalClose`, for buttons in `footer` or `children`. */
  closeRef?: RefObject<ModalClose | null>;
  title: ReactNode;
  width?: string;
  footer?: ReactNode;
  children: ReactNode;
}) => {
  const [leaving, setLeaving] = useState(false);
  const underway = useRef(false);

  const close = useCallback<ModalClose>(
    after => {
      if (underway.current) return;

      underway.current = true;
      setLeaving(true);

      window.setTimeout(() => {
        (after ?? onClose)();

        // Cleared after the parent has been told, so a dialog that is reopened
        // rather than unmounted does not arrive already on its way out.
        underway.current = false;
        setLeaving(false);
      }, LEAVE_MS);
    },
    [onClose],
  );

  useEffect(() => {
    if (closeRef) closeRef.current = close;
  }, [close, closeRef]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [close, open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6',
        leaving ? 'studio-veil-out' : 'studio-veil-in',
      )}
      onClick={() => close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={event => event.stopPropagation()}
        className={cn(
          'flex max-h-[86vh] w-full flex-col overflow-hidden rounded-studio-lg bg-studio-bg shadow-studio-modal',
          leaving ? 'studio-modal-out' : 'studio-modal-in',
          width,
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-studio-border px-5 py-3">
          <div className="min-w-0 text-sm font-semibold text-studio-text">{title}</div>

          <IconButton label="Close" onClick={() => close()}>
            <HiOutlineX className="text-base" />
          </IconButton>
        </header>

        <div className="studio-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-studio-border px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
};
