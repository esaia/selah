'use client';

import { useState, type DragEvent } from 'react';

/**
 * Dragging to reorder, the same way in every list in the console.
 *
 * The list rearranges under the pointer rather than drawing a line and
 * promising to rearrange on release: the operator reads the order they are
 * about to get, in the order itself, and lets go when it looks right.
 *
 * The order the drag arrives at is held here and nowhere else until the row is
 * let go. Writing every swap through the provider would put a round trip on
 * each row the pointer crossed, and the rest of the room would watch the list
 * twitch through orders nobody asked for.
 */

/** The first ground behind an element, so a ghost is never see-through. */
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

/**
 * The picture the pointer carries: a copy of the row, taken aside and dressed
 * as a card for the one frame the browser photographs it in.
 *
 * A copy rather than the row itself. The row is about to be hollowed out into
 * the berth it leaves behind, and React writes that to the DOM before the
 * browser takes its picture — photographing the row gave an empty rectangle.
 * The copy is squared off as well: the snapshot keeps the whole box, so a
 * rounded row leaves transparent corners in it that the browser paints black.
 */
const ghostOf = (event: DragEvent<HTMLElement>) => {
  const row = event.currentTarget;
  const box = row.getBoundingClientRect();
  const copy = row.cloneNode(true) as HTMLElement;

  // What the operator typed but never committed to an attribute: a clone
  // carries the markup, not the live value of a field.
  const typed = row.querySelectorAll('input, textarea');

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
    background: groundOf(row),
    boxShadow: '0 10px 24px -8px rgb(17 19 24 / 0.35)',
    outline: '1px solid rgb(17 19 24 / 0.08)',
    pointerEvents: 'none',
  });

  document.body.append(copy);

  // Held at the point it was picked up rather than pinned to a corner.
  event.dataTransfer.setDragImage(
    copy,
    event.clientX - box.left,
    event.clientY - box.top,
  );

  requestAnimationFrame(() => copy.remove());
};

export const LIFTED_SLOT =
  'bg-studio-surface bg-none outline-1 -outline-offset-1 outline-dashed outline-studio-border ' +
  '[&>*]:invisible before:hidden';

export interface Sortable<T> {
  /** The list to render: the order the drag has arrived at, while one is on. */
  items: T[];
  /** The row in the air, if any. */
  lifted: string | null;
  /** The rail that arms the drag — the number, or whatever the row shows. */
  handle: (id: string) => {
    onPointerDown: () => void;
    onPointerUp: () => void;
  };
  /** The row itself. */
  row: (id: string) => {
    draggable: boolean;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  /** The list element, so the gaps between rows accept a release too. */
  list: () => {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
}

export const useSortable = <T>(
  items: T[],
  idOf: (item: T) => string,
  /** The order the drag left, and the row that was carried to make it. */
  commit: (ids: string[], moved: string) => void,
  /** Rows with no rail of their own are carried by the whole row. */
  options: { byHandle?: boolean } = {},
): Sortable<T> => {
  const byHandle = options.byHandle ?? true;

  const [held, setHeld] = useState<string | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);

  // A row the drag has not seen — added on another console mid-drag — keeps its
  // place at the end rather than disappearing from the list.
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
      // Armed by the rail alone. Left draggable all the time, a swipe across a
      // row's own text or controls lifts the row instead of using them.
      onPointerDown: () => setHeld(id),
      onPointerUp: () => setHeld(null),
    }),
    row: (id: string) => ({
      draggable: byHandle ? held === id : true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        event.dataTransfer.effectAllowed = 'move';
        // Firefox refuses to start a drag without a payload.
        event.dataTransfer.setData('text/plain', id);
        ghostOf(event);
        setLifted(id);
      },
      // A drag that ends anywhere but on the list — off the panel, or on Escape
      // — is taken back rather than committed: `dropEffect` is the browser
      // saying whether anything accepted the row.
      onDragEnd: (event: DragEvent<HTMLElement>) => {
        setHeld(null);

        if (event.dataTransfer.dropEffect === 'none') cancel();
        else settle();
      },
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!lifted || from < 0) return;

        // Every row accepts the drop, the carried one included — after a swap
        // it is the row under the pointer, and a target that refuses sends the
        // browser into its snap-back animation and throws the drop away.
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';

        const index = ids.indexOf(id);

        if (index < 0 || index === from) return;

        // The row only gives way once the pointer is past its middle, and only
        // in the direction of travel. Swapping on the first pixel of overlap
        // put two rows in a loop, each handing the slot back to the other.
        const box = event.currentTarget.getBoundingClientRect();
        const middle = box.top + box.height / 2;

        if (index < from ? event.clientY > middle : event.clientY < middle)
          return;

        const next = [...ids];
        const [moved] = next.splice(from, 1);

        next.splice(index, 0, moved);
        setOrder(next);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!lifted) return;

        // A list that also takes drops from elsewhere — a song from the
        // library, a file off the desktop — must not see a reorder as one.
        event.preventDefault();
        event.stopPropagation();
        settle();
      },
    }),
    list: () => ({
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!lifted) return;

        // A list that also takes files off the desktop must not see a reorder
        // as one on its way past.
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
