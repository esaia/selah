import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';

const VARIANTS = {
  primary: 'bg-[#16181d] text-white hover:bg-[#2a2e37] disabled:bg-[#16181d]/40',
  accent: 'bg-studio-accent text-white hover:bg-[#1d4ed8] disabled:bg-studio-accent/40',
  secondary: 'bg-white text-studio-text border border-studio-border hover:bg-studio-surface disabled:text-studio-faint',
  ghost: 'bg-transparent text-studio-muted hover:bg-studio-surface hover:text-studio-text',
  danger: 'bg-studio-danger text-white hover:bg-[#b91c1c]',
} as const;

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: ReactNode;
  /** Work is in flight: the button spins in place and stops taking clicks. */
  loading?: boolean;
}

export const Button = ({
  variant = 'secondary',
  size = 'sm',
  icon,
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(
      'inline-flex items-center justify-center rounded-studio font-medium tracking-tight transition-colors duration-150',
      'select-none whitespace-nowrap [&_svg]:shrink-0',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40 disabled:cursor-not-allowed',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...rest}
  >
    {loading ? <Loader2 className={cn('animate-spin', size === 'md' ? 'size-4' : 'size-3.5')} /> : icon}
    {children}
  </button>
);
