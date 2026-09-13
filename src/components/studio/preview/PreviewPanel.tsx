'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { HiOutlinePencil } from 'react-icons/hi';

import { cn } from '@/lib/cn';
import { SCREEN_LABELS } from '@/lib/live/blackout';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { sameVerse } from '@/lib/projector/keepSame';
import { fitTo, lookOf } from '@/lib/projector/looks';
import { filesUsedBy } from '@/lib/projector/template';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { loadLocalFile } from '@/lib/media/localMedia';
import { projectorStyle, stageLangOf } from '@/lib/studio/settings';
import {
  DEFAULT_PREVIEW_MODE,
  PREVIEW_MODES,
  readPreviewMode,
  writePreviewMode,
  type PreviewMode,
} from '@/lib/studio/previewMode';
import { timerIsLive } from '@/lib/timer/model';
import { Slide } from '@/components/projector/Slide';
import { useLocalFiles } from '@/components/projector/useLocalBackground';
import { StageScreen } from '@/components/projector/StageScreen';
import { TimerScreen } from '@/components/projector/TimerScreen';
import { useStudio } from '@/lib/studio/StudioProvider';

import { ClearBar } from '@/components/studio/chrome/ClearBar';
import { OutputBar } from '@/components/studio/chrome/OutputBar';
import type { ShowData } from '@/lib/types';

const STREAM_W = 1920;
const STREAM_H = 1080;

const Blanked = ({ label }: { label: string }) => (
  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90">
    <span className="rounded-[4px] bg-black/70 px-2 py-1 text-[10px] font-medium tracking-wide text-white/45 uppercase">
      {label} blanked
    </span>
  </div>
);

const LOOK_TABS = [
  { mode: 'projector', tab: 'projector', label: 'Edit the projector look' },
  { mode: 'stream', tab: 'stream', label: 'Edit the lower third look' },
] as const;

const MODE_LABELS: Record<PreviewMode, string> = {
  projector: 'Projector',
  stream: 'Stream',
  stage: 'Stage',
};

const modeListeners = new Set<() => void>();
let modeSnapshot: PreviewMode | null = null;

const modeStore = {
  subscribe: (listener: () => void) => {
    modeListeners.add(listener);
    return () => {
      modeListeners.delete(listener);
    };
  },
  get: () => (modeSnapshot ??= readPreviewMode()),
  getServer: () => DEFAULT_PREVIEW_MODE,
  set: (next: PreviewMode) => {
    modeSnapshot = next;
    writePreviewMode(next);
    modeListeners.forEach(listener => listener());
  },
};

export const PreviewPanel = ({ onSettings }: { onSettings: (tab: string) => void }) => {
  const { settings, showData, nextShowData, session, timer, blackout } = useStudio();

  const blanked: Record<PreviewMode, boolean> = {
    projector: blackout.audience,
    stream: settings.obsHidden,
    stage: blackout.stage,
  };

  const fadeMs = settings.transitionMs / 2;

  const screenRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.get, modeStore.getServer);

  const [localUrl, setLocalUrl] = useState('');
  const localImageId = settings.theme === LOCAL_THEME ? settings.localImage?.id : null;

  useEffect(() => {
    if (!localImageId) return;

    let cancelled = false;
    let url = '';

    loadLocalFile(localImageId)
      .then(record => {
        if (cancelled || !record?.file) return;

        url = URL.createObjectURL(record.file);
        setLocalUrl(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      setLocalUrl('');

      if (url) URL.revokeObjectURL(url);
    };
  }, [localImageId]);

  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const box = streamRef.current;

    if (!box) return;

    const observer = new ResizeObserver(() => setScale(box.clientWidth / STREAM_W));
    observer.observe(box);

    return () => observer.disconnect();
  }, []);

  const [displayed, setDisplayed] = useState<ShowData>(showData);

  const cut = fadeMs === 0;

  const restyled = showData !== displayed && sameVerse(displayed, showData);

  const onScreen = cut || restyled ? showData : displayed;
  const visible = cut || restyled || showData === displayed;

  useEffect(() => {
    if (visible) return;

    const swap = setTimeout(() => setDisplayed(showData), fadeMs);

    return () => clearTimeout(swap);
  }, [fadeMs, showData, visible]);

  const lyrics = onScreen.lyrics?.text ?? '';
  const armed = settings.langOrder.filter(lang => settings.enabled[lang]);
  const hasContent = Boolean(lyrics) || armed.some(lang => (onScreen[lang] ?? []).length > 0);

  const projector = projectorStyle(settings);
  const look = lookOf(lyrics ? projector.lyricsLook : projector.look, Boolean(lyrics));

  const assets = useLocalFiles(
    useMemo(
      () => [...filesUsedBy(projector.template), ...filesUsedBy(projector.lyricsTemplate)],
      [projector.lyricsTemplate, projector.template],
    ),
    null,
  );

  const isLive = Boolean(showData.lyrics?.text) || armed.some(lang => (showData[lang] ?? []).length > 0);

  useLayoutEffect(() => {
    if (look.selfFit) return;

    const refit = () => {
      const height = screenRef.current?.clientHeight ?? 0;
      const { available, min, max } = fitTo(look, height, {
        min: 5,
        scale: lyrics ? projector.lyricsScale : projector.verseScale,
        size: lyrics ? projector.lyricsSize : projector.verseSize,
      });

      fitText(textRef.current, available, { min, max });
    };

    refit();

    const cancelFontRefit = refitOnFontLoad(refit);
    const frame = requestAnimationFrame(refit);

    return () => {
      cancelFontRefit();
      cancelAnimationFrame(frame);
    };
  });

  const background =
    settings.theme === LOCAL_THEME
      ? localUrl
      : settings.theme === DYNAMIC_THEME
        ? settings.dynamicImage
        : themeSrc(settings.theme);

  return (
    <div className="group/preview shrink-0 border-b border-studio-border">
      <div className="@container flex h-9 items-center justify-between gap-2 bg-studio-bar px-2">
        <div className="flex shrink-0 items-center gap-0.5">
          {PREVIEW_MODES.map(value => (
            <button
              key={value}
              type="button"
              data-preview-tab={value}
              aria-pressed={mode === value}
              onClick={() => modeStore.set(value)}
              title={blanked[value] ? `${MODE_LABELS[value]} — blanked` : undefined}
              className={cn(
                'rounded-[4px] px-2 py-1 text-[11px] font-medium transition-colors duration-150',
                'hover:bg-white/10 hover:text-white',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                blanked[value] ? 'text-white/40' : 'text-white/75',
              )}
            >
              {MODE_LABELS[value]}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1">
          {LOOK_TABS.map(({ mode: only, tab, label }) => (
            <button
              key={only}
              type="button"
              data-preview-only={only}
              aria-label={label}
              title={label}
              onClick={() => onSettings(tab)}
              className="rounded-[4px] p-1 text-white/70 opacity-0 transition duration-150 group-hover/preview:opacity-100
                hover:bg-white/10 hover:text-white focus:opacity-100 focus:outline-none focus-visible:ring-2
                focus-visible:ring-studio-accent/40"
            >
              <HiOutlinePencil className="size-3.5" />
            </button>
          ))}

          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white/80">
            <span className={cn('size-1.5 rounded-full', isLive ? 'bg-studio-live' : 'bg-white/30')} />
            {isLive ? 'LIVE' : 'IDLE'}
          </span>

        </div>
      </div>

      <div className="relative isolate aspect-video w-full overflow-hidden">
        <div
          ref={streamRef}
          data-preview-pane="stream"
          aria-hidden={mode !== 'stream'}
          className="preview-alpha absolute inset-0 overflow-hidden"
        >
          {settings.obsHidden ? <Blanked label="Stream" /> : null}

          <iframe
            title="Lower third preview"
            src={`/lower3rd/${session.outputKey}?preview=1`}
            tabIndex={-1}
            scrolling="no"
            style={{
              width: STREAM_W,
              height: STREAM_H,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div
          data-preview-pane="stage"
          aria-hidden={mode !== 'stage'}
          className="absolute inset-0 overflow-hidden bg-black"
        >
          {blackout.stage ? <Blanked label={SCREEN_LABELS.stage} /> : null}

          {timerIsLive(timer) ? (
            <TimerScreen state={timer} />
          ) : (
            <StageScreen
              showData={showData}
              next={nextShowData}
              projector={projector}
              stageLang={stageLangOf(settings)}
              timer={timer}
            />
          )}
        </div>

        <div
          ref={screenRef}
          data-preview-pane="projector"
          aria-hidden={mode !== 'projector'}
          className="absolute inset-0 overflow-hidden bg-studio-slide bg-cover bg-center"
          style={background ? { backgroundImage: `url(${background})` } : undefined}
        >
          <div className="absolute inset-0 bg-black/55" />

          {blackout.audience ? <Blanked label={SCREEN_LABELS.audience} /> : null}

          {timer.onProjector ? (
            <div className="absolute inset-0">
              <TimerScreen state={timer} showClock={false} />
            </div>
          ) : null}

          <div
            className="relative flex h-full w-full items-center justify-center"
            style={{
              opacity: !timer.onProjector && visible ? 1 : 0,
              transition: cut ? 'none' : `opacity ${fadeMs}ms ease-in-out`,
            }}
          >
            {!hasContent ? (
              <p className="text-xs text-white/40">Nothing is live</p>
            ) : (
              <Slide ref={textRef} showData={onScreen} style={projector} assets={assets} />
            )}
          </div>
        </div>
      </div>

      <OutputBar />

      <ClearBar slideLive={isLive} />
    </div>
  );
};
