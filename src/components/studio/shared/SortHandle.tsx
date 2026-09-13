'use client';

import { Equal } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export const SortHandle = ({
  index,
  children,
  className,
  ...handle
}: {
  index?: number;
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
