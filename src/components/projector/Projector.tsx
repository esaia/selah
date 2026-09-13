'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { asBlackout } from '@/lib/live/blackout';
import { newPeerId, openLiveChannel, type LiveChannel } from '@/lib/live/channel';
import type { SignalTransport, SlidePayload } from '@/lib/live/protocol';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { DEFAULT_FONT } from '@/lib/projector/fonts';
import { keepSame, sameVerse } from '@/lib/projector/keepSame';
import {
  DEFAULT_LYRIC_LOOK,
  DEFAULT_TEXT_SIZE,
  DEFAULT_VERSE_LOOK,
  DEFAULT_VERSE_TEXT_SIZE,
  fitTo,
  lookOf,
} from '@/lib/projector/looks';
import { filesUsedBy } from '@/lib/projector/template';
import { DEFAULT_THEME, DYNAMIC_THEME, LOCAL_THEME, themeSrc } from '@/lib/projector/themes';
import { asTimerState, withSkew, type TimerState } from '@/lib/timer/model';
import { emptyShowData, REQUIRED_LANG, type ProjectorStyle, type ShowData } from '@/lib/types';

import { OutputChrome } from './OutputChrome';
import { Slide } from './Slide';
import { TimerScreen } from './TimerScreen';
import { useCustomFonts } from './useCustomFonts';
import { useCustomLangs } from './useCustomLangs';
import { useLocalBackground, useLocalFiles } from './useLocalBackground';

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 64;
const LYRICS_MAX_FONT_SIZE = 200;

const defaultStyle: ProjectorStyle = {
  theme: DEFAULT_THEME,
  dynamicImage: '',
  localImage: null,
  font: DEFAULT_FONT,
  align: 'left',
  lyricsFont: DEFAULT_FONT,
  lyricsAlign: 'left',
  look: DEFAULT_VERSE_LOOK,
  lyricsLook: DEFAULT_LYRIC_LOOK,
  template: null,
  lyricsTemplate: null,
  versions: {},
  verseScale: 'both',
  verseSize: DEFAULT_VERSE_TEXT_SIZE,
  lyricsScale: 'both',
  lyricsSize: DEFAULT_TEXT_SIZE,
  order: [REQUIRED_LANG],
  enabled: { [REQUIRED_LANG]: true },
  transitionMs: 320,
  fonts: [],
  langs: [],
};

export interface ProjectorInitial {
  showData: ShowData;
  projector: Partial<ProjectorStyle>;
  timer: TimerState;
  black: boolean;
}

export const Projector = ({ outputKey, initial }: { outputKey: string; initial: ProjectorInitial }) => {
  const [showData, setShowData] = useState<ShowData>(initial.showData ?? emptyShowData());
  const [style, setStyle] = useState<ProjectorStyle>({ ...defaultStyle, ...initial.projector });

  const [timer, setTimer] = useState<TimerState>(initial.timer);

  const [black, setBlack] = useState(initial.black);
  const channelRef = useRef<LiveChannel | null>(null);
  const [peerId] = useState(newPeerId);

  const transport = useMemo<SignalTransport>(
    () => ({
      peerId,
      send: payload => channelRef.current?.sendSignal(payload),
      subscribe: handler => channelRef.current?.onSignal(handler) ?? (() => {}),
    }),
    [peerId],
  );

  const [displayed, setDisplayed] = useState<ShowData>(showData);

  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = openLiveChannel(outputKey, 'show', peerId);
    channelRef.current = channel;

    const off = channel.onSlide((payload: SlidePayload) => {
      setShowData(current => keepSame(current, payload.showData ?? emptyShowData()));
      setStyle(current => keepSame(current, { ...defaultStyle, ...payload.projector }));
      setTimer(withSkew(asTimerState(payload.timer)));
      setBlack(asBlackout(payload.blackout).audience);
    });

    return () => {
      off();
      channel.close();
      channelRef.current = null;
    };
  }, [outputKey, peerId]);

  const localUrl = useLocalBackground(style.theme === LOCAL_THEME ? style.localImage : null, transport);

  const assets = useLocalFiles(useMemo(() => [...filesUsedBy(style.template), ...filesUsedBy(style.lyricsTemplate)], [style.lyricsTemplate, style.template]), transport);

  useCustomFonts(style.fonts ?? []);
  useCustomLangs(style.langs);

  const background = useMemo(() => {
    if (style.theme === LOCAL_THEME) return localUrl;
    if (style.theme === DYNAMIC_THEME) return style.dynamicImage;

    return themeSrc(style.theme);
  }, [localUrl, style.dynamicImage, style.theme]);

  const cut = style.transitionMs === 0;
  const restyled = showData !== displayed && sameVerse(displayed, showData);

  const onScreen = cut || restyled ? showData : displayed;

  const visible = cut || restyled || showData === displayed;

  useEffect(() => {
    if (visible) return;

    const swap = setTimeout(() => setDisplayed(showData), style.transitionMs / 2);

    return () => clearTimeout(swap);
  }, [showData, style.transitionMs, visible]);

  const lyrics = Boolean(onScreen?.lyrics);

  const look = lookOf(lyrics ? style.lyricsLook : style.look, lyrics);

  const resize = useCallback(() => {
    if (look.selfFit) return;

    const { available, min, max } = fitTo(look, window.innerHeight, {
      cap: lyrics ? LYRICS_MAX_FONT_SIZE : MAX_FONT_SIZE,
      min: MIN_FONT_SIZE,
      scale: lyrics ? style.lyricsScale : style.verseScale,
      size: lyrics ? style.lyricsSize : style.verseSize,
    });

    fitText(textRef.current, available, { min, max });
  }, [look, lyrics, style.lyricsScale, style.lyricsSize, style.verseScale, style.verseSize]);

  useEffect(() => {
    resize();

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
    <OutputChrome kind="show">
      <div className="h-dvh w-full bg-black">
        <div
          className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
          style={background ? { backgroundImage: `url(${background})` } : undefined}
        >
          <div className="absolute inset-0 bg-black/55" />

          {timer.onProjector ? (
            <div className="absolute inset-0 z-20">
              <TimerScreen state={timer} showClock={false} />
            </div>
          ) : null}

          {black ? <div className="absolute inset-0 z-30 bg-black" /> : null}

          <div
            className="relative flex h-full w-full items-center justify-center"
            style={{
              opacity: !timer.onProjector && visible ? 1 : 0,
              transition: cut ? 'none' : `opacity ${style.transitionMs / 2}ms ease-in-out`,
            }}
          >
            <Slide ref={textRef} showData={onScreen} style={style} assets={assets} className="max-w-[2000px]" />
          </div>
        </div>
      </div>
    </OutputChrome>
  );
};
