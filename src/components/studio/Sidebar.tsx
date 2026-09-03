'use client';

import { ChevronRight, MonitorPlay, Video } from 'lucide-react';
import type { ReactNode } from 'react';

import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { versionsByLang } from '@/lib/bible/catalog';
import { cn } from '@/lib/cn';
import { THEMES } from '@/lib/projector/themes';
import { stageLangOf } from '@/lib/studio/settings';
import { useStudio } from '@/lib/studio/StudioProvider';
import { LANG_LABELS, LANGS, type Lang } from '@/lib/types';

import { SortHandle } from './SortHandle';
import { useSortable } from './sortable';

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="border-b border-studio-divider px-4 py-4 last:border-b-0">
    <h2 className="text-[11px] font-semibold tracking-wider text-studio-faint uppercase">{title}</h2>
    {hint ? <p className="mt-1 mb-3 text-xs leading-relaxed text-studio-muted">{hint}</p> : null}
    <div className={hint ? '' : 'mt-3'}>{children}</div>
  </section>
);

/** A row in the footer: what a setup area is set to, click to change. */
const SummaryRow = ({
  icon,
  label,
  value,
  thumb,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  thumb?: string;
  onClick: () => void;
}) => (
  <div className="px-2 py-1.5">
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-studio px-2 py-1.5 text-left transition-colors duration-150
        hover:bg-studio-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="size-7 shrink-0 rounded-[4px] object-cover ring-1 ring-studio-border" />
      ) : (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] border border-studio-border
            bg-studio-surface text-studio-muted"
        >
          {icon}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-studio-text">{label}</span>
        <span className="block truncate text-[11px] text-studio-faint">{value}</span>
      </span>

      <ChevronRight className="size-4 shrink-0 text-studio-faint" />
    </button>
  </div>
);

/**
 * The live rail: what is being browsed, and what the projector is armed with.
 *
 * Setup that is not touched mid-service — backgrounds, typefaces, the stream —
 * sits one click away in the settings dialog, summarised at the foot.
 */
export const Sidebar = ({ onSettings }: { onSettings: (tab: string) => void }) => {
  const { settings, update, setLangOrder, peers } = useStudio();

  const theme = THEMES.find(entry => entry.id === settings.theme);

  // The stacking order on the projector, dragged by the number each row is read
  // by. Committed on release, not on every row the pointer crosses.
  const sortable = useSortable(settings.langOrder, lang => lang, ids => setLangOrder(ids as Lang[]));

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
        <Section title="Browsing in" hint="The language and translation printed on the verse cards below.">
          <div className="space-y-2">
            <Select
              value={settings.adminLang}
              onChange={value => update({ adminLang: value as Lang })}
              options={LANGS.map(lang => ({ value: lang, label: LANG_LABELS[lang] }))}
              className="w-full"
            />

            <Select
              value={settings.adminVersion}
              onChange={value => update({ adminVersion: value })}
              options={versionsByLang[settings.adminLang].map(version => ({
                value: version.value,
                label: version.label,
              }))}
              className="w-full"
            />
          </div>
        </Section>

        <Section title="Projector" hint="Armed languages are fetched with each passage and shown together on screen. Stage marks the one language the stage display reads.">
          {/* The gaps between the rows belong to the list, and a release in
              one of them is still a release on the order the drag arrived at. */}
          <ul className="space-y-3" {...sortable.list()}>
            {sortable.items.map((lang, index) => (
              <li
                key={lang}
                {...sortable.row(lang)}
                className={cn(
                  'group rounded-studio transition-opacity duration-150',
                  // The browser snapshots the ghost before this paints, so the
                  // fade lands on the slot the row is holding open.
                  sortable.lifted === lang && 'opacity-40',
                )}
              >
                <div className="flex items-center gap-2">
                  <SortHandle index={index} className="w-4" {...sortable.handle(lang)} />

                  <span
                    className={cn(
                      'flex-1 text-sm font-medium',
                      settings.enabled[lang] ? 'text-studio-text' : 'text-studio-faint',
                    )}
                  >
                    {LANG_LABELS[lang]}
                  </span>

                  {/* The stage monitor shows one language, not the armed set:
                      the person standing up is reading it rather than glancing
                      at it. It is picked on the row it belongs to, beside the
                      switch that arms it — nothing can be chosen here that the
                      room is not shown. A named chip rather than a bare radio:
                      one dot in a column of switches says nothing about what it
                      decides. */}
                  <button
                    type="button"
                    aria-pressed={stageLangOf(settings) === lang}
                    disabled={!settings.enabled[lang]}
                    title={`Read ${LANG_LABELS[lang]} on the stage display`}
                    onClick={() => update({ stageLang: lang })}
                    className={cn(
                      `rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase
                        transition-colors duration-150 focus:outline-none
                        focus-visible:ring-2 focus-visible:ring-studio-accent/40`,
                      !settings.enabled[lang]
                        ? 'cursor-not-allowed border-transparent text-studio-faint/50'
                        : stageLangOf(settings) === lang
                          ? 'border-studio-accent bg-studio-accent text-white'
                          : 'border-studio-border text-studio-faint hover:bg-studio-surface hover:text-studio-muted',
                    )}
                  >
                    Stage
                  </button>

                  <Toggle
                    checked={settings.enabled[lang]}
                    onChange={checked => update({ enabled: { ...settings.enabled, [lang]: checked } })}
                    label={`Show ${LANG_LABELS[lang]} on the projector`}
                  />
                </div>

                <Select
                  value={settings.versions[lang]}
                  onChange={value => update({ versions: { ...settings.versions, [lang]: value } })}
                  options={versionsByLang[lang].map(version => ({ value: version.value, label: version.label }))}
                  className="mt-1.5 w-full"
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Stream" hint="What the OBS lower third is carrying right now.">
          {/* Says what is actually there rather than what was configured: the
              dot is presence on the session's channel, so an overlay that has
              been closed in OBS shows as gone without anything to refresh. */}
          <div className="flex items-center justify-between rounded-studio border border-studio-border px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-studio-text">
              <span
                aria-hidden
                className={cn('size-1.5 shrink-0 rounded-full', peers.lower3rd ? 'bg-studio-go' : 'bg-studio-border')}
              />
              {peers.lower3rd ? 'Connected' : 'No overlay'}
            </span>

            <Toggle
              checked={!settings.obsHidden}
              onChange={checked => update({ obsHidden: !checked })}
              label="Show slides in OBS"
            />
          </div>

          <p className="mt-3 text-xs text-studio-muted">Language on stream</p>

          <div className="mt-1.5 space-y-1">
            {LANGS.map(lang => (
              <label
                key={lang}
                className={cn(
                  'flex items-center gap-2 text-sm',
                  settings.enabled[lang] ? 'text-studio-text' : 'text-studio-faint',
                )}
              >
                <input
                  type="radio"
                  name="stream-language"
                  checked={settings.streamLang === lang}
                  disabled={!settings.enabled[lang]}
                  onChange={() => update({ streamLang: lang })}
                  className="accent-studio-accent"
                />
                {LANG_LABELS[lang]}
                {settings.enabled[lang] ? '' : ' · not armed'}
              </label>
            ))}
          </div>
        </Section>
      </div>

      <div className="shrink-0 border-t border-studio-border">
        <SummaryRow
          icon={<MonitorPlay className="size-4" />}
          label="Projector look"
          value={`${theme?.label ?? 'Custom image'} · ${settings.font.replace('font-', '')}`}
          thumb={theme?.src}
          onClick={() => onSettings('projector')}
        />

        <SummaryRow
          icon={<Video className="size-4" />}
          label="Stream"
          value={settings.obsHidden ? 'Blanked' : `${LANG_LABELS[settings.streamLang]} · ${settings.lowerThirdPosition}`}
          onClick={() => onSettings('stream')}
        />
      </div>
    </div>
  );
};
