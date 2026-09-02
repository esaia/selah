'use client';

import type { CSSProperties, ReactNode } from 'react';
import { MdFormatAlignCenter, MdFormatAlignLeft, MdFormatAlignRight } from 'react-icons/md';

import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { MAX_TRANSITION_MS, MIN_TRANSITION_MS } from '@/lib/projector/transition';
import { DYNAMIC_THEME, THEMES } from '@/lib/projector/themes';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Align } from '@/lib/types';

import { LocalBackgrounds } from './LocalBackgrounds';

const ALIGNMENTS = [
  { value: 'left' as Align, label: 'Align left', Icon: MdFormatAlignLeft },
  { value: 'center' as Align, label: 'Align center', Icon: MdFormatAlignCenter },
  { value: 'right' as Align, label: 'Align right', Icon: MdFormatAlignRight },
];

// Only the first two are Georgian-only / Latin-only; the rest cover Georgian,
// Latin and Cyrillic, so one typeface serves all three projector languages.
export const FONTS = [
  { value: 'font-banner', label: 'BPG Banner Caps (Georgian)' },
  { value: 'font-valera', label: 'Varela Round (Latin)' },
  { value: 'font-firago', label: 'FiraGO' },
  { value: 'font-notosans', label: 'Noto Sans' },
  { value: 'font-notoserif', label: 'Noto Serif' },
];

export const fontLabel = (value: string) => FONTS.find(font => font.value === value)?.label ?? value;

/** A titled block inside the settings dialog. */
export const Field = ({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={className}>
    <span className="block text-xs font-semibold text-studio-text">{label}</span>
    {hint ? <p className="mt-0.5 text-[11px] leading-snug text-studio-faint">{hint}</p> : null}
    <div className="mt-2">{children}</div>
  </div>
);

/** Typeface and alignment for one kind of slide: verses, or song lyrics. */
const TypeRow = ({
  label,
  hint,
  font,
  setFont,
  align,
  setAlign,
}: {
  label: string;
  hint: string;
  font: string;
  setFont: (value: string) => void;
  align: Align;
  setAlign: (value: Align) => void;
}) => (
  <Field label={label} hint={hint}>
    <div className="flex items-center gap-1.5">
      <Select className="min-w-0 flex-1" value={font} onChange={setFont} options={FONTS} />

      <div className="flex shrink-0 items-center gap-0.5 rounded-studio border border-studio-border p-0.5">
        {ALIGNMENTS.map(({ value, label: title, Icon }) => (
          <button
            key={value}
            type="button"
            aria-label={`${title} — ${label.toLowerCase()}`}
            title={`${title} — ${label.toLowerCase()}`}
            aria-pressed={align === value}
            onClick={() => setAlign(value)}
            className={cn(
              'flex size-7 items-center justify-center rounded-[4px] transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
              align === value
                ? 'bg-studio-accent text-white'
                : 'text-studio-muted hover:bg-studio-surface hover:text-studio-text',
            )}
          >
            <Icon className="text-sm" />
          </button>
        ))}
      </div>
    </div>
  </Field>
);

/**
 * The projector panel of the settings dialog: the background behind the words,
 * the typeface they are set in, and how one slide gives way to the next.
 */
export const StyleSection = () => {
  const { settings, update } = useStudio();

  return (
    <div className="space-y-6">
      <Field label="Background" hint="Shown behind the text on the projector screen.">
        <div
          className="studio-scroll max-h-[260px] overflow-y-auto rounded-studio border border-studio-border
            bg-studio-surface p-2"
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {THEMES.map(item => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                title={item.label}
                aria-pressed={settings.theme === item.id}
                onClick={() => update({ theme: item.id })}
                className={cn(
                  'overflow-hidden rounded-[4px] transition-shadow duration-150 focus:outline-none',
                  settings.theme === item.id
                    ? 'ring-2 ring-studio-accent'
                    : 'ring-1 ring-studio-border hover:ring-studio-faint',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" loading="lazy" className="h-14 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <LocalBackgrounds />

        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="text"
            value={settings.dynamicImage}
            placeholder="…or paste your own image URL"
            onChange={event => update({ dynamicImage: event.target.value })}
            className="h-8 min-w-0 flex-1 rounded-studio border border-studio-border px-2.5 text-xs text-studio-text
              placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          />
          <button
            type="button"
            onClick={() => update({ theme: DYNAMIC_THEME })}
            className={cn(
              'h-8 shrink-0 rounded-studio border px-3 text-xs font-medium transition-colors duration-150',
              settings.theme === DYNAMIC_THEME
                ? 'border-studio-accent bg-studio-accent text-white'
                : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface',
            )}
          >
            Use
          </button>
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <TypeRow
          label="Verse type"
          hint="Typeface and alignment for Bible slides."
          font={settings.font}
          setFont={value => update({ font: value })}
          align={settings.align}
          setAlign={value => update({ align: value })}
        />

        <TypeRow
          label="Lyric type"
          hint="Song slides get their own look."
          font={settings.lyricsFont}
          setFont={value => update({ lyricsFont: value })}
          align={settings.lyricsAlign}
          setAlign={value => update({ lyricsAlign: value })}
        />
      </div>

      <Field label="Transition" hint="Crossfade between slides. Slide it to zero for a hard cut.">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={MIN_TRANSITION_MS}
            max={MAX_TRANSITION_MS}
            step={10}
            value={settings.transitionMs}
            aria-label="Slide transition duration in milliseconds"
            onChange={event => update({ transitionMs: Number(event.target.value) })}
            style={
              {
                '--range-fill': `${((settings.transitionMs - MIN_TRANSITION_MS) / (MAX_TRANSITION_MS - MIN_TRANSITION_MS)) * 100}%`,
              } as CSSProperties
            }
            className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border"
          />

          <span className="w-12 shrink-0 text-right text-xs text-studio-muted tabular-nums">
            {settings.transitionMs === 0 ? 'Off' : `${settings.transitionMs}ms`}
          </span>
        </div>
      </Field>
    </div>
  );
};
