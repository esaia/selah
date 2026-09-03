'use client';

import { Equal } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * The rail down the left of a row in an ordered list: its place in the order at
 * rest, the grip under the pointer.
 *
 * The number is what the operator reads off the list when they are told to put
 * up the second message or run the third timer; the grip only has to be there
 * at the moment they reach for it. The row itself must carry `group` for the
 * swap — the whole row is the target, not this strip of it.
 */
export const SortHandle = ({
  index,
  children,
  className,
  ...handle
}: {
  /** Zero-based, printed one-based. Ignored when `children` says otherwise. */
  index?: number;
  /** What the row shows at rest instead of its number — a tick, say. */
  children?: ReactNode;
  className?: string;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
}) => (
  <span
    {...handle}
    title="Drag to reorder"
    className={cn(
      `flex shrink-0 cursor-grab items-center justify-center text-xs font-medium text-studio-faint
        transition-colors duration-150 hover:text-studio-muted active:cursor-grabbing`,
      className,
    )}
  >
    <span className="group-hover:hidden">
      {children ?? (index === undefined ? null : index + 1)}
    </span>
    <Equal aria-hidden="true" className="hidden size-3.5 group-hover:block" />
  </span>
);
