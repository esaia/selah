'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { newPeerId, openLiveChannel, type LiveChannel } from '@/lib/live/channel';
import type { SignalTransport, SlidePayload } from '@/lib/live/protocol';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { keepSame } from '@/lib/projector/keepSame';
import { DEFAULT_LYRIC_LOOK, DEFAULT_TEXT_SIZE, DEFAULT_VERSE_LOOK, fitTo, lookOf } from '@/lib/projector/looks';
import { DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { asTimerState, withSkew, type TimerState } from '@/lib/timer/model';
import { emptyShowData, REQUIRED_LANG, type ProjectorStyle, type ShowData } from '@/lib/types';

import { Slide } from './Slide';
import { TimerScreen } from './TimerScreen';
import { useLocalBackground } from './useLocalBackground';

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 64;
const LYRICS_MAX_FONT_SIZE = 200;

const defaultStyle: ProjectorStyle = {
  theme: '1',
  dynamicImage: '',
  localImage: null,
  font: 'font-banner',
  align: 'left',
  lyricsFont: 'font-banner',
  lyricsAlign: 'left',
  look: DEFAULT_VERSE_LOOK,
  lyricsLook: DEFAULT_LYRIC_LOOK,
  lyricsScale: 'both',
  lyricsSize: DEFAULT_TEXT_SIZE,
  order: [REQUIRED_LANG],
  enabled: { [REQUIRED_LANG]: true },
  transitionMs: 320,
};

export interface ProjectorInitial {
  showData: ShowData;
  projector: Partial<ProjectorStyle>;
  timer: TimerState;
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

  // The stage timer, which takes the screen when the console arms it onto the
  // projector. Carried by the same payload as the slide, so arming it is one
  // message and not a second channel to keep in step.
  const [timer, setTimer] = useState<TimerState>(initial.timer);
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
      // Same slide, new timer — hold the object so the crossfade below does
      // not run for a change the screen does not draw.
      setShowData(current => keepSame(current, payload.showData ?? emptyShowData()));
      setStyle(current => keepSame(current, { ...defaultStyle, ...payload.projector }));
      setTimer(withSkew(asTimerState(payload.timer)));
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

  const look = lookOf(lyrics ? style.lyricsLook : style.look, lyrics);

  /**
   * Fit what is on screen, within the bounds the chosen look asks for. The
   * ceiling stops a two-word verse from filling the whole projector; the floor
   * keeps a long passage legible.
   */
  const resize = useCallback(() => {
    const { available, min, max } = fitTo(look, window.innerHeight, {
      cap: lyrics ? LYRICS_MAX_FONT_SIZE : MAX_FONT_SIZE,
      min: MIN_FONT_SIZE,
      // Only song text is sized by hand; a verse is always fitted, because a
      // passage the operator did not choose the length of has to fit.
      scale: lyrics ? style.lyricsScale : 'both',
      size: style.lyricsSize,
    });

    fitText(textRef.current, available, { min, max });
  }, [look, lyrics, style.lyricsScale, style.lyricsSize]);

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
    <div className="h-dvh w-full bg-black">
      <div
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
        style={background ? { backgroundImage: `url(${background})` } : undefined}
      >
        {/* Scrim: projector bulbs wash out white text on a bright photograph. */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Armed from the timer tab, and then it *is* the slide: a countdown
            before a service, or a clock between sessions, wants the screen
            rather than a corner of it. */}
        {timer.onProjector ? (
          <div className="absolute inset-0 z-20">
            <TimerScreen state={timer} showClock={false} />
          </div>
        ) : null}

        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{
            // The timer takes the screen rather than sharing it, but the verse
            // stays mounted underneath so disarming brings it back already
            // fitted, with no reflow the room can see.
            opacity: !timer.onProjector && visible ? 1 : 0,
            transition: cut ? 'none' : `opacity ${style.transitionMs / 2}ms ease-in-out`,
          }}
        >
          <Slide ref={textRef} showData={onScreen} style={style} className="max-w-[2000px]" />
        </div>
      </div>
    </div>
  );
};
