'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { newPeerId, openLiveChannel, type LiveChannel } from '@/lib/live/channel';
import type { SignalTransport } from '@/lib/live/protocol';
import { asCardRun, isShowing, remainingOf, withSkew, type CardRun } from '@/lib/lower3rd/card';
import { varsFor } from '@/lib/lower3rd/colors';
import { lyricFor } from '@/lib/lyrics/langs';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { DEFAULT_FONT, fontStyleOf } from '@/lib/projector/fonts';
import { keepSame, sameVerse } from '@/lib/projector/keepSame';
import { isCustomLook } from '@/lib/projector/looks';
import { filesUsedBy } from '@/lib/projector/template';
import { apiBookName } from '@/lib/bible/passage';
import { asTimerState, withSkew as withTimerSkew, type TimerState } from '@/lib/timer/model';
import { emptyShowData, LANGS, REQUIRED_LANG, type Align, type Lang, type ShowData, type StreamStyle } from '@/lib/types';

import { CustomSlide } from './CustomSlide';
import { OutputChrome } from './OutputChrome';
import { TimerScreen } from './TimerScreen';
import { useCustomFonts } from './useCustomFonts';
import { useCustomLangs } from './useCustomLangs';
import { useLocalFiles } from './useLocalBackground';

const ALIGN_CLASS: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

const MIN_FONT_SIZE = 10;

const MAX_LINES = { verse: 4, lyrics: 2 };

const FONT_DIVISOR = { verse: 26, lyrics: 28 };

const MAX_HEIGHT_RATIO = 0.34;

const defaultStyle: StreamStyle = {
  font: DEFAULT_FONT,
  align: 'left',
  lyricsFont: DEFAULT_FONT,
  lyricsAlign: 'left',
  order: [REQUIRED_LANG],
  enabled: { [REQUIRED_LANG]: true },
  transitionMs: 320,
  position: 'bottom',
  variant: 'scrim',
  lyricsVariant: 'scrim',
  colors: {},
  lyricsColors: {},
  hidden: false,
  template: null,
  lyricsTemplate: null,
  versions: {},
  fonts: [],
  langs: [],
};

const hasContent = (showData: ShowData, enabled: Partial<Record<Lang, boolean>>) => {
  if (showData?.lyrics) return Boolean(lyricFor(showData.lyrics, showData.lyrics.lower3rd));

  return LANGS.some(lang => enabled?.[lang] && (showData?.[lang]?.length ?? 0) > 0);
};

const Block = ({ showData, lang }: { showData: ShowData; lang: Lang }) => {
  const verses = showData?.[lang] ?? [];

  if (verses.length === 0) return null;

  const first = verses[0];
  const last = verses[verses.length - 1];
  const name = apiBookName(first.wigni, lang);
  const muxli = verses.length > 1 ? `${first.muxli}-${last.muxli}` : first.muxli;

  return (
    <div className="lower3rd-block">
      <p className="lower3rd-text" dangerouslySetInnerHTML={{ __html: verses.map(verse => verse.bv).join(' ') }} />

      <div className="lower3rd-refline">
        <span className="lower3rd-ref">
          <span className="lower3rd-ref-book">{name}</span>{' '}
          <span className="lower3rd-ref-num">{`${first.tavi}:${muxli}`}</span>
        </span>
      </div>
    </div>
  );
};

export interface LowerThirdInitial {
  showData: ShowData;
  style: Partial<StreamStyle>;
  card: unknown;
  timer: TimerState;
}

const NameCard = ({ run, visible }: { run: CardRun; visible: boolean }) => (
  <div
    key={run.firedAt}
    className={`namecard namecard--${run.card.template}${visible ? ' namecard--in' : ' namecard--out'}`}
  >
    <div className="namecard-inner">
      <p className="namecard-title">{run.card.title}</p>
      {run.card.subtitle ? <p className="namecard-subtitle">{run.card.subtitle}</p> : null}
    </div>
  </div>
);

export const LowerThird = ({ outputKey, initial }: { outputKey: string; initial: LowerThirdInitial }) => {
  const [slide, setSlide] = useState({
    showData: initial.showData ?? emptyShowData(),
    style: { ...defaultStyle, ...initial.style },
  });

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

  const [displayed, setDisplayed] = useState(slide);

  const [card, setCard] = useState<CardRun | null>(() => withSkew(asCardRun(initial.card)));

  const [timer, setTimer] = useState<TimerState>(initial.timer);

  const [cleared, setCleared] = useState(false);

  const [, setNow] = useState(0);

  useEffect(() => {
    const left = remainingOf(card);

    if (!card || left === Infinity) return;

    const done = setTimeout(() => setNow(Date.now()), left);

    return () => clearTimeout(done);
  }, [card]);
  const [received, setReceived] = useState<{ count: number; at: string | null }>({ count: 0, at: null });

  const textRef = useRef<HTMLDivElement>(null);

  const debug = useSearchParams().has('debug');

  const transitionMs = displayed.style.transitionMs;
  const cut = transitionMs === 0;

  const restyled = slide !== displayed && sameVerse(displayed.showData, slide.showData);
  const onScreen = cut || restyled ? slide : displayed;

  const { showData, style } = onScreen;
  const lyrics = showData?.lyrics;
  const type = fontStyleOf(lyrics ? style.lyricsFont : style.font, style.fonts);
  const blanked = slide.style.hidden;

  useCustomFonts(slide.style.fonts ?? []);
  useCustomLangs(slide.style.langs);

  const shown = !blanked && hasContent(slide.showData, slide.style.enabled);

  const visible = shown && (cut || restyled || slide === displayed);

  useEffect(() => {
    const targets = [document.documentElement, document.body];
    const previous = targets.map(element => element.style.background);

    targets.forEach(element => {
      element.style.background = 'transparent';
    });

    return () =>
      targets.forEach((element, index) => {
        element.style.background = previous[index];
      });
  }, []);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has('preview');

    const channel = openLiveChannel(outputKey, 'lower3rd', peerId, !preview);
    channelRef.current = channel;

    const off = channel.onSlide(payload => {
      const next = { showData: payload.showData ?? emptyShowData(), style: { ...defaultStyle, ...payload.style } };

      setSlide(current => keepSame(current, next));

      setTimer(withTimerSkew(asTimerState(payload.timer)));

      const run = withSkew(asCardRun(payload.card));

      setCleared(!run);

      if (!run) return;

      setCard(current =>
        current && run.card.id === current.card.id && run.firedAt === current.firedAt ? current : run,
      );
      setReceived(current => ({ count: current.count + 1, at: new Date().toLocaleTimeString() }));
    });

    return () => {
      off();
      channel.close();
      channelRef.current = null;
    };
  }, [outputKey, peerId]);

  useEffect(() => {
    if (slide === displayed) return;

    const swap = setTimeout(() => setDisplayed(slide), cut || restyled ? 0 : transitionMs / 2);

    return () => clearTimeout(swap);
  }, [cut, displayed, restyled, slide, transitionMs]);

  const resize = useCallback(() => {
    const element = textRef.current;

    if (!element) return;

    const budget = lyrics ? MAX_LINES.lyrics : MAX_LINES.verse;
    const max = Math.round(window.innerHeight / (lyrics ? FONT_DIVISOR.lyrics : FONT_DIVISOR.verse));

    element.style.fontSize = `${max}px`;

    const texts = [...element.querySelectorAll<HTMLElement>('.lower3rd-text')];
    const lineHeight = parseFloat(getComputedStyle(texts[0] ?? element).lineHeight) || max * 1.28;

    const overhead = Math.max(0, element.offsetHeight - texts.reduce((total, text) => total + text.offsetHeight, 0));
    const blocks = Math.max(1, texts.length);
    const band = Math.min(window.innerHeight * MAX_HEIGHT_RATIO, blocks * budget * lineHeight + overhead);

    const share = band / blocks;

    fitText(element, band, {
      min: MIN_FONT_SIZE,
      max,
      constrain: el => [...el.querySelectorAll<HTMLElement>('.lower3rd-text')].every(line => line.offsetHeight <= share),
    });
  }, [lyrics]);

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
  }, [displayed, resize]);

  const top = style.position === 'top';
  const align = (lyrics ? style.lyricsAlign : style.align) ?? 'left';
  const look = (lyrics ? style.lyricsVariant : style.variant) || 'scrim';

  const template = lyrics ? style.lyricsTemplate : style.template;
  const custom = isCustomLook(look) && template ? template : null;

  const assets = useLocalFiles(useMemo(() => filesUsedBy(custom), [custom]), transport);

  const cardShowing = !blanked && !cleared && isShowing(card);

  const timerShowing = !blanked && !cardShowing && timer.onStream;

  return (
    <OutputChrome kind="lower3rd" hiddenAtRest>
      <div className={`lower3rd-stage ${type.className}`} style={type.style ? { fontFamily: type.style } : undefined}>
        {card ? <NameCard run={card} visible={cardShowing} /> : null}

        {timerShowing ? (
          <div className="lower3rd-timer">
            <TimerScreen state={timer} showClock={false} />
          </div>
        ) : null}

        {custom ? (
          <div
            className="lower3rd-custom"
            style={{
              opacity: visible && !cardShowing && !timerShowing ? 1 : 0,
              transition: transitionMs === 0 ? 'none' : `opacity ${transitionMs / 2}ms ease-in-out`,
            }}
          >
            <CustomSlide
              template={custom}
              showData={showData}
              style={{
                order: style.order,
                enabled: style.enabled ?? {},
                versions: style.versions,
                fonts: style.fonts,
                lyricsLang: lyrics?.lower3rd,
              }}
              assets={assets}
            />
          </div>
        ) : (
        <div
          className={`lower3rd-bar lower3rd-bar--${look} ${top ? 'lower3rd-bar--top' : ''} ${ALIGN_CLASS[align]}`}
          style={{
            ...varsFor(look, (lyrics ? style.lyricsColors : style.colors) ?? {}),
            opacity: visible && !cardShowing && !timerShowing ? 1 : 0,
            transition: transitionMs === 0 ? 'none' : `opacity ${transitionMs / 2}ms ease-in-out`,
          }}
        >
          <div ref={textRef} className="lower3rd-inner">
            {lyrics ? (
              <p className="lower3rd-text">{lyricFor(lyrics, lyrics.lower3rd).split('\n').join(' ')}</p>
            ) : (
              style.order.map(lang => (style.enabled?.[lang] ? <Block key={lang} lang={lang} showData={showData} /> : null))
            )}
          </div>
        </div>
        )}

        {debug ? (
          <div className="lower3rd-debug">
            <strong>lower3rd</strong> — page loaded, session {outputKey.slice(0, 6)}…
            <br />
            Slides received: {received.count}
            {received.at ? ` (last ${received.at})` : ''}
            <br />
            {received.count === 0
              ? 'Waiting for the console. Check a slide is live.'
              : `${visible ? 'visible' : blanked ? 'blanked (switched off in the console)' : 'hidden (nothing live)'}`}
          </div>
        ) : null}
      </div>
    </OutputChrome>
  );
};
