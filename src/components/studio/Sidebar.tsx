'use client';

import { ChevronRight, GripVertical, MonitorPlay, Video } from 'lucide-react';
import { Fragment, useState, type DragEvent, type ReactNode } from 'react';

import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { versionsByLang } from '@/lib/bible/catalog';
import { cn } from '@/lib/cn';
import { THEMES } from '@/lib/projector/themes';
import { useStudio } from '@/lib/studio/StudioProvider';
import { LANG_LABELS, LANGS, type Lang } from '@/lib/types';

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

  // Dragging is armed by the grip alone. Without that the whole row is
  // draggable, which makes the translation select impossible to use and lets a
  // stray drag reorder the projector mid-service.
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState<Lang | null>(null);

  /** Where the row would land: a slot *between* rows, 0..langOrder.length. */
  const [dropAt, setDropAt] = useState<number | null>(null);

  const theme = THEMES.find(entry => entry.id === settings.theme);

  const endDrag = () => {
    setArmed(false);
    setDragging(null);
    setDropAt(null);
  };

  /** Above the midpoint drops before the row, below it drops after. */
  const trackSlot = (event: DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault();

    const box = event.currentTarget.getBoundingClientRect();

    setDropAt(event.clientY < box.top + box.height / 2 ? index : index + 1);
  };

  const drop = () => {
    if (!dragging || dropAt === null) return endDrag();

    const from = settings.langOrder.indexOf(dragging);
    const order = settings.langOrder.filter(lang => lang !== dragging);

    // Removing the row first shifts every later slot down by one.
    order.splice(from < dropAt ? dropAt - 1 : dropAt, 0, dragging);

    setLangOrder(order);
    endDrag();
  };

  /**
   * The line that says exactly where the row will land. A plain function, not a
   * component, so React is not handed a new component type on every render.
   */
  const marker = (at: number) => (
    <li aria-hidden key={`slot-${at}`} className="relative h-0">
      {dropAt === at && dragging ? (
        <span className="absolute -top-1.5 right-0 left-0 h-0.5 rounded-full bg-studio-accent" />
      ) : null}
    </li>
  );

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

        <Section title="Projector" hint="Armed languages are fetched with each passage and shown together on screen.">
          <ul className="space-y-3" onDragLeave={() => setDropAt(null)}>
            {settings.langOrder.map((lang, index) => (
              <Fragment key={lang}>
                {marker(index)}

                <li
                  draggable={armed}
                  onDragStart={event => {
                    setDragging(lang);
                    event.dataTransfer.effectAllowed = 'move';
                    // Drag the header, not the whole row: a ghost carrying the
                    // translation dropdown obscures the list it is moving through.
                    const header = event.currentTarget.firstElementChild;
                    if (header) event.dataTransfer.setDragImage(header, 12, 12);
                  }}
                  onDragEnd={endDrag}
                  onDragOver={event => trackSlot(event, index)}
                  onDrop={drop}
                  className={cn('rounded-studio transition-opacity duration-150', dragging === lang && 'opacity-40')}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      title="Drag to reorder"
                      onPointerDown={() => setArmed(true)}
                      onPointerUp={() => setArmed(false)}
                      className="cursor-grab rounded text-studio-faint transition-colors duration-150
                        hover:text-studio-muted active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </span>

                    <span
                      className={cn(
                        'flex-1 text-sm font-medium',
                        settings.enabled[lang] ? 'text-studio-text' : 'text-studio-faint',
                      )}
                    >
                      {LANG_LABELS[lang]}
                    </span>

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
              </Fragment>
            ))}

            {marker(settings.langOrder.length)}
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
