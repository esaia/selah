'use client';

import { ChevronRight, MonitorPlay, Video, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/cn';
import { THEMES } from '@/lib/projector/themes';
import { stageLangOf, streamLangOf } from '@/lib/studio/settings';
import { useStudio } from '@/lib/studio/StudioProvider';
import { LANG_LABELS, LANGS, MAX_LANGS, REQUIRED_LANG, versionsOf, type Lang } from '@/lib/types';

import { SortHandle } from './SortHandle';
import { LIFTED_SLOT, useSortable } from './sortable';

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
 * Where one of the armed languages goes.
 *
 * The projector carries the set; the stage monitor and the OBS lower third
 * carry one language each. Both picks live on the row that arms them —
 * nothing can be chosen here that the room is not shown — but as columns
 * rather than as chips: named once at the head of the list, they cost each row
 * a radio instead of two spelled-out words, and reading down a column answers
 * "what is on the stage screen" at a glance.
 */
const DESTS = [
  { key: 'stage' as const, label: 'Stage', group: 'stage-language', name: 'the stage display' },
  { key: 'lower3rd' as const, label: 'Lower3rd', group: 'stream-language', name: 'the lower third in OBS' },
];

/** The column head. Every width here is repeated on the rows below it. */
const DestHeader = () => (
  <div className="mb-2 flex items-center gap-1 text-[9px] font-semibold text-studio-faint uppercase">
    <span className="w-4" aria-hidden />
    <span className="flex-1" aria-hidden />
    {DESTS.map(({ key, label }) => (
      <span key={key} className="w-11 text-center">
        {label}
      </span>
    ))}
    <span className="w-9 text-center">On</span>
    <span className="w-5" aria-hidden />
  </div>
);

const DestRadio = ({
  lang,
  armed,
  dest,
  chosen,
  onPick,
}: {
  lang: Lang;
  armed: boolean;
  dest: (typeof DESTS)[number];
  chosen: Lang;
  onPick: () => void;
}) => (
  // The dot is 14px in a column of 44: the label carries the whole cell so the
  // near-miss lands on the pick rather than on nothing.
  <label
    title={`Show ${LANG_LABELS[lang]} on ${dest.name}`}
    className={cn(
      'flex h-7 w-11 items-center justify-center rounded-studio transition-colors duration-150',
      armed ? 'cursor-pointer hover:bg-studio-surface' : 'cursor-not-allowed',
    )}
  >
    <input
      type="radio"
      name={dest.group}
      checked={chosen === lang}
      disabled={!armed}
      onChange={onPick}
      className={cn(
        'size-3.5 accent-studio-accent',
        armed ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
      )}
    />
    <span className="sr-only">{`Show ${LANG_LABELS[lang]} on ${dest.name}`}</span>
  </label>
);

/**
 * The live rail: what is being browsed, and what the projector is armed with.
 *
 * Setup that is not touched mid-service — backgrounds, typefaces, the stream —
 * sits one click away in the settings dialog, summarised at the foot.
 */
export const Sidebar = ({ onSettings }: { onSettings: (tab: string) => void }) => {
  const { settings, update, setLangOrder, addLang, removeLang, peers } = useStudio();

  // The translation the cards are printed in. An armed language reads in
  // whatever the projector is carrying; only an unarmed one has a browsing
  // translation of its own.
  const browsing = settings.enabled[settings.adminLang]
    ? (settings.versions[settings.adminLang] ?? settings.adminVersion)
    : settings.adminVersion;

  const theme = THEMES.find(entry => entry.id === settings.theme);

  // The stacking order on the projector, dragged by the number each row is read
  // by. Committed on release, not on every row the pointer crosses.
  const sortable = useSortable(settings.langOrder, lang => lang, ids => setLangOrder(ids as Lang[]));

  // One language is a list of one: nothing to stack, nothing to choose between.
  // The chips and the grip all say something about a choice, so with a
  // single row there is nothing for them to say.
  const many = settings.langOrder.length > 1;
  const spare = LANGS.filter(lang => !settings.langOrder.includes(lang));

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
        <Section title="Browsing in" hint="The language you read on the cards below.">
          <div className="space-y-2">
            <Select
              value={settings.adminLang}
              onChange={value => update({ adminLang: value as Lang })}
              options={settings.langOrder.map(lang => ({ value: lang, label: LANG_LABELS[lang] }))}
              className="w-full"
            />

            {/* One control, shown twice.
                
                A block holds one array per language, so an armed language has
                exactly one translation — the one on the projector. This is
                that same setting when the language being browsed is armed, and
                the row below moves with it. Two dropdowns over one value is
                better than a second dropdown that silently loses. */}
            <Select
              value={browsing}
              onChange={value =>
                update(
                  settings.enabled[settings.adminLang]
                    ? { versions: { ...settings.versions, [settings.adminLang]: value } }
                    : { adminVersion: value },
                )
              }
              options={versionsOf(settings.adminLang)}
              className="w-full"
            />
          </div>
        </Section>

        <Section
          title="Projector"
          hint={
            many
              ? 'These go on the big screen, one under the other. Stage and Lower3rd each carry one of them.'
              : 'This goes on the big screen. Add more to show two or three at once.'
          }
        >
          {many ? <DestHeader /> : null}

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
                  // empty berth lands on the slot the row is holding open.
                  sortable.lifted === lang && LIFTED_SLOT,
                )}
              >
                <div className="flex items-center gap-1">
                  {many ? <SortHandle index={index} className="w-4" {...sortable.handle(lang)} /> : null}

                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm font-medium',
                      settings.enabled[lang] ? 'text-studio-text' : 'text-studio-faint',
                    )}
                  >
                    {LANG_LABELS[lang]}
                  </span>

                  {many
                    ? DESTS.map(dest => (
                        <DestRadio
                          key={dest.key}
                          dest={dest}
                          lang={lang}
                          armed={Boolean(settings.enabled[lang])}
                          chosen={dest.key === 'stage' ? stageLangOf(settings) : streamLangOf(settings)}
                          onPick={() =>
                            update(dest.key === 'stage' ? { stageLang: lang } : { streamLang: lang })
                          }
                        />
                      ))
                    : null}

                  <Toggle
                    checked={Boolean(settings.enabled[lang])}
                    onChange={checked => update({ enabled: { ...settings.enabled, [lang]: checked } })}
                    label={`Show ${LANG_LABELS[lang]} on the projector`}
                  />

                  {/* English stays: it is what every output falls back to when
                      a pick goes away, so there is always one language left. */}
                  {lang === REQUIRED_LANG ? (
                    <span className="w-5" />
                  ) : (
                    <button
                      type="button"
                      title={`Take ${LANG_LABELS[lang]} off the projector`}
                      onClick={() => removeLang(lang)}
                      className="flex w-5 justify-center rounded-studio py-0.5 text-studio-faint transition-colors
                        duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none
                        focus-visible:ring-2 focus-visible:ring-studio-accent/40"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <Select
                  value={settings.versions[lang] ?? ''}
                  onChange={value => update({ versions: { ...settings.versions, [lang]: value } })}
                  options={versionsOf(lang)}
                  className="mt-1.5 w-full"
                />
              </li>
            ))}
          </ul>

          {/* Adding is a pick, not a dialog: the list is short enough that the
              native menu is the whole interaction, and it resets to its
              placeholder because it is a verb rather than a setting. */}
          {settings.langOrder.length < MAX_LANGS ? (
            <Select
              value=""
              onChange={value => addLang(value as Lang)}
              options={[
                { value: '', label: 'Add a language…' },
                ...spare.map(lang => ({ value: lang, label: LANG_LABELS[lang] })),
              ]}
              className="mt-3 w-full"
            />
          ) : null}
        </Section>

        <Section title="Stream" hint="What OBS is showing right now.">
          {/* The row is named for the thing the switch acts on, not for the
              state it happens to be in — "Connected" beside a switch reads as
              though the switch is what connects it. The state is the line
              under the name and the dot beside it: presence on the session's
              channel, so an overlay closed in OBS shows as gone without
              anything to refresh. */}
          <div className="flex items-center justify-between gap-2 rounded-studio border border-studio-border px-3 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn('size-1.5 shrink-0 rounded-full', peers.lower3rd ? 'bg-studio-go' : 'bg-studio-border')}
              />

              <span className="min-w-0">
                <span className="block text-sm text-studio-text">Lower third</span>
                <span className="block truncate text-[11px] text-studio-faint">
                  {peers.lower3rd ? 'Connected' : 'Not open anywhere'}
                </span>
              </span>
            </span>

            <Toggle
              checked={!settings.obsHidden}
              onChange={checked => update({ obsHidden: !checked })}
              label="Show slides on the lower third"
            />
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
          value={settings.obsHidden ? 'Blanked' : `${LANG_LABELS[streamLangOf(settings)]} · ${settings.lowerThirdPosition}`}
          onClick={() => onSettings('stream')}
        />
      </div>
    </div>
  );
};
