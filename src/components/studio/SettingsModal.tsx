'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

import { versionsByLang } from '@/lib/bible/catalog';
import { cn } from '@/lib/cn';
import { MAX_TRANSITION_MS } from '@/lib/projector/transition';
import { THEMES } from '@/lib/projector/themes';
import { useStudio } from '@/lib/studio/StudioProvider';
import { LANG_LABELS, LANGS, type Align, type Lang } from '@/lib/types';

import { AccountSection } from './AccountSection';
import { LocalBackgrounds } from './LocalBackgrounds';

const TABS = ['translations', 'projector', 'stream', 'devices', 'account'] as const;
type SettingsTab = (typeof TABS)[number];

const TAB_LABELS: Record<SettingsTab, string> = {
  translations: 'Translations',
  projector: 'Projector',
  stream: 'Stream',
  devices: 'Devices',
  account: 'Account',
};

const FONTS = [
  { value: 'font-banner', label: 'BPG Banner Caps' },
  { value: 'font-firago', label: 'FiraGO' },
  { value: 'font-notosans', label: 'Noto Sans' },
  { value: 'font-notoserif', label: 'Noto Serif' },
  { value: 'font-valera', label: 'Varela Round' },
];

const ALIGNS: Align[] = ['left', 'center', 'right'];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-ink-500 text-xs">{label}</span>
    <div className="mt-1.5">{children}</div>
  </label>
);

const select =
  'border-ink-800 bg-ink-900 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-brand-500';

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const { settings, update, moveLang, session } = useStudio();
  const [tab, setTab] = useState<SettingsTab>('translations');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div
        className="border-ink-800 bg-ink-900 flex h-[34rem] w-full max-w-4xl overflow-hidden rounded-xl border"
        onClick={event => event.stopPropagation()}
      >
        <nav className="border-ink-850 w-44 shrink-0 border-r py-3">
          {TABS.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={cn(
                'w-full px-4 py-2 text-left text-sm transition',
                tab === name ? 'bg-ink-850 text-white' : 'text-ink-500 hover:text-white',
              )}
            >
              {TAB_LABELS[name]}
            </button>
          ))}
        </nav>

        <div className="studio-scroll flex-1 overflow-y-auto p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-500 float-right hover:text-white"
          >
            <X className="size-4" />
          </button>

          {tab === 'translations' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm">Which languages go on screen</h2>
                <p className="text-ink-500 mt-1 text-xs">
                  Only armed languages are fetched, so turning one off makes every passage load faster. Drag order is
                  top to bottom on the projector.
                </p>

                <ul className="mt-4 space-y-2">
                  {settings.langOrder.map((lang, index) => (
                    <li key={lang} className="border-ink-850 flex items-center gap-3 rounded-lg border p-3">
                      <input
                        type="checkbox"
                        checked={settings.enabled[lang]}
                        onChange={event =>
                          update({ enabled: { ...settings.enabled, [lang]: event.target.checked } })
                        }
                        className="accent-brand-500 size-4"
                      />

                      <span className="w-20 text-sm">{LANG_LABELS[lang]}</span>

                      <select
                        value={settings.versions[lang]}
                        onChange={event => update({ versions: { ...settings.versions, [lang]: event.target.value } })}
                        className={cn(select, 'flex-1')}
                      >
                        {versionsByLang[lang].map(version => (
                          <option key={version.value} value={version.value}>
                            {version.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveLang(lang, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${LANG_LABELS[lang]} up`}
                          className="text-ink-500 hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLang(lang, 1)}
                          disabled={index === settings.langOrder.length - 1}
                          aria-label={`Move ${LANG_LABELS[lang]} down`}
                          className="text-ink-500 hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Language you browse in">
                  <select
                    value={settings.adminLang}
                    onChange={event => update({ adminLang: event.target.value as Lang })}
                    className={select}
                  >
                    {LANGS.map(lang => (
                      <option key={lang} value={lang}>
                        {LANG_LABELS[lang]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Translation you browse in">
                  <select
                    value={settings.adminVersion}
                    onChange={event => update({ adminVersion: event.target.value })}
                    className={select}
                  >
                    {versionsByLang[settings.adminLang].map(version => (
                      <option key={version.value} value={version.value}>
                        {version.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          ) : null}

          {tab === 'projector' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Verse typeface">
                  <select value={settings.font} onChange={event => update({ font: event.target.value })} className={select}>
                    {FONTS.map(font => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Verse alignment">
                  <select
                    value={settings.align}
                    onChange={event => update({ align: event.target.value as Align })}
                    className={select}
                  >
                    {ALIGNS.map(align => (
                      <option key={align} value={align}>
                        {align}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Lyrics typeface">
                  <select
                    value={settings.lyricsFont}
                    onChange={event => update({ lyricsFont: event.target.value })}
                    className={select}
                  >
                    {FONTS.map(font => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Lyrics alignment">
                  <select
                    value={settings.lyricsAlign}
                    onChange={event => update({ lyricsAlign: event.target.value as Align })}
                    className={select}
                  >
                    {ALIGNS.map(align => (
                      <option key={align} value={align}>
                        {align}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label={`Crossfade — ${settings.transitionMs}ms${settings.transitionMs === 0 ? ' (hard cut)' : ''}`}>
                <input
                  type="range"
                  min={0}
                  max={MAX_TRANSITION_MS}
                  step={10}
                  value={settings.transitionMs}
                  onChange={event => update({ transitionMs: Number(event.target.value) })}
                  className="accent-brand-500 w-full"
                />
              </Field>

              <div>
                <h2 className="text-sm">Background</h2>

                <div className="mt-3 grid grid-cols-6 gap-2">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => update({ theme: theme.id })}
                      title={theme.label}
                      className={cn(
                        'h-12 rounded bg-cover bg-center ring-offset-2 ring-offset-ink-900 transition',
                        settings.theme === theme.id ? 'ring-brand-500 ring-2' : 'hover:ring-ink-700 hover:ring-1',
                      )}
                      style={{ backgroundImage: `url(${theme.src})` }}
                    />
                  ))}
                </div>

                <Field label="…or a picture from a URL">
                  <input
                    value={settings.dynamicImage}
                    onChange={event => update({ dynamicImage: event.target.value, theme: 'dynamicIMG' })}
                    placeholder="https://…"
                    className={select}
                  />
                </Field>

                <div className="mt-6">
                  <LocalBackgrounds />
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'stream' ? (
            <div className="space-y-6">
              <p className="text-ink-500 text-xs">
                The lower third carries one language. Pick it from the ones you have armed — disarm that language and
                the stream falls back to the first armed one rather than going blank.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Language on the stream">
                  <select
                    value={settings.streamLang}
                    onChange={event => update({ streamLang: event.target.value as Lang })}
                    className={select}
                  >
                    {LANGS.map(lang => (
                      <option key={lang} value={lang} disabled={!settings.enabled[lang]}>
                        {LANG_LABELS[lang]}
                        {settings.enabled[lang] ? '' : ' — not armed'}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Position">
                  <select
                    value={settings.lowerThirdPosition}
                    onChange={event => update({ lowerThirdPosition: event.target.value as 'top' | 'bottom' })}
                    className={select}
                  >
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                  </select>
                </Field>
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={settings.obsHidden}
                  onChange={event => update({ obsHidden: event.target.checked })}
                  className="accent-brand-500 size-4"
                />
                Blank the overlay (the connection stays up)
              </label>
            </div>
          ) : null}

          {tab === 'devices' ? (
            <div className="space-y-6 text-sm">
              <div>
                <h2>Projector</h2>
                <p className="text-ink-500 mt-1 text-xs">
                  Open this on the machine driving the screen and put the browser in fullscreen. It needs no sign-in.
                </p>
                <code className="border-ink-850 bg-ink-950 mt-2 block truncate rounded border px-3 py-2 text-xs">
                  /show/{session.outputKey}
                </code>
              </div>

              <div>
                <h2>OBS lower third</h2>
                <p className="text-ink-500 mt-1 text-xs">
                  Add a Browser Source in OBS, paste this URL, set it to 1920×1080 and tick “Shutdown source when not
                  visible”. The overlay is transparent — no chroma key, no plugin, and nothing to configure in OBS
                  beyond the URL.
                </p>
                <code className="border-ink-850 bg-ink-950 mt-2 block truncate rounded border px-3 py-2 text-xs">
                  /lower3rd/{session.outputKey}
                </code>
              </div>

              <p className="text-ink-700 text-xs">
                Anyone with these links can see what you put on screen, so treat them the way you would a meeting link.
              </p>
            </div>
          ) : null}

          {tab === 'account' ? <AccountSection /> : null}
        </div>
      </div>
    </div>
  );
};
