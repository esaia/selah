'use client';

import { useState } from 'react';
import { MdArrowDownward, MdArrowUpward, MdHelpOutline } from 'react-icons/md';

import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import { LANG_LABELS, LANGS, type Lang } from '@/lib/types';

import { LowerThirdStylePicker } from './LowerThirdStylePicker';
import { CopyField, ObsHelpModal } from './ObsHelpModal';
import { Field } from './StyleSection';

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
 * connect: a Browser Source with the URL below is the whole setup.
 */
export const StreamSection = () => {
  const { settings, update, session, peers } = useStudio();
  const [helping, setHelping] = useState(false);

  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/lower3rd/${session.outputKey}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Field label="Browser Source URL" hint="Paste this into a Browser Source in OBS.">
          <CopyField label="URL" value={url} />

          <button
            type="button"
            onClick={() => setHelping(true)}
            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-studio border
              border-studio-border bg-studio-surface text-xs font-medium text-studio-text transition-colors
              duration-150 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            <MdHelpOutline className="text-base text-studio-muted" />
            How to set this up
          </button>

          <p className="mt-2 text-[11px] leading-relaxed text-studio-faint">
            The link needs no sign-in, so treat it the way you would a meeting link.
          </p>
        </Field>

        <Field label="On air" hint="Blanking keeps the Browser Source connected, so nothing has to be re-added in OBS.">
          <div className="flex items-center justify-between rounded-studio border border-studio-border px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-studio-text">
              <span
                className={cn('size-1.5 rounded-full', peers.lower3rd ? 'bg-studio-go' : 'bg-studio-border')}
                aria-hidden
              />
              {peers.lower3rd ? 'Connected' : 'No overlay connected'}
            </span>

            <Toggle
              checked={!settings.obsHidden}
              onChange={checked => update({ obsHidden: !checked })}
              label="Show slides in OBS"
            />
          </div>
        </Field>

        <Field label="Language on the stream" hint="One language only, chosen from the ones you have armed.">
          <Select
            className="w-full"
            value={settings.streamLang}
            onChange={value => update({ streamLang: value as Lang })}
            options={LANGS.map(lang => ({
              value: lang,
              label: settings.enabled[lang] ? LANG_LABELS[lang] : `${LANG_LABELS[lang]} — not armed`,
              disabled: !settings.enabled[lang],
            }))}
          />
        </Field>
      </div>

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
                    ? 'border-studio-accent bg-studio-accent text-white'
                    : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface',
                )}
              >
                <Icon className="text-sm" />
                {label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {helping ? <ObsHelpModal sourceUrl={url} onClose={() => setHelping(false)} /> : null}
    </div>
  );
};
