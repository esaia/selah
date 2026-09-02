'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';

import { bibleNames } from '@/lib/bible/catalog';
import { cn } from '@/lib/cn';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { loadLocalFile } from '@/lib/media/localMedia';
import { plain } from '@/lib/studio/text';
import { TimerScreen } from '@/components/projector/TimerScreen';
import { useStudio } from '@/lib/studio/StudioProvider';
import type { Align, Lang, ShowData, Verse } from '@/lib/types';

const ALIGN_CLASS: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

/** The frame the lower third is authored against; the iframe is scaled from it. */
const STREAM_W = 1920;
const STREAM_H = 1080;

const MODES = [
  { value: 'projector', label: 'Projector' },
  { value: 'stream', label: 'Lower third' },
];

const MODE_KEY = 'studioPreviewMode';

/**
 * Which output the panel is mirroring. A per-machine preference, read through
 * an external store so the server can render the default without a second pass
 * to correct it on the client.
 */
const modeListeners = new Set<() => void>();
let modeSnapshot: string | null = null;

const modeStore = {
  subscribe: (listener: () => void) => {
    modeListeners.add(listener);
    return () => {
      modeListeners.delete(listener);
    };
  },
  get: () => (modeSnapshot ??= localStorage.getItem(MODE_KEY) ?? 'projector'),
  getServer: () => 'projector',
  set: (next: string) => {
    modeSnapshot = next;

    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Non-critical.
    }

    modeListeners.forEach(listener => listener());
  },
};

const reference = (items: Verse[], lang: Lang) => {
  const first = items[0];
  const last = items[items.length - 1];
  const name = bibleNames[lang]?.[+first.wigni + 2] ?? '';

  return items.length > 1
    ? `${name} ${first.tavi}:${first.muxli}-${last.muxli}`
    : `${name} ${first.tavi}:${first.muxli}`;
};

/**
 * Mirror of what the projector is showing, docked at the top of the right rail
 * the way a presentation app puts its output preview: always in the same place,
 * never in front of the verse it is previewing.
 *
 * It deliberately does *not* reuse the projector's own markup. That block is
 * sized in absolute pixels against a full screen, and at rail width its padding
 * alone would eat the slide. This renders the same design in `em`, so one fit
 * pass scales the whole thing — text, gaps and reference together.
 */
export const PreviewPanel = () => {
  const { settings, showData, session, clearProjector, timer } = useStudio();

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
  const rows = armed.map(lang => ({ lang, items: onScreen[lang] ?? [] }));
  const hasContent = Boolean(lyrics) || rows.some(row => row.items.length > 0);

  // The badge and the clear button answer for the outputs, not for the panel,
  // so they read the live slide rather than the one the fade is still showing.
  const isLive = Boolean(showData.lyrics?.text) || armed.some(lang => (showData[lang] ?? []).length > 0);

  // Same fit as the projector, in proportion to the panel — the bounds are the
  // projector's own, expressed as fractions of the screen height, so a slide
  // that fills the projector fills the preview too.
  useEffect(() => {
    const refit = () => {
      const height = screenRef.current?.clientHeight ?? 0;

      fitText(textRef.current, height * 0.89, {
        min: 5,
        max: Math.max(6, Math.round(height / (lyrics ? 4 : 13))),
      });
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
    <div className="shrink-0 border-b border-studio-border">
      {/* Dark, so the bar reads as the edge of the output rather than as more
          console furniture, and the screen under it is not fighting a white
          strip. */}
      <div className="flex h-9 items-center justify-between gap-2 bg-studio-bar px-2">
        <div className="flex items-center gap-0.5">
          {MODES.map(item => (
            <button
              key={item.value}
              type="button"
              aria-pressed={mode === item.value}
              onClick={() => modeStore.set(item.value)}
              className={cn(
                'rounded-[4px] px-2 py-1 text-[11px] font-medium transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                mode === item.value ? 'bg-white/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white/80">
            <span className={cn('size-1.5 rounded-full', isLive ? 'bg-studio-live' : 'bg-white/30')} />
            {isLive ? 'LIVE' : 'IDLE'}
          </span>

          {/* Clearing belongs against the thing being cleared, the way a
              presentation app hangs it off its output preview. It is dead when
              nothing is on screen, so a stab at it mid-service cannot be
              mistaken for one that did something. */}
          <button
            type="button"
            onClick={clearProjector}
            disabled={!isLive}
            title="Clear the screen"
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium transition-colors',
              'duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
              isLive ? 'bg-white/15 text-white hover:bg-studio-live' : 'cursor-not-allowed text-white/30',
            )}
          >
            <X className="size-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Both outputs stay mounted and the tabs only swap which is visible.
          Remounting the iframe on every switch meant reloading the whole
          overlay app and waiting for it to rejoin the channel — a preview that
          was blank for a moment each time. Hidden with `visibility`, not
          `display`, so the box keeps its size and the scale below stays right
          for the frame it comes back on. */}
      <div className="relative aspect-video w-full overflow-hidden">
        <div
          ref={streamRef}
          aria-hidden={mode !== 'stream'}
          className={cn('preview-alpha absolute inset-0 overflow-hidden', mode !== 'stream' && 'invisible')}
        >
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

        <div
          ref={screenRef}
          aria-hidden={mode === 'stream'}
          className={cn(
            'absolute inset-0 overflow-hidden bg-studio-slide bg-cover bg-center',
            mode === 'stream' && 'invisible',
          )}
          style={background ? { backgroundImage: `url(${background})` } : undefined}
        >
          <div className="absolute inset-0 bg-black/55" />

          {/* The timer takes the projector when it is armed, so the panel has
              to show that: an operator who arms it and sees the verse still
              sitting here has no way to tell it worked. */}
          {timer.onProjector ? (
            <div className="absolute inset-0 p-[6%]">
              <TimerScreen state={timer} showClock={false} />
            </div>
          ) : null}

          <div
            className="relative flex h-full w-full items-center justify-center px-[6%]"
            style={{
              opacity: !timer.onProjector && visible ? 1 : 0,
              transition: cut ? 'none' : `opacity ${fadeMs}ms ease-in-out`,
            }}
          >
            {!hasContent ? (
              <p className="text-xs text-white/40">Nothing is live</p>
            ) : lyrics ? (
              <div ref={textRef} className={cn('w-full', settings.lyricsFont)}>
                <p className={cn('leading-snug font-semibold text-white', ALIGN_CLASS[settings.lyricsAlign])}>
                  {lyrics.split('\n').join(' ')}
                </p>
              </div>
            ) : (
              <div ref={textRef} className={cn('w-full', settings.font)}>
                {rows.map(({ lang, items }) =>
                  items.length > 0 ? (
                    <div key={lang} className="py-[0.35em]">
                      <p className={cn('leading-snug font-semibold text-white', ALIGN_CLASS[settings.align])}>
                        {items.map(item => plain(item.bv)).join(' ')}
                      </p>
                      <p
                        className={cn('text-gray-300/90 italic', ALIGN_CLASS[settings.align])}
                        style={{ fontSize: '0.72em' }}
                      >
                        {reference(items, lang)}
                      </p>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
