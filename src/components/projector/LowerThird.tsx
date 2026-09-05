'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { openLiveChannel } from '@/lib/live/channel';
import { asCardRun, isShowing, remainingOf, withSkew, type CardRun } from '@/lib/lower3rd/card';
import { varsFor } from '@/lib/lower3rd/colors';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { DEFAULT_FONT, fontStyleOf } from '@/lib/projector/fonts';
import { keepSame } from '@/lib/projector/keepSame';
import { apiBookName } from '@/lib/bible/passage';
import { asTimerState, withSkew as withTimerSkew, type TimerState } from '@/lib/timer/model';
import { emptyShowData, LANGS, REQUIRED_LANG, type Align, type Lang, type ShowData, type StreamStyle } from '@/lib/types';

import { TimerScreen } from './TimerScreen';
import { useCustomFonts } from './useCustomFonts';

const ALIGN_CLASS: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' };

const MIN_FONT_SIZE = 10;

/**
 * A lower third is read at a glance while someone is speaking, so text is
 * scaled down to fit a line budget rather than being allowed to grow into a
 * paragraph that eats the frame. A verse gets more room than a song slide:
 * scripture is read, whereas lyrics are sung along to and only need prompting.
 */
const MAX_LINES = { verse: 4, lyrics: 2 };

/**
 * Largest text size, as a divisor of the frame height. Together with the line
 * budget above these set the band the bar always fills: a slide that needs
 * every line gets this size, and no slide is allowed to be taller.
 */
const FONT_DIVISOR = { verse: 26, lyrics: 28 };

/**
 * Share of the frame height the bar may grow into. A lower third that creeps
 * past roughly a third of the screen stops reading as an overlay and starts
 * covering the shot.
 */
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
  fonts: [],
};

/** Is there anything on this slide worth putting on screen? */
const hasContent = (showData: ShowData, enabled: Partial<Record<Lang, boolean>>) => {
  if (showData?.lyrics?.text) return true;

  return LANGS.some(lang => enabled?.[lang] && (showData?.[lang]?.length ?? 0) > 0);
};

/** One language: its verses, then the reference that produced them. */
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

      {/* The reference needs its own line even in the banded look, where the
          verse above it is an inline run so each wrapped line gets a plate.
          Split into parts so the column looks can set the book and the numbers
          differently; run together they still read "Mark 3:16". */}
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
  /** The name card that was up when this page opened, if any. */
  card: unknown;
  /** The run as it stood when this page opened, armed onto the stream or not. */
  timer: TimerState;
}

/**
 * The speaker's name, strapped over the shot.
 *
 * Its own element rather than another `.lower3rd-bar` variant, because it is
 * not a variant of anything: it carries two fixed lines with no reference and
 * no languages, and it is laid over whatever the bar is already showing rather
 * than replacing it.
 */
const NameCard = ({ run, visible }: { run: CardRun; visible: boolean }) => (
  <div
    // Keyed on the run so re-firing the same person replays the entrance
    // rather than leaving a card that was already on screen sitting there.
    key={run.firedAt}
    className={`namecard namecard--${run.card.template}${visible ? ' namecard--in' : ' namecard--out'}`}
  >
    <div className="namecard-inner">
      <p className="namecard-title">{run.card.title}</p>
      {run.card.subtitle ? <p className="namecard-subtitle">{run.card.subtitle}</p> : null}
    </div>
  </div>
);

/**
 * The OBS Browser Source output: the live slide as a broadcast lower third,
 * drawn on a transparent background so it composites over the camera.
 *
 * In the old app this could not use the projector's transport at all — an OBS
 * Browser Source is a separate process with its own storage — so the slide had
 * to be pushed through obs-websocket's vendor event, JSON-stringified to
 * survive OBS's own marshalling. Here it joins the same realtime channel as
 * every other output, which is why none of that machinery survives.
 *
 * The style still travels with the content: this page has no account and
 * cannot read the operator's settings.
 */
export const LowerThird = ({ outputKey, initial }: { outputKey: string; initial: LowerThirdInitial }) => {
  const [slide, setSlide] = useState({
    showData: initial.showData ?? emptyShowData(),
    style: { ...defaultStyle, ...initial.style },
  });

  // What is drawn right now, which lags `slide` by half a transition. Swapping
  // only while the bar is hidden means the refit measures the incoming text
  // and the stream never sees a half-sized frame.
  const [displayed, setDisplayed] = useState(slide);

  /**
   * The name card, held apart from the slide on purpose.
   *
   * It is laid over whatever the bar is showing rather than replacing it, so
   * it must not take part in the slide's crossfade — a card firing should not
   * make the verse underneath blink.
   */
  const [card, setCard] = useState<CardRun | null>(() => withSkew(asCardRun(initial.card)));

  // The run, which takes the band when the console arms it onto the stream.
  // Held apart from the slide for the same reason the card is: arming the
  // timer must not make the verse underneath crossfade.
  const [timer, setTimer] = useState<TimerState>(initial.timer);

  // Whether the console has taken the card down. Held apart from the card
  // itself so the element stays mounted while it leaves: an exit animation
  // cannot play on something already removed from the page, and a strap that
  // vanishes between two frames reads as a dropped connection rather than as
  // someone clearing it.
  const [cleared, setCleared] = useState(false);

  // A card that has run out of hold, without waiting for a message saying so.
  // The console publishes `firedAt` and a duration rather than a countdown, so
  // taking the card away is this page's own arithmetic on its own clock — the
  // same rule the stage timer follows. It means an overlay that joins halfway
  // through a card shows the rest of it and then clears itself, even if the
  // console has since closed.
  const [, setNow] = useState(0);

  useEffect(() => {
    const left = remainingOf(card);

    if (!card || left === Infinity) return;

    const done = setTimeout(() => setNow(Date.now()), left);

    return () => clearTimeout(done);
  }, [card]);
  const [received, setReceived] = useState<{ count: number; at: string | null }>({ count: 0, at: null });

  const textRef = useRef<HTMLDivElement>(null);

  // `?debug=1` draws an always-visible panel over the transparent stage.
  // Without it a black canvas is ambiguous inside OBS: a page that never
  // loaded, a channel that never delivered, and a correctly transparent
  // overlay with nothing live all look identical.
  const debug = useSearchParams().has('debug');

  const transitionMs = displayed.style.transitionMs;
  const cut = transitionMs === 0;
  const onScreen = cut ? slide : displayed;

  const { showData, style } = onScreen;
  const lyrics = showData?.lyrics;
  const type = fontStyleOf(lyrics ? style.lyricsFont : style.font, style.fonts);
  const blanked = slide.style.hidden;

  // Fetched from the incoming slide rather than the one on screen, so the face
  // is in the document before the crossfade hands it any text to draw.
  useCustomFonts(slide.style.fonts ?? []);

  const shown = !blanked && hasContent(slide.showData, slide.style.enabled);

  // Mid-transition is "a new slide has arrived and is not on screen yet".
  const visible = shown && (cut || slide === displayed);

  useEffect(() => {
    // Every other route paints a background; over live video any paint at all
    // shows up as a grey box, so this route clears it. Set from JS because it
    // has to reach html/body, which are outside the React tree.
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
    const channel = openLiveChannel(outputKey, 'lower3rd');

    const off = channel.onSlide(payload => {
      const next = { showData: payload.showData ?? emptyShowData(), style: { ...defaultStyle, ...payload.style } };

      // A payload that only carries a new timer shape must not restart the
      // crossfade: keeping the old object leaves `slide === displayed`.
      setSlide(current => keepSame(current, next));

      // Skew-corrected, like the card: this page is a reader, and the digits
      // it draws have to agree with the ones on the stage.
      setTimer(withTimerSkew(asTimerState(payload.timer)));

      // The card rides beside the slide, so a verse change carries it along
      // unchanged and it neither restarts nor disappears. Skew-corrected here
      // because this is a reader: the console must publish back exactly what
      // it sent, or two consoles would push a card around between them.
      const run = withSkew(asCardRun(payload.card));

      // Nothing on the stream: keep the card mounted and let it play its exit.
      // The next one to arrive replaces it.
      setCleared(!run);

      if (!run) return;

      setCard(current =>
        // Same card, same firing: hold the object so an unrelated slide change
        // does not replay the entrance.
        current && run.card.id === current.card.id && run.firedAt === current.firedAt ? current : run,
      );
      setReceived(current => ({ count: current.count + 1, at: new Date().toLocaleTimeString() }));
    });

    return () => {
      off();
      channel.close();
    };
  }, [outputKey]);

  useEffect(() => {
    if (slide === displayed) return;

    const swap = setTimeout(() => setDisplayed(slide), cut ? 0 : transitionMs / 2);

    return () => clearTimeout(swap);
  }, [cut, displayed, slide, transitionMs]);

  const resize = useCallback(() => {
    const element = textRef.current;

    if (!element) return;

    const budget = lyrics ? MAX_LINES.lyrics : MAX_LINES.verse;
    const max = Math.round(window.innerHeight / (lyrics ? FONT_DIVISOR.lyrics : FONT_DIVISOR.verse));

    element.style.fontSize = `${max}px`;

    const texts = [...element.querySelectorAll<HTMLElement>('.lower3rd-text')];
    const lineHeight = parseFloat(getComputedStyle(texts[0] ?? element).lineHeight) || max * 1.28;

    // References, the rules between stacked languages and the gaps around them:
    // whatever the block carries besides the verse text itself. Taken as the
    // remainder rather than summed rule by rule, so a look that adds its own
    // furniture is accounted for without naming it here.
    const overhead = Math.max(0, element.offsetHeight - texts.reduce((total, text) => total + text.offsetHeight, 0));
    const blocks = Math.max(1, texts.length);
    const band = Math.min(window.innerHeight * MAX_HEIGHT_RATIO, blocks * budget * lineHeight + overhead);

    // What one language may take of the band. The band alone would let the
    // first translation spend all of it and squeeze the rest, so each passage
    // is held to its share — but within that share it may use as many lines as
    // it likes. Counting lines instead would make a long slide shrink until it
    // fitted the budget, which is how a whole verse ended up as two lines of
    // unreadable text rather than four legible ones.
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

  // A name card takes the bar's place while it holds, and the bar comes
  // straight back underneath when it goes — the verse was never taken down,
  // only covered. Two straps stacked on one shot is the thing to avoid.
  const cardShowing = !blanked && !cleared && isShowing(card);

  // The run over the whole frame, when the console has armed it onto the
  // stream — the projector's rule, on the projector's grounds: a timer given
  // an output *is* that output for as long as it is armed. A card fired over
  // it still wins, the way it wins over a verse.
  const timerShowing = !blanked && !cardShowing && timer.onStream;

  return (
    <div className={`lower3rd-stage ${type.className}`} style={type.style ? { fontFamily: type.style } : undefined}>
      {card ? <NameCard run={card} visible={cardShowing} /> : null}

      {timerShowing ? (
        <div className="lower3rd-timer">
          {/* No wall clock, as on the projector: the room and the people
              watching it are being given a count, not a clock. */}
          <TimerScreen state={timer} showClock={false} />
        </div>
      ) : null}

      <div
        className={`lower3rd-bar lower3rd-bar--${look} ${top ? 'lower3rd-bar--top' : ''} ${ALIGN_CLASS[align]}`}
        // Opacity only. The bar used to slide in as well, but a lower third
        // that moves pulls the eye away from the speaker every time a verse
        // changes — a fade lets the words swap without the frame shifting.
        style={{
          // The operator's colours, over the look's own. Only the knobs they
          // have actually picked are here, so anything untouched still comes
          // from the stylesheet.
          ...varsFor(look, (lyrics ? style.lyricsColors : style.colors) ?? {}),
          opacity: visible && !cardShowing && !timerShowing ? 1 : 0,
          transition: transitionMs === 0 ? 'none' : `opacity ${transitionMs / 2}ms ease-in-out`,
        }}
      >
        <div ref={textRef} className="lower3rd-inner">
          {lyrics ? (
            <p className="lower3rd-text">{lyrics.text.split('\n').join(' ')}</p>
          ) : (
            style.order.map(lang => (style.enabled?.[lang] ? <Block key={lang} lang={lang} showData={showData} /> : null))
          )}
        </div>
      </div>

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
  );
};
