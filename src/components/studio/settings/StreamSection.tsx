'use client';

import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

import { LowerThirdStylePicker } from '@/components/studio/pickers/LowerThirdStylePicker';
import { isCustomLook } from '@/lib/projector/looks';

import { Field, TypeRow } from '@/components/studio/settings/StyleSection';

const POSITIONS = [
  { value: 'bottom' as const, label: 'Bottom', Icon: MdArrowDownward },
  { value: 'top' as const, label: 'Top', Icon: MdArrowUpward },
];

export const StreamSection = () => {
  const { settings, update } = useStudio();

  return (
    <div className="space-y-6">
      <LowerThirdStylePicker />

      {isCustomLook(settings.lowerThirdVariant) && isCustomLook(settings.lyricsVariant) ? null : (
      <Field label="Position on screen">
        <div className="grid grid-cols-2 gap-2">
          {POSITIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={settings.lowerThirdPosition === value}
              onClick={() => update({ lowerThirdPosition: value })}
              className={cn(
                'flex h-9 items-center justify-center gap-1.5 rounded-studio border text-xs font-medium',
                'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                settings.lowerThirdPosition === value
                  ? 'border-studio-accent bg-studio-accent text-studio-onaccent'
                  : 'border-studio-border bg-studio-bg text-studio-text hover:bg-studio-surface',
              )}
            >
              <Icon className="text-sm" />
              {label}
            </button>
          ))}
        </div>
      </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isCustomLook(settings.lowerThirdVariant) ? null : (
          <TypeRow
            label="Verse type"
            hint="Typeface and alignment for Bible slides on the stream."
            font={settings.streamFont}
            fonts={settings.customFonts}
            setFont={value => update({ streamFont: value })}
            align={settings.streamAlign}
            setAlign={value => update({ streamAlign: value })}
          />
        )}

        {isCustomLook(settings.lyricsVariant) ? null : (
          <TypeRow
            label="Lyric type"
            hint="Song slides on the stream get their own look."
            font={settings.streamLyricsFont}
            fonts={settings.customFonts}
            setFont={value => update({ streamLyricsFont: value })}
            align={settings.streamLyricsAlign}
            setAlign={value => update({ streamLyricsAlign: value })}
          />
        )}
      </div>
    </div>
  );
};
