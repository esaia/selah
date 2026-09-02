'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { bibleNames } from '@/lib/bible/catalog';
import { openLiveChannel } from '@/lib/live/channel';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { emptyShowData, LANGS, type Align, type Lang, type ShowData, type StreamStyle } from '@/lib/types';

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
  font: 'font-banner',
  align: 'left',
  lyricsFont: 'font-banner',
  lyricsAlign: 'left',
  order: ['eng', 'geo', 'rus'],
  enabled: { geo: true, eng: false, rus: false },
  transitionMs: 320,
  position: 'bottom',
  variant: 'scrim',
  lyricsVariant: 'scrim',
  hidden: false,
};

/** Is there anything on this slide worth putting on screen? */
const hasContent = (showData: ShowData, enabled: Record<Lang, boolean>) => {
  if (showData?.lyrics?.text) return true;

  return LANGS.some(lang => enabled?.[lang] && showData?.[lang]?.length > 0);
};

/** One language: its verses, then the reference that produced them. */
const Block = ({ showData, lang }: { showData: ShowData; lang: Lang }) => {
  const verses = showData?.[lang] ?? [];

  if (verses.length === 0) return null;

  const first = verses[0];
  const last = verses[verses.length - 1];
  const name = bibleNames[lang]?.[+first.wigni + 2] ?? '';
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
}

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
  const blanked = slide.style.hidden;
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
      setSlide({ showData: payload.showData ?? emptyShowData(), style: { ...defaultStyle, ...payload.style } });
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

  return (
    <div className={`lower3rd-stage ${lyrics ? style.lyricsFont : style.font}`}>
      <div
        className={`lower3rd-bar lower3rd-bar--${(lyrics ? style.lyricsVariant : style.variant) || 'scrim'} ${
          top ? 'lower3rd-bar--top' : ''
        } ${ALIGN_CLASS[align]}`}
        // Opacity only. The bar used to slide in as well, but a lower third
        // that moves pulls the eye away from the speaker every time a verse
        // changes — a fade lets the words swap without the frame shifting.
        style={{
          opacity: visible ? 1 : 0,
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
