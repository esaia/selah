'use client';

import {
  ChevronRight,
  Languages,
  Mic2,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  User,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { limitMessage } from '@/lib/billing/limits';
import { cn } from '@/lib/cn';
import { fontLabelOf } from '@/lib/projector/fonts';
import { THEMES } from '@/lib/projector/themes';
import { MAX_TRANSITION_MS, MIN_TRANSITION_MS } from '@/lib/projector/transition';
import { stageLangOf, streamLangOf } from '@/lib/studio/settings';
import { useStudio } from '@/lib/studio/StudioProvider';
import { customLangsOf, versionOptions } from '@/lib/bible/custom';
import { labelOf, LANGS, MAX_LANGS, REQUIRED_LANG, type Lang } from '@/lib/types';

import { DESTS, LangDestHeader, LangDestRadio } from '@/components/studio/pickers/LangDests';
import { SongLangs } from '@/components/studio/lyrics/SongLangs';
import { SortHandle } from '@/components/studio/shared/SortHandle';
import { LIFTED_SLOT, useSortable } from '@/components/studio/shared/sortable';

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="border-b border-studio-divider px-4 py-4 last:border-b-0">
    <h2 className="text-[11px] font-semibold tracking-wider text-studio-faint uppercase">{title}</h2>
    {hint ? <p className="mt-1 mb-3 text-xs leading-relaxed text-studio-muted">{hint}</p> : null}
    <div className={hint ? '' : 'mt-3'}>{children}</div>
  </section>
);

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

const useHoverFlyout = (align: 'center' | 'top' = 'center') => {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);

    const box = anchorRef.current?.getBoundingClientRect();

    if (box) setOrigin({ top: align === 'top' ? box.top : box.top + box.height / 2, left: box.right + 8 });

    setOpen(true);
  };

  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  return { open, origin, anchorRef, show, hide };
};

const MiniIcon = ({
  icon,
  thumb,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  thumb?: string;
  label: string;
  value: string;
  onClick: () => void;
}) => {
  const { open, origin, anchorRef, show, hide } = useHoverFlyout();

  return (
    <div className="flex justify-center px-2 py-1.5">
      <button
        ref={anchorRef}
        type="button"
        onClick={onClick}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label={`${label}: ${value}`}
        className="flex size-9 items-center justify-center rounded-studio transition-colors duration-150
          hover:bg-studio-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      >
        {thumb ? (
          <img src={thumb} alt="" className="size-7 shrink-0 rounded-[4px] object-cover ring-1 ring-studio-border" />
        ) : (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-[4px] border border-studio-border
              bg-studio-surface text-studio-muted"
          >
            {icon}
          </span>
        )}
      </button>

      {open
        ? createPortal(
            <div
              role="tooltip"
              onMouseEnter={show}
              onMouseLeave={hide}
              style={{ top: origin.top, left: origin.left }}
              className="fixed z-30 w-52 -translate-y-1/2 rounded-studio border border-studio-border bg-studio-bg
                px-3 py-2 shadow-studio-panel"
            >
              <span className="block text-xs font-medium text-studio-text">{label}</span>
              <span className="block truncate text-[11px] text-studio-faint">{value}</span>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

const MiniFlyout = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => {
  const { open, origin, anchorRef, show, hide } = useHoverFlyout('top');

  return (
    <div className="flex justify-center border-b border-studio-divider px-2 py-3">
      <button
        ref={anchorRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={cn(
          'flex size-9 items-center justify-center rounded-studio text-studio-muted transition-colors duration-150',
          'hover:bg-studio-surface hover:text-studio-text focus:outline-none focus-visible:ring-2',
          'focus-visible:ring-studio-accent/40',
          open && 'bg-studio-surface text-studio-text',
        )}
      >
        {icon}
      </button>

      {open
        ? createPortal(
            <div
              onMouseEnter={show}
              onMouseLeave={hide}
              style={{ top: origin.top, left: origin.left }}
              className="studio-scroll fixed z-30 max-h-[70vh] w-80 overflow-y-auto rounded-studio border
                border-studio-border bg-studio-bg p-4 shadow-studio-panel"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

const MiniTransition = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
  const { open, origin, anchorRef, show, hide } = useHoverFlyout();

  return (
    <div className="flex justify-center border-b border-studio-divider py-1.5">
      <button
        ref={anchorRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label="Transition"
        title="Transition"
        className="flex size-9 items-center justify-center rounded-studio text-studio-muted transition-colors
          duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none focus-visible:ring-2
          focus-visible:ring-studio-accent/40"
      >
        <SlidersHorizontal className="size-4" />
      </button>

      {open
        ? createPortal(
            <div
              onMouseEnter={show}
              onMouseLeave={hide}
              style={{ top: origin.top, left: origin.left }}
              className="fixed z-30 w-56 -translate-y-1/2 rounded-studio border border-studio-border bg-studio-bg
                px-3 py-2.5 shadow-studio-panel"
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] text-studio-faint">Transition</span>

                <input
                  type="range"
                  min={MIN_TRANSITION_MS}
                  max={MAX_TRANSITION_MS}
                  step={10}
                  value={value}
                  aria-label="Slide transition duration in milliseconds"
                  title="Crossfade between slides. Slide it to zero for a hard cut."
                  onChange={event => onChange(Number(event.target.value))}
                  style={
                    {
                      '--range-fill': `${((value - MIN_TRANSITION_MS) / (MAX_TRANSITION_MS - MIN_TRANSITION_MS)) * 100}%`,
                    } as CSSProperties
                  }
                  className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full
                    bg-studio-border"
                />

                <span className="w-11 shrink-0 text-right text-[11px] text-studio-muted tabular-nums">
                  {value === 0 ? 'Cut' : `${value}ms`}
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

const RailSection = ({
  mini,
  icon,
  title,
  hint,
  children,
}: {
  mini: boolean;
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
}) =>
  mini ? (
    <MiniFlyout icon={icon} label={title}>
      <h2 className="mb-1 text-[11px] font-semibold tracking-wider text-studio-faint uppercase">{title}</h2>
      {hint ? <p className="mb-3 text-xs leading-relaxed text-studio-muted">{hint}</p> : null}
      {children}
    </MiniFlyout>
  ) : (
    <Section title={title} hint={hint}>
      {children}
    </Section>
  );

export const Sidebar = ({
  onSettings,
  mini = false,
  onToggleMini,
}: {
  onSettings: (tab: string) => void;
  mini?: boolean;
  onToggleMini?: () => void;
}) => {
  const {
    settings,
    update,
    setLangOrder,
    setAdminLang,
    addLang,
    removeLang,
    translations,
    room,
    tab,
    songs,
    activeSongId,
    setSongLangs,
    email,
    avatarUrl,
    isGuest,
  } = useStudio();

  const song = songs.find(item => item.id === activeSongId) ?? null;

  const browsing = settings.enabled[settings.adminLang]
    ? (settings.versions[settings.adminLang] ?? settings.adminVersion)
    : settings.adminVersion;

  const theme = THEMES.find(entry => entry.id === settings.theme);

  const sortable = useSortable(settings.langOrder, lang => lang, ids => setLangOrder(ids as Lang[]));

  const many = settings.langOrder.length > 1;
  const spare = [...LANGS, ...customLangsOf(translations).map(entry => entry.code)].filter(
    lang => !settings.langOrder.includes(lang),
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-studio-bg">
      {onToggleMini ? (
        <div className={cn('flex border-b border-studio-border', mini ? 'justify-center py-2' : 'justify-start px-2 py-2')}>
          <button
            type="button"
            onClick={onToggleMini}
            aria-label={mini ? 'Expand setup' : 'Collapse setup to icons'}
            title={mini ? 'Expand setup — languages, projector, stream' : 'Collapse setup to icons'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-studio text-studio-muted
              transition-colors duration-150 hover:bg-studio-surface hover:text-studio-text focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            {mini ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
      ) : null}

      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
        {tab === 'lyrics' ? (
          <RailSection
            mini={mini}
            icon={<Mic2 className="size-4" />}
            title={song ? song.title : 'Song'}
            hint={
              song
                ? 'The languages this song is sung in. They go on the big screen one under the other, and Stage and Lower3rd each carry one of them. The first one is the song itself — drag another above it to change which that is.'
                : undefined
            }
          >
            {song ? (
              <SongLangs song={song} onChange={next => void setSongLangs(next)} />
            ) : (
              <p className="text-xs leading-relaxed text-studio-muted">
                Open a song to say which languages it is sung in.
              </p>
            )}
          </RailSection>
        ) : (
          <>
            <RailSection mini={mini} icon={<Languages className="size-4" />} title="Browsing in" hint="The language you read on the cards below.">
              <div className="space-y-2">
                <Select
                  value={settings.adminLang}
                  onChange={value => setAdminLang(value as Lang)}
                  options={settings.langOrder.map(lang => ({ value: lang, label: labelOf(lang) }))}
                  className="w-full"
                />

                <Select
                  value={browsing}
                  onChange={value =>
                    update(
                      settings.enabled[settings.adminLang]
                        ? { versions: { ...settings.versions, [settings.adminLang]: value } }
                        : { adminVersion: value },
                    )
                  }
                  options={versionOptions(settings.adminLang, translations)}
                  className="w-full"
                />
              </div>
            </RailSection>

            <RailSection
              mini={mini}
              icon={<MonitorPlay className="size-4" />}
              title="Projector"
              hint={
                many
                  ? 'These go on the big screen, one under the other. Stage and Lower3rd each carry one of them.'
                  : 'This goes on the big screen. Add more to show two or three at once.'
              }
            >
              {many ? <LangDestHeader /> : null}

              <ul className="space-y-3" {...sortable.list()}>
                {sortable.items.map((lang, index) => (
                  <li
                    key={lang}
                    {...sortable.row(lang)}
                    className={cn(
                      'group rounded-studio transition-opacity duration-150',
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
                        {labelOf(lang)}
                      </span>

                      {many
                        ? DESTS.map(dest => (
                            <LangDestRadio
                              key={dest.key}
                              dest={dest}
                              name={dest.group}
                              label={labelOf(lang)}
                              armed={Boolean(settings.enabled[lang])}
                              chosen={(dest.key === 'stage' ? stageLangOf(settings) : streamLangOf(settings)) === lang}
                              onPick={() =>
                                update(dest.key === 'stage' ? { stageLang: lang } : { streamLang: lang })
                              }
                            />
                          ))
                        : null}

                      <Toggle
                        checked={Boolean(settings.enabled[lang])}
                        onChange={checked => update({ enabled: { ...settings.enabled, [lang]: checked } })}
                        label={`Show ${labelOf(lang)} on the projector`}
                      />

                      {lang === REQUIRED_LANG ? (
                        <span className="w-5" />
                      ) : (
                        <button
                          type="button"
                          title={`Take ${labelOf(lang)} off the projector`}
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
                      options={versionOptions(lang, translations)}
                      className="mt-1.5 w-full"
                    />
                  </li>
                ))}
              </ul>

              {settings.langOrder.length >= MAX_LANGS ? null : room('languages') ? (
                <Select
                  value=""
                  onChange={value => addLang(value as Lang)}
                  options={[
                    { value: '', label: 'Add a language…' },
                    ...spare.map(lang => ({ value: lang, label: labelOf(lang) })),
                  ]}
                  className="mt-3 w-full"
                />
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-studio-muted">
                  {limitMessage('languages')}{' '}
                  <a href="/pricing" className="text-studio-accent underline underline-offset-2">
                    See Pro
                  </a>
                </p>
              )}
            </RailSection>
          </>
        )}

      </div>

      <div className="shrink-0 border-t border-studio-border">
        {mini ? (
          <MiniTransition
            value={settings.transitionMs}
            onChange={transitionMs => update({ transitionMs })}
          />
        ) : (
          <label className="flex h-9 items-center gap-2 border-b border-studio-divider px-4">
            <span className="shrink-0 text-[11px] text-studio-faint">Transition</span>

            <input
              type="range"
              min={MIN_TRANSITION_MS}
              max={MAX_TRANSITION_MS}
              step={10}
              value={settings.transitionMs}
              aria-label="Slide transition duration in milliseconds"
              title="Crossfade between slides. Slide it to zero for a hard cut."
              onChange={event => update({ transitionMs: Number(event.target.value) })}
              style={
                {
                  '--range-fill': `${((settings.transitionMs - MIN_TRANSITION_MS) / (MAX_TRANSITION_MS - MIN_TRANSITION_MS)) * 100}%`,
                } as CSSProperties
              }
              className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full
                bg-studio-border"
            />

            <span className="w-11 shrink-0 text-right text-[11px] text-studio-muted tabular-nums">
              {settings.transitionMs === 0 ? 'Cut' : `${settings.transitionMs}ms`}
            </span>
          </label>
        )}

        {mini ? (
          <>
            <MiniIcon
              icon={<MonitorPlay className="size-4" />}
              label="Projector look"
              value={`${theme?.label ?? 'Custom image'} · ${fontLabelOf(settings.font, settings.customFonts)}`}
              thumb={theme?.src}
              onClick={() => onSettings('projector')}
            />

            <MiniIcon
              icon={<Video className="size-4" />}
              label="Stream"
              value={settings.obsHidden ? 'Blanked' : `${labelOf(streamLangOf(settings))} · ${settings.lowerThirdPosition}`}
              onClick={() => onSettings('stream')}
            />

            <MiniIcon
              icon={<User className="size-4" />}
              label={isGuest ? 'Guest' : 'Account'}
              value={isGuest ? 'Trying it out — sign in to keep it' : email || 'Unknown'}
              thumb={isGuest ? undefined : (avatarUrl ?? undefined)}
              onClick={() => onSettings('account')}
            />
          </>
        ) : (
          <>
            <SummaryRow
              icon={<MonitorPlay className="size-4" />}
              label="Projector look"
              value={`${theme?.label ?? 'Custom image'} · ${fontLabelOf(settings.font, settings.customFonts)}`}
              thumb={theme?.src}
              onClick={() => onSettings('projector')}
            />

            <SummaryRow
              icon={<Video className="size-4" />}
              label="Stream"
              value={settings.obsHidden ? 'Blanked' : `${labelOf(streamLangOf(settings))} · ${settings.lowerThirdPosition}`}
              onClick={() => onSettings('stream')}
            />

            <SummaryRow
              icon={<User className="size-4" />}
              label={isGuest ? 'Guest' : 'Account'}
              value={isGuest ? 'Trying it out — sign in to keep it' : email || 'Unknown'}
              thumb={isGuest ? undefined : (avatarUrl ?? undefined)}
              onClick={() => onSettings('account')}
            />
          </>
        )}
      </div>
    </div>
  );
};
