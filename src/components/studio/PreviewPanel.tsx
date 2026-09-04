'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HiOutlinePencil } from 'react-icons/hi';

import { cn } from '@/lib/cn';
import { SCREEN_LABELS } from '@/lib/live/blackout';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { fitTo, lookOf } from '@/lib/projector/looks';
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
import { StageScreen } from '@/components/projector/StageScreen';
import { TimerScreen } from '@/components/projector/TimerScreen';
import { useStudio } from '@/lib/studio/StudioProvider';

import { ClearBar } from './ClearBar';
import { OutputBar } from './OutputBar';
import type { ShowData } from '@/lib/types';

/** The frame the lower third is authored against; the iframe is scaled from it. */
const STREAM_W = 1920;
const STREAM_H = 1080;

/**
 * What the panel shows for an output that has been blanked.
 *
 * The output itself is nothing at all, and so is this — but the panel is the
 * one place an operator finds out *why* a screen has gone dark, so it says so
 * quietly rather than looking like a preview that has stopped working.
 */
const Blanked = ({ label }: { label: string }) => (
  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90">
    <span className="rounded-[4px] bg-black/70 px-2 py-1 text-[10px] font-medium tracking-wide text-white/45 uppercase">
      {label} blanked
    </span>
  </div>
);

/**
 * Which previews have a look to edit, and where that look is set.
 *
 * The stage has none of its own — it is drawn from the projector's type and
 * the language chosen for it — so it gets no pencil rather than one that opens
 * somebody else's settings.
 */
const LOOK_TABS = [
  { mode: 'projector', tab: 'projector', label: 'Edit the projector look' },
  { mode: 'stream', tab: 'stream', label: 'Edit the lower third look' },
] as const;

const MODE_LABELS: Record<PreviewMode, string> = {
  projector: 'Projector',
  stream: 'Stream',
  stage: 'Stage',
};

/**
 * Which output the panel is mirroring. The saved tab is already on `<html>`
 * before this file runs — the blocking script in the root layout puts it there
 * — and the CSS in `globals.css` dresses the panel from it, so what paints
 * first is right. This store is the same value for React: it decides what the
 * panes are handed and what a screen reader is told, and writing to it moves
 * the attribute the CSS reads.
 */
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

/**
 * Mirror of what the projector is showing, docked at the top of the right rail
 * the way a presentation app puts its output preview: always in the same place,
 * never in front of the verse it is previewing.
 *
 * The projector pane renders the projector's own `<Slide>`, at the operator's
 * own look: the markup is sized in `em`, so one fit pass against the panel's
 * height scales the whole thing — text, gaps and reference together — and what
 * the operator judges here cannot disagree with what the room sees.
 */
export const PreviewPanel = ({ onSettings }: { onSettings: (tab: string) => void }) => {
  const { settings, showData, nextShowData, session, timer, blackout } = useStudio();

  // Which outputs are blanked, so the tabs can mark the ones the operator is
  // not looking at. The switches themselves are in the strip below.
  const blanked: Record<PreviewMode, boolean> = {
    projector: blackout.audience,
    stream: settings.obsHidden,
    stage: blackout.stage,
  };

  // The panel runs the projector's own crossfade, at the operator's setting, so
  // the preview lies about nothing — timing included.
  const fadeMs = settings.transitionMs / 2;

  const screenRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const mode = useSyncExternalStore(modeStore.subscribe, modeStore.get, modeStore.getServer);

  /**
   * A background from this machine has no URL to put in a style, so the preview
   * mints its own from the stored file — the same picture the projector is
   * being sent, read straight out of IndexedDB here.
   */
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

  // The lower third is authored at 1920x1080 and scaled down to whatever width
  // the rail happens to be, so the preview has to know its own size.
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const box = streamRef.current;

    if (!box) return;

    const observer = new ResizeObserver(() => setScale(box.clientWidth / STREAM_W));
    observer.observe(box);

    return () => observer.disconnect();
  }, []);

  // What the panel is showing, which lags the live slide by one fade. Swapping
  // only while the text is invisible means the refit measures the incoming
  // verse and the operator never sees a hard cut.
  const [displayed, setDisplayed] = useState<ShowData>(showData);

  const cut = fadeMs === 0;
  const onScreen = cut ? showData : displayed;
  const visible = cut || showData === displayed;

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

  // The badge and the clear strip answer for the outputs, not for the panel,
  // so they read the live slide rather than the one the fade is still showing.
  const isLive = Boolean(showData.lyrics?.text) || armed.some(lang => (showData[lang] ?? []).length > 0);

  // Same fit as the projector, in proportion to the panel: the look supplies
  // the bounds as fractions of the screen height, so a slide that fills the
  // projector fills the preview too.
  useEffect(() => {
    const refit = () => {
      const height = screenRef.current?.clientHeight ?? 0;
      const { available, min, max } = fitTo(look, height, {
        min: 5,
        scale: lyrics ? projector.lyricsScale : 'both',
        size: projector.lyricsSize,
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

  // A pasted URL and one of the operator's own pictures are both drawn as an
  // inline background; so is a stock theme, which is just a file on disk.
  const background =
    settings.theme === LOCAL_THEME
      ? localUrl
      : settings.theme === DYNAMIC_THEME
        ? settings.dynamicImage
        : themeSrc(settings.theme);

  return (
    <div className="group/preview shrink-0 border-b border-studio-border">
      {/* Dark, so the bar reads as the edge of the output rather than as more
          console furniture, and the screen under it is not fighting a white
          strip. */}
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
                // Dimmed rather than marked: the outputs strip below names
                // every blanked output already, and a second indicator on the
                // tabs only made the bar noisy.
                blanked[value] ? 'text-white/40' : 'text-white/75',
              )}
            >
              {MODE_LABELS[value]}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-1">
          {/* A look is set in Settings and judged here, so the way back to it
              sits on the preview it changes — one per output, each hidden
              until its own tab is up. */}
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

      {/* Both outputs stay mounted and the tabs only swap which is visible.
          Remounting the iframe on every switch meant reloading the whole
          overlay app and waiting for it to rejoin the channel — a preview that
          was blank for a moment each time. Hidden with `visibility`, not
          `display`, so the box keeps its size and the scale below stays right
          for the frame it comes back on. */}
      {/* `isolate`: the panes stack against each other — the blanked cover
          over the timer over the slide — and without a stacking context of
          their own those z-indexes compete with the whole console. A blanked
          projector was painting its cover over the Present menu. */}
      <div className="relative isolate aspect-video w-full overflow-hidden">
        <div
          ref={streamRef}
          data-preview-pane="stream"
          aria-hidden={mode !== 'stream'}
          className="preview-alpha absolute inset-0 overflow-hidden"
        >
          {settings.obsHidden ? <Blanked label="Stream" /> : null}

          {/* The real /lower3rd page, scaled down, rather than a second
              rendering of the same design: it joins the session's channel like
              any other output, and its vh/vw padding resolves against its own
              1920x1080 viewport, so what shows here is what OBS draws. The
              chequerboard stands in for the camera and reads as transparency. */}
          <iframe
            title="Lower third preview"
            src={`/lower3rd/${session.outputKey}`}
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

        {/* The stage display, drawn from the console's own state rather than
            through an iframe: it is a plain function of the live slide, the one
            after it and the run, and a second /stage in a frame would join the
            channel and count itself as a monitor that is standing in the room.
            Its layout is a fraction of its own frame, so at rail width it is the
            same screen, smaller. */}
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

          {/* The timer takes the projector when it is armed, so the panel has
              to show that: an operator who arms it and sees the verse still
              sitting here has no way to tell it worked. */}
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
              <Slide ref={textRef} showData={onScreen} style={projector} />
            )}
          </div>
        </div>
      </div>

      <OutputBar />

      <ClearBar slideLive={isLive} />
    </div>
  );
};
