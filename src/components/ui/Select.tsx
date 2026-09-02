'use client';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Restyled native select. The longest list here is thirteen translations, so a
 * native control is lighter than a combobox, keyboard-accessible for free, and
 * usable on a touch screen at the back of a hall.
 */
export const Select = ({
  value,
  onChange,
  options,
  className,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>) => (
  <div className={cn('relative inline-flex items-center', className)}>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="h-8 w-full appearance-none truncate rounded-studio border border-studio-border bg-white pr-8 pl-3
        text-xs font-medium text-studio-text transition-colors duration-150 hover:bg-studio-surface
        focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      {...rest}
    >
      {options.map(option => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>

    <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-studio-faint" />
  </div>
);
