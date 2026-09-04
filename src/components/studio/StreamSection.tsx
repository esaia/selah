'use client';

import { MdArrowDownward, MdArrowUpward } from 'react-icons/md';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

import { LowerThirdStylePicker } from './LowerThirdStylePicker';
import { Field, TypeRow } from './StyleSection';

const POSITIONS = [
  { value: 'bottom' as const, label: 'Bottom', Icon: MdArrowDownward },
  { value: 'top' as const, label: 'Top', Icon: MdArrowUpward },
];

/**
 * The stream panel: what the OBS overlay carries, and how it sits on the shot.
 *
 * In the old app this tab also held an obs-websocket connection — address,
 * password, and a running commentary on why it could not reach OBS. The overlay
 * now joins the same realtime channel as the projector, so there is nothing to
 * connect at all.
 *
 * It is only the look, too: the Browser Source link is in the app bar's Present
 * menu, blanking is a lamp on the output bar, and the stream's language is
 * picked on the destination itself in the sidebar. This panel is what the
 * overlay looks like on the shot, and nothing else.
 */
export const StreamSection = () => {
  const { settings, update } = useStudio();

  return (
    <div className="space-y-6">
      <LowerThirdStylePicker />

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

      {/* Side by side, because these two are read against each other. Its own
          type, not the projector's — the wall and the camera shot are read from
          different distances and almost never want the same setting — and a
          typeface name needs the room to be read as one. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TypeRow
          label="Verse type"
          hint="Typeface and alignment for Bible slides on the stream."
          font={settings.streamFont}
          fonts={settings.customFonts}
          setFont={value => update({ streamFont: value })}
          align={settings.streamAlign}
          setAlign={value => update({ streamAlign: value })}
        />

        <TypeRow
          label="Lyric type"
          hint="Song slides on the stream get their own look."
          font={settings.streamLyricsFont}
          fonts={settings.customFonts}
          setFont={value => update({ streamLyricsFont: value })}
          align={settings.streamLyricsAlign}
          setAlign={value => update({ streamLyricsAlign: value })}
        />
      </div>
    </div>
  );
};
