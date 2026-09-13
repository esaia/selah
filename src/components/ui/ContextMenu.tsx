'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

export type ContextMenuItem =
  | { type: 'separator' }
  | {
      type?: 'item';
      label: string;
      icon?: LucideIcon;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
    };

export const useContextMenu = <T,>() => {
  const [state, setState] = useState<{ x: number; y: number; data: T } | null>(null);

  const open = useCallback((event: { preventDefault: () => void; clientX: number; clientY: number }, data: T) => {
    event.preventDefault();
    setState({ x: event.clientX, y: event.clientY, data });
  }, []);

  const close = useCallback(() => setState(null), []);

  return { menu: state, open, close };
};

export const ContextMenu = <T,>({
  menu,
  onClose,
  items,
}: {
  menu: { x: number; y: number; data: T } | null;
  onClose: () => void;
  items: (data: T) => ContextMenuItem[];
}) => {
  if (!menu) return null;

  return createPortal(
    <Panel key={`${menu.x}:${menu.y}`} menu={menu} onClose={onClose} items={items(menu.data)} />,
    document.body,
  );
};

const Panel = <T,>({
  menu,
  onClose,
  items,
}: {
  menu: { x: number; y: number; data: T };
  onClose: () => void;
  items: ContextMenuItem[];
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return;

    const { offsetWidth: w, offsetHeight: h } = el;
    const margin = 8;

    const x = menu.x + w + margin > window.innerWidth ? Math.max(margin, menu.x - w) : menu.x;
    const y = menu.y + h + margin > window.innerHeight ? Math.max(margin, menu.y - h) : menu.y;

    setPos({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);

    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.stopPropagation();
      onClose();
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('contextmenu', onDown);
    document.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('contextmenu', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: (pos ?? menu).x, top: (pos ?? menu).y, visibility: pos ? 'visible' : 'hidden' }}
      className="fixed z-50 min-w-40 rounded-studio border border-studio-border bg-studio-lift p-1 shadow-studio-panel"
    >
      {items.map((row, index) =>
        row.type === 'separator' ? (
          <div key={index} className="my-1 h-px bg-studio-divider" />
        ) : (
          <button
            key={row.label}
            type="button"
            role="menuitem"
            disabled={row.disabled}
            onClick={() => {
              onClose();
              row.onSelect();
            }}
            className={cn(
              `flex w-full items-center gap-2 rounded-studio px-2 py-1.5 text-left text-xs transition-colors
               duration-150 disabled:cursor-not-allowed disabled:opacity-40`,
              row.danger
                ? 'text-studio-danger hover:bg-studio-danger/15'
                : 'text-studio-text hover:bg-studio-surface',
            )}
          >
            {row.icon ? <row.icon className="size-3.5 shrink-0" /> : null}
            <span className="flex-1 truncate">{row.label}</span>
          </button>
        ),
      )}
    </div>
  );
};
