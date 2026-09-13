'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { HiOutlineX } from 'react-icons/hi';

import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';

const LEAVE_MS = 120;

export type ModalClose = (after?: () => void) => void;

export const useModalClose = () => useRef<ModalClose | null>(null);

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
