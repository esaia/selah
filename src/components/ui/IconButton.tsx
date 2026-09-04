import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

const TONES = {
  default: 'text-studio-muted hover:bg-studio-surface hover:text-studio-text',
  danger: 'text-studio-muted hover:bg-studio-danger/15 hover:text-studio-danger',
  onDark: 'text-white/60 hover:bg-white/10 hover:text-white',
} as const;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: keyof typeof TONES;
  children: ReactNode;
}

export const IconButton = ({ label, tone = 'default', className, children, ...rest }: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex h-7 w-7 items-center justify-center rounded-studio transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      'disabled:cursor-not-allowed disabled:opacity-40',
      TONES[tone],
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);
