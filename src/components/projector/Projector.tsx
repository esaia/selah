'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { newPeerId, openLiveChannel, type LiveChannel } from '@/lib/live/channel';
import type { SignalTransport, SlidePayload } from '@/lib/live/protocol';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { emptyShowData, type Align, type ProjectorStyle, type ShowData } from '@/lib/types';

import { VerseBlock } from './VerseBlock';
import { useLocalBackground } from './useLocalBackground';

/** Room for the reference line and a margin the text must not crowd. */
const VERTICAL_MARGIN = 160;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 64;
const LYRICS_MAX_FONT_SIZE = 200;

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const defaultStyle: ProjectorStyle = {
  theme: '1',
  dynamicImage: '',
  localImage: null,
  font: 'font-banner',
  align: 'left',
  lyricsFont: 'font-banner',
  lyricsAlign: 'left',
  order: ['eng', 'geo', 'rus'],
  enabled: { geo: true, eng: false, rus: false },
  transitionMs: 320,
};

export interface ProjectorInitial {
  showData: ShowData;
  projector: Partial<ProjectorStyle>;
}

/**
 * The projector output.
 *
 * It renders whatever the console last pushed, and nothing else: no controls,
 * no account, no settings of its own. The look arrives with the slide because
 * this page cannot read the operator's settings row.
 */
export const Projector = ({ outputKey, initial }: { outputKey: string; initial: ProjectorInitial }) => {
  const [showData, setShowData] = useState<ShowData>(initial.showData ?? emptyShowData());
  const [style, setStyle] = useState<ProjectorStyle>({ ...defaultStyle, ...initial.projector });
  const channelRef = useRef<LiveChannel | null>(null);
  const [peerId] = useState(newPeerId);

  // Stable, and delegating to whatever channel is open. Built here rather than
  // stored once the channel exists so opening one costs no extra render.
  const transport = useMemo<SignalTransport>(
    () => ({
      peerId,
      send: payload => channelRef.current?.sendSignal(payload),
      subscribe: handler => channelRef.current?.onSignal(handler) ?? (() => {}),
    }),
    [peerId],
  );

  // What is actually on screen, which lags `showData` by half a crossfade.
  const [displayed, setDisplayed] = useState<ShowData>(showData);

  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = openLiveChannel(outputKey, 'show', peerId);
    channelRef.current = channel;

    const off = channel.onSlide((payload: SlidePayload) => {
      setShowData(payload.showData ?? emptyShowData());
      setStyle({ ...defaultStyle, ...payload.projector });
    });

    return () => {
      off();
      channel.close();
      channelRef.current = null;
    };
  }, [outputKey, peerId]);

  const localUrl = useLocalBackground(style.theme === LOCAL_THEME ? style.localImage : null, transport);

  const background = useMemo(() => {
    if (style.theme === LOCAL_THEME) return localUrl;
    if (style.theme === DYNAMIC_THEME) return style.dynamicImage;

    return themeSrc(style.theme);
  }, [localUrl, style.dynamicImage, style.theme]);

  // Crossfade: the outgoing slide fades out over half the transition, the
  // incoming one fades in over the other half. Zero is a hard cut, swapped in
  // the same tick so the screen never blanks, however briefly.
  const cut = style.transitionMs === 0;
  // A hard cut has nothing to fade, so it draws the incoming slide directly and
  // the screen never blanks, however briefly.
  const onScreen = cut ? showData : displayed;

  // Mid-crossfade is exactly "a new slide has arrived and is not on screen
  // yet", so visibility is read off that rather than tracked separately.
  const visible = cut || showData === displayed;

  useEffect(() => {
    if (visible) return;

    const swap = setTimeout(() => setDisplayed(showData), style.transitionMs / 2);

    return () => clearTimeout(swap);
  }, [showData, style.transitionMs, visible]);

  const lyrics = Boolean(onScreen?.lyrics);

  /**
   * Fit what is on screen. The upper bound stops a two-word verse from filling
   * the whole projector; the lower bound keeps a long passage legible.
   */
  const resize = useCallback(() => {
    fitText(textRef.current, window.innerHeight - VERTICAL_MARGIN, {
      min: MIN_FONT_SIZE,
      max: lyrics
        ? Math.min(LYRICS_MAX_FONT_SIZE, Math.round(window.innerHeight / 4))
        : Math.min(MAX_FONT_SIZE, Math.round(window.innerHeight / 13)),
    });
  }, [lyrics]);

  useEffect(() => {
    resize();

    // The projector font arrives asynchronously; the first measurement uses
    // fallback metrics, so refit once it has actually swapped in.
    const cancelFontRefit = refitOnFontLoad(resize);
    const frame = requestAnimationFrame(resize);

    window.addEventListener('resize', resize);

    return () => {
      cancelFontRefit();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [onScreen, resize, style.align, style.font, style.lyricsAlign, style.lyricsFont, style.order]);

  return (
    <div className={`h-dvh w-full bg-black ${lyrics ? style.lyricsFont : style.font}`}>
      <div
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-10"
        style={background ? { backgroundImage: `url(${background})` } : undefined}
      >
        {/* Scrim: projector bulbs wash out white text on a bright photograph. */}
        <div className="absolute inset-0 bg-black/55" />

        <div
          ref={textRef}
          className={`relative w-full max-w-[2000px] px-[4%] py-2.5 ${ALIGN_CLASS[lyrics ? style.lyricsAlign : style.align]}`}
          style={{
            opacity: visible ? 1 : 0,
            transition: cut ? 'none' : `opacity ${style.transitionMs / 2}ms ease-in-out`,
          }}
        >
          {onScreen?.lyrics ? (
            // A song slide is one block of text: no reference, no language
            // stack, and the armed languages do not apply to it. The line
            // breaks the song was written with are ignored — at projector size
            // they wrap anyway, and honouring both gives a ragged block.
            <div className="w-full">
              <p className="show-text">{onScreen.lyrics.text.split('\n').join(' ')}</p>
            </div>
          ) : (
            style.order.map(lang =>
              style.enabled?.[lang] ? <VerseBlock key={lang} lang={lang} showData={onScreen} /> : null,
            )
          )}
        </div>
      </div>
    </div>
  );
};
