'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { fontLabelOf, fontOptions, fontStyleOf, type CustomFont } from '@/lib/projector/fonts';
import { useStudio } from '@/lib/studio/StudioProvider';

import { FontSpecimen } from '@/components/studio/pickers/FontSpecimen';

export const FontPicker = ({
  value,
  onChange,
  fonts,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  fonts: CustomFont[];
  label: string;
  className?: string;
}) => {
  const { settings } = useStudio();
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  const PANEL = 320;

  const langs = settings.langOrder.filter(lang => settings.enabled[lang]);
  const options = fontOptions(fonts);
  const chosen = fontStyleOf(value, fonts);

  const place = useCallback(() => {
    const rect = box.current?.getBoundingClientRect();

    if (!rect) return;

    const below = window.innerHeight - rect.bottom - 8;

    setAbove(below < PANEL && rect.top - 8 > below);
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.stopPropagation();
      setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, place]);

  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${fontLabelOf(value, fonts)}`}
        onClick={() => setOpen(current => !current)}
        className="flex h-8 w-full min-w-0 items-center gap-2 rounded-studio border border-studio-border px-2.5
          text-left text-xs text-studio-text transition-colors duration-150 hover:border-studio-faint
          focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      >
        <span
          className={cn('min-w-0 flex-1 truncate', chosen.className)}
          style={chosen.style ? { fontFamily: chosen.style } : undefined}
        >
          {fontLabelOf(value, fonts)}
        </span>

        <ChevronDown className={cn('size-3.5 shrink-0 text-studio-faint transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className={cn(
            `studio-scroll absolute z-50 max-h-80 w-full overflow-y-auto rounded-studio border
             border-studio-border bg-studio-lift p-1 shadow-studio-panel`,
            above ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {options.map(option => {
            const picked = option.value === value;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={picked}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-studio px-2 py-1.5 text-left transition-colors duration-150',
                    picked ? 'bg-studio-surface' : 'hover:bg-studio-surface',
                  )}
                >
                  <span className="w-3.5 shrink-0 pt-0.5">
                    {picked ? <Check className="size-3.5 text-studio-accent" /> : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <FontSpecimen value={option.value} fonts={fonts} langs={langs} size="sm" />

                    <span className="mt-0.5 block truncate text-[11px] text-studio-muted">{option.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
