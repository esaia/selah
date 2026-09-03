'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { colorOf, GROUPS } from '@/lib/lyrics/groups';

/** As tall as the menu gets, which is what decides whether it fits below. */
const MENU_H = 272;

/**
 * What part of the song this slide is.
 *
 * A menu rather than a free text field, because the point of a group is that
 * two slides marked Chorus say the same word — typed by hand they drift into
 * "chorus", "Chorus " and "Chourus" and stop matching each other. The list is
 * ProPresenter's, so an operator who has used one knows this one.
 */
export const GroupPicker = ({
  value,
  onPick,
  className,
  compact,
}: {
  value: string;
  onPick: (group: string) => void;
  /** How the trigger sits in whatever is hosting it. */
  className?: string;
  /** Sized for a slide card's header strip rather than for an editor row. */
  compact?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  // Which way it hangs. A menu that opens off the bottom of the dialog is a
  // menu the operator has to scroll the list to answer — and scrolling the list
  // is what closes it.
  const [above, setAbove] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open]);

  const pick = (group: string) => {
    onPick(group);
    setOpen(false);
  };

  const show = () => {
    const under = window.innerHeight - (box.current?.getBoundingClientRect().bottom ?? 0);

    setAbove(under < MENU_H);
    setOpen(current => !current);
  };

  return (
    // Hosted on a card that is itself draggable, so a press that lands here is
    // a press on the menu and never the start of a drag of the slide.
    <div
      ref={box}
      draggable={false}
      onDragStart={event => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className={cn('relative', className)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="What part of the song this is"
        onClick={show}
        className={cn(
          `flex items-center gap-1 rounded-full border font-semibold tracking-wide uppercase
            transition-colors duration-150 focus:outline-none focus-visible:ring-2
            focus-visible:ring-studio-accent/40`,
          // The card's header is a strip a few pixels tall and the number sets
          // its height; a chip built for an editor row overflows it.
          compact ? 'h-4 max-w-full px-1.5 text-[9px]' : 'h-5 px-2 text-[10px]',
          value
            ? 'border-transparent text-white'
            : // Nothing to say yet, so it says nothing until the pointer is on
              // the card: thirty rows each announcing GROUP is thirty rows of
              // furniture over the words the operator came here to read.
              `border-dashed border-studio-border text-studio-faint opacity-0 transition-opacity
               hover:bg-studio-surface group-hover:opacity-100 group-focus-within:opacity-100
               aria-expanded:opacity-100`,
        )}
        style={value ? { backgroundColor: colorOf(value) } : undefined}
      >
        <span className="truncate">{value || 'Group'}</span>
        <ChevronDown className={cn('shrink-0', compact ? 'size-2' : 'size-2.5')} />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            `studio-scroll absolute left-0 z-50 max-h-64 w-40 overflow-y-auto rounded-studio border
              border-studio-border bg-white p-1 shadow-studio-modal`,
            above ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {/* Off the list as well as on it: a slide marked Chorus by an import
              that guessed wrong needs a way back to nothing. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => pick('')}
            className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1 text-left text-xs text-studio-muted
              hover:bg-studio-surface focus:outline-none focus-visible:bg-studio-surface"
          >
            <span className="size-2.5 rounded-[2px] border border-studio-border" />
            Ungrouped
          </button>

          <span className="my-1 block border-t border-studio-divider" />

          {GROUPS.map(group => (
            <button
              key={group}
              type="button"
              role="menuitem"
              aria-current={group === value}
              onClick={() => pick(group)}
              className={cn(
                `flex w-full items-center gap-2 rounded-[4px] px-2 py-1 text-left text-xs hover:bg-studio-surface
                  focus:outline-none focus-visible:bg-studio-surface`,
                group === value ? 'font-semibold text-studio-text' : 'text-studio-text',
              )}
            >
              <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: colorOf(group) }} />
              {group}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
