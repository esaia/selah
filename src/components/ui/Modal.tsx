'use client';

import { useEffect, type ReactNode } from 'react';
import { HiOutlineX } from 'react-icons/hi';

import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';

/** A centred dialog with a title bar and a footer for its actions. */
export const Modal = ({
  open,
  onClose,
  title,
  width = 'max-w-lg',
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: string;
  footer?: ReactNode;
  children: ReactNode;
}) => {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={event => event.stopPropagation()}
        className={cn(
          'flex max-h-[86vh] w-full flex-col overflow-hidden rounded-studio-lg bg-white shadow-studio-modal',
          width,
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-studio-border px-5 py-3">
          <div className="min-w-0 text-sm font-semibold text-studio-text">{title}</div>

          <IconButton label="Close" onClick={onClose}>
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
