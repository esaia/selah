'use client';

import { useState, type DragEvent } from 'react';

const groundOf = (element: HTMLElement) => {
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const paint = getComputedStyle(node).backgroundColor;
    const alpha = paint.startsWith('rgba') ? Number(paint.split(',')[3]) : 1;

    if (paint && paint !== 'transparent' && alpha > 0.9) return paint;
  }

  return '#fff';
};

const ghostOf = (event: DragEvent<HTMLElement>) => {
  const row = event.currentTarget;
  const face = row.querySelector<HTMLElement>('[data-ghost]') ?? row;
  const box = face.getBoundingClientRect();
  const copy = face.cloneNode(true) as HTMLElement;

  const typed = face.querySelectorAll('input, textarea');

  copy.querySelectorAll('input, textarea').forEach((field, at) => {
    const from = typed[at];

    if (from instanceof HTMLTextAreaElement && field instanceof HTMLTextAreaElement)
      field.textContent = from.value;

    if (from instanceof HTMLInputElement && field instanceof HTMLInputElement)
      field.setAttribute('value', from.value);
  });

  Object.assign(copy.style, {
    position: 'fixed',
    top: '0px',
    left: '-10000px',
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: '0',
    borderRadius: '0px',
    background: groundOf(face),
    boxShadow: '0 10px 24px -8px rgb(17 19 24 / 0.35)',
    outline: '1px solid rgb(17 19 24 / 0.08)',
    pointerEvents: 'none',
  });

  document.body.append(copy);

  const grip = (at: number, edge: number, span: number) =>
    Math.min(Math.max(at - edge, 0), span);

  event.dataTransfer.setDragImage(
    copy,
    grip(event.clientX, box.left, box.width),
    grip(event.clientY, box.top, box.height),
  );

  requestAnimationFrame(() => copy.remove());
};

const GIVE = 0.2;

export const LIFTED_SLOT =
  'bg-studio-surface bg-none outline-1 -outline-offset-1 outline-dashed outline-studio-border ' +
  '[&>*]:invisible before:hidden';

export interface Sortable<T> {
  items: T[];
  lifted: string | null;
  handle: (id: string) => {
    onPointerDown: () => void;
    onPointerUp: () => void;
  };
  row: (id: string) => {
    draggable: boolean;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  list: () => {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
}

export const useSortable = <T>(
  items: T[],
  idOf: (item: T) => string,
  commit: (ids: string[], moved: string) => void,
  options: {
    byHandle?: boolean;
    layout?: 'column' | 'grid';
  } = {},
): Sortable<T> => {
  const byHandle = options.byHandle ?? true;
  const grid = options.layout === 'grid';

  const [held, setHeld] = useState<string | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);

  const known = new Set(order ?? []);
  const view = order
    ? [
        ...order
          .map((id) => items.find((item) => idOf(item) === id))
          .filter((item): item is T => Boolean(item)),
        ...items.filter((item) => !known.has(idOf(item))),
      ]
    : items;

  const ids = view.map(idOf);
  const from = lifted ? ids.indexOf(lifted) : -1;

  const cancel = () => {
    setOrder(null);
    setLifted(null);
  };

  const settle = () => {
    const settled = order;
    const moved = lifted;

    cancel();

    if (settled && moved) commit(settled, moved);
  };

  return {
    items: view,
    lifted,
    handle: (id: string) => ({
      onPointerDown: () => setHeld(id),
      onPointerUp: () => setHeld(null),
    }),
    row: (id: string) => ({
      draggable: byHandle ? held === id : true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
        ghostOf(event);
        setLifted(id);
      },
      onDragEnd: (event: DragEvent<HTMLElement>) => {
        setHeld(null);

        if (event.dataTransfer.dropEffect === 'none') cancel();
        else settle();
      },
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!lifted || from < 0) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';

        const index = ids.indexOf(id);

        if (index < 0 || index === from) return;

        const box = event.currentTarget.getBoundingClientRect();
        const level = grid && event.clientY > box.top && event.clientY < box.bottom;

        const at = level ? event.clientX : event.clientY;
        const near = level ? box.left : box.top;
        const span = level ? box.width : box.height;

        const into = index > from ? at - near : near + span - at;

        if (into < span * GIVE) return;

        const next = [...ids];
        const [moved] = next.splice(from, 1);

        next.splice(index, 0, moved);
        setOrder(next);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!lifted) return;

        event.preventDefault();
        event.stopPropagation();
        settle();
      },
    }),
    list: () => ({
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!lifted) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!lifted) return;

        event.preventDefault();
        event.stopPropagation();
        settle();
      },
    }),
  };
};
