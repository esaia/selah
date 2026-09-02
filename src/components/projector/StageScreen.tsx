'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { useBox } from '@/lib/projector/useBox';
import { flashAnimation, useFlash } from '@/lib/projector/useFlash';
import { plain, verseRef } from '@/lib/studio/text';
import {
  MESSAGE_COLORS,
  formatClock,
  formatDuration,
  visibleMessages,
  type StageTimer,
  type TimerMessage,
  type TimerState,
} from '@/lib/timer/model';
import { LANGS, type Lang, type ProjectorStyle, type ShowData } from '@/lib/types';

import { useTimerNow } from './TimerScreen';

/**
 * The stage display, for the person standing in front of the room: what is on
 * the screen now, what comes next, the time, and anything the operator has to
 * say to them.
 *
 * The layout is fixed on purpose. A stage monitor is an instrument rather than
 * a look — it sits in someone's peripheral vision for an hour — so it is black,
 * text only, never the projector's background art, and nothing on it moves.
 * Slides cut rather than fade: motion at the edge of vision is exactly what a
 * person on stage does not need.
 *
 * The hierarchy does the work. The live slide is large and white; what is
 * coming is smaller, amber and outlined, so a glance can never mistake one for
 * the other. The rail on the right is where anything that is not a slide goes,
 * so there is one place to look for it.
 *
 * The run is not on this face at all. While a countdown matters it takes the
 * whole screen, and once the operator has cleared it the stage is done with
 * it — a second, smaller copy of the digits down the side would only be one
 * more thing to disbelieve.
 *
 * Every size on it is a fraction of the frame it was handed, measured — never a
 * viewport unit. The same component is a 4K screen in the hall and a 300px card
 * in the console, and `vw` sized the card for the console's *window*: padding
 * wider than the panels it was meant to inset, which is what emptied them.
 */

/** Which language the stage reads: the first one the room is actually shown. */
const stageLang = (projector: Partial<ProjectorStyle>): Lang =>
  (projector.order ?? LANGS).find(lang => projector.enabled?.[lang]) ?? 'geo';

/**
 * A slide as lines of plain text.
 *
 * A song is one block of words, as it is on the projector. Verses keep their
 * reference on a line of its own, because "what is on screen" for someone on
 * stage includes which verse it is.
 */
const stageLines = (slide: ShowData | undefined, lang: Lang): { text: string[]; ref: string } => {
  if (slide?.lyrics) return { text: [slide.lyrics.text.split('\n').join(' ')], ref: slide.lyrics.title };

  const verses = slide?.[lang] ?? [];

  if (verses.length === 0) return { text: [], ref: '' };

  const first = verses[0];
  const last = verses[verses.length - 1];
  const ref = verses.length > 1 ? `${verseRef(first, lang)}-${last.muxli}` : verseRef(first, lang);

  return { text: verses.map(verse => plain(verse.bv)), ref };
};

/** The furniture, as fractions of the frame's height. */
const PAD = 0.035;
const GAP = 0.028;
const RADIUS = 0.022;
const INSET = 0.025;

/**
 * The caption under each box. It has a floor for the same reason the timer
 * screen's name does — set from a 300px card it would otherwise be a grey
 * smudge — and it never wraps, because two lines of caption would eat the
 * panel it is naming.
 */
const LABEL = { size: 0.032, gap: 0.012, min: 8 };

/** The share of a panel its text may take before it starts coming down in size. */
const TEXT_SHARE = 0.92;

/**
 * One labelled box, and the room inside it.
 *
 * The label sits under the box in small caps, the way a stage display has
 * always drawn them: it costs a few pixels and removes every doubt about which
 * box is which for someone reading the screen for the first time.
 *
 * What goes in the box is positioned rather than sized in percentages. A child
 * asking for `height: 100%` of a flex item whose own height is still being
 * worked out is the other half of how these panels came out empty — measuring
 * nothing, and drawing their text at a pixel.
 */
const Panel = ({
  label,
  color,
  unit,
  outlined = false,
  children,
}: {
  label: string;
  color: string;
  unit: number;
  outlined?: boolean;
  children: ReactNode;
}) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <div
      className="relative min-h-0 flex-1 overflow-hidden"
      style={{
        border: `${Math.max(1, unit * 0.003)}px solid ${outlined ? color : 'rgba(255,255,255,0.18)'}`,
        borderRadius: unit * RADIUS,
      }}
    >
      <div className="absolute inset-0 flex items-center" style={{ padding: unit * INSET }}>
        {children}
      </div>
    </div>

    <div
      className="shrink-0 overflow-hidden text-center font-semibold whitespace-nowrap uppercase"
      style={{
        color,
        marginTop: unit * LABEL.gap,
        fontSize: Math.max(LABEL.min, unit * LABEL.size),
        letterSpacing: '0.2em',
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  </div>
);

/**
 * A slide fitted to the box it was given rather than the other way round.
 *
 * `fitText` writes the size straight onto the node, so a long slide comes down
 * in size without a re-render and without the panel moving — the room was set
 * aside for it either way.
 */
const Slide = ({ slide, lang, color }: { slide: ShowData | undefined; lang: Lang; color: string }) => {
  const [boxRef, box] = useBox();
  const textRef = useRef<HTMLDivElement>(null);

  const { text, ref } = stageLines(slide, lang);
  const said = text.join('␟');

  useLayoutEffect(() => {
    const refit = () =>
      fitText(textRef.current, box.height * TEXT_SHARE, {
        // No floor worth the name: a slide that cannot be set at a readable
        // size in the box it has should come down in size, not out of it.
        min: 4,
        max: Math.max(6, box.height * 0.5),
      });

    refit();

    return refitOnFontLoad(refit);
  }, [box.height, said, ref]);

  return (
    <div ref={boxRef} className="flex size-full items-center overflow-hidden">
      <div ref={textRef} className="w-full leading-tight" style={{ color }}>
        {text.length === 0 ? (
          // Nothing live is a fact worth stating. A panel that simply went
          // black would read as a screen that had stopped working.
          <p className="text-white/25">—</p>
        ) : (
          text.map((line, index) => <p key={index}>{line}</p>)
        )}

        {ref ? <p className="mt-[0.3em] text-[0.55em] opacity-60">{ref}</p> : null}
      </div>
    </div>
  );
};

/**
 * Roughly how wide a reading is, in ems. Tabular figures are near enough a
 * fixed width and a colon is much narrower; measuring the text properly would
 * mean a layout pass per tick for a number that only changes when the digit
 * count does.
 */
const widthInEms = (text: string) =>
  [...text].reduce((sum, char) => sum + (char === ':' ? 0.34 : char === '-' ? 0.42 : 0.62), 0);

/** A reading on the right rail — the clock, or what is left of the run. */
const Readout = ({ text, color }: { text: string; color: string }) => {
  const [boxRef, box] = useBox();

  return (
    <div ref={boxRef} className="flex size-full items-center justify-center overflow-hidden">
      <span
        className="leading-none font-semibold whitespace-nowrap tabular-nums"
        style={{
          color,
          fontSize: Math.floor(Math.min(box.width / widthInEms(text), box.height * 0.85)) || 1,
          transition: 'color 300ms linear',
        }}
      >
        {text}
      </span>
    </div>
  );
};

/**
 * The notes the operator has put up, fitted to the box between them.
 *
 * Each keeps its own colour and weight — the operator chose them to mean
 * something — so this is not a slide with the text swapped in. They stack, in
 * the order the console has them.
 */
const Note = ({
  message,
  now,
  screenFlashing,
}: {
  message: TimerMessage;
  now: number | null;
  screenFlashing: number;
}) => {
  const own = useFlash(message.flashAt, now);

  return (
    // No size of its own: the block around it is fitted, and every note in it
    // is set at whatever size the whole lot fits at.
    <p
      style={{
        color: MESSAGE_COLORS[message.color],
        fontWeight: message.bold ? 700 : 500,
        textTransform: message.caps ? 'uppercase' : 'none',
        animation: flashAnimation(own || screenFlashing),
      }}
    >
      {message.text}
    </p>
  );
};

const Notes = ({
  messages,
  now,
  screenFlashing,
}: {
  messages: TimerMessage[];
  now: number | null;
  screenFlashing: number;
}) => {
  const [boxRef, box] = useBox();
  const textRef = useRef<HTMLDivElement>(null);

  const said = messages.map(message => `${message.text}|${message.caps}|${message.bold}`).join('\u241f');

  useLayoutEffect(() => {
    const refit = () =>
      fitText(textRef.current, box.height * TEXT_SHARE, { min: 4, max: Math.max(6, box.height * 0.5) });

    refit();

    return refitOnFontLoad(refit);
  }, [box.height, said]);

  return (
    <div ref={boxRef} className="flex size-full items-center overflow-hidden">
      <div ref={textRef} className="w-full space-y-[0.12em] text-center leading-tight">
        {messages.length === 0 ? (
          // An empty box rather than no box: the rail keeps its shape all
          // service, so a note appearing never shifts the clock under it.
          <p className="text-white/20">—</p>
        ) : (
          messages.map(message => (
            <Note key={message.id} message={message} now={now} screenFlashing={screenFlashing} />
          ))
        )}
      </div>
    </div>
  );
};


/**
 * How much of the running order the panel will hold at a readable size. More
 * than this and every line comes down until none of them can be read from the
 * back, which serves nobody: a person on stage wants where they are and what is
 * next, not the whole service at once.
 */
const AGENDA_ROWS = 6;

/**
 * The window of the running order worth showing: what is up, one behind it for
 * bearing, and everything still to come until the panel is full.
 */
const agendaWindow = (timers: StageTimer[], activeId: string) => {
  if (timers.length <= AGENDA_ROWS) return { rows: timers, from: 0 };

  const active = Math.max(0, timers.findIndex(timer => timer.id === activeId));
  const from = Math.min(Math.max(0, active - 1), timers.length - AGENDA_ROWS);

  return { rows: timers.slice(from, from + AGENDA_ROWS), from };
};

/**
 * The running order, as the person standing up needs it: what is on now, and
 * what follows.
 *
 * It is the console's timer list and nothing else — the same rows the operator
 * types the service into — so the count on screen and the agenda beside it can
 * never disagree about what is happening.
 *
 * The armed item is white, the one after it amber like the next slide, and the
 * rest are dim: the three weights this screen uses everywhere else, so reading
 * it costs a glance. The last item a run was actually started on keeps a tick
 * and a little more light than the dim ones — on a stage screen "what have we
 * done" is asked as often as "what is next", and arming the next item is not
 * the same as having given the last. The durations are the ones that were planned rather than
 * what is left — a second number counting down beside the count itself would
 * only be one more thing to disbelieve.
 */
const Agenda = ({ timer }: { timer: TimerState }) => {
  const [boxRef, box] = useBox();
  const textRef = useRef<HTMLDivElement>(null);

  const { rows, from } = agendaWindow(timer.timers, timer.activeId);
  const active = timer.timers.findIndex(item => item.id === timer.activeId);
  const said = rows.map(row => `${row.name}|${row.speaker}|${row.duration}|${row.kind}`).join('\u241f');

  useLayoutEffect(() => {
    const refit = () =>
      // A lower ceiling than a slide's: six lines that fit are the point here,
      // not one line as large as the box will take.
      fitText(textRef.current, box.height * TEXT_SHARE, { min: 4, max: Math.max(6, box.height * 0.28) });

    refit();

    return refitOnFontLoad(refit);
  }, [box.height, said, active]);

  return (
    <div ref={boxRef} className="flex size-full items-center overflow-hidden">
      {/* A little more leading than the slides get, for the same reason the
          timer's name has it: a row is exactly one line tall and clips what
          hangs below it, which in Georgian is most of the alphabet. */}
      <div ref={textRef} className="w-full leading-[1.35]">
        {rows.length === 0 ? (
          <p className="text-center text-white/20">—</p>
        ) : (
          rows.map((row, index) => {
            const at = from + index;
            const isNow = at === active;
            const isNext = at === active + 1;
            const isDone = !isNow && row.id === timer.playedId;

            return (
              <div
                key={row.id}
                className="flex items-baseline gap-[0.5em] overflow-hidden whitespace-nowrap"
                style={{
                  color: isNow
                    ? '#ffffff'
                    : isNext
                      ? '#fbbf24'
                      : isDone
                        ? 'rgba(255,255,255,0.66)'
                        : 'rgba(255,255,255,0.4)',
                  fontWeight: isNow ? 700 : 500,
                  marginTop: index === 0 ? 0 : '0.28em',
                }}
              >
                {/* A marker rather than a filled row: a lit bar at the edge of
                    someone's vision reads as something having just happened,
                    which is what the flash is for. */}
                <span className="w-[0.7em] shrink-0" style={{ opacity: isNow || isDone ? 1 : 0 }}>
                  {isNow ? '▸' : '✓'}
                </span>

                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">
                  {row.name}
                  {row.speaker ? <span className="opacity-60"> · {row.speaker}</span> : null}
                </span>

                <span className="shrink-0 tabular-nums opacity-70">
                  {row.kind === 'clock' ? '' : formatDuration(row.duration)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const StageScreen = ({
  showData,
  next,
  projector,
  timer,
}: {
  showData: ShowData;
  next: ShowData;
  projector: Partial<ProjectorStyle>;
  timer: TimerState;
}) => {
  const now = useTimerNow();
  const lang = stageLang(projector);

  // One box, deliberately: the frame. Everything on the screen is a fraction of
  // it, so nothing here waits on a second measurement that can only arrive a
  // paint late.
  const [frameRef, frame] = useBox();
  const unit = frame.height;

  // A note from the console is the one thing on this screen written *to* the
  // person standing up, so it has the rail to itself under the clock. The run
  // is not on this face at all: while a countdown matters it takes the whole
  // screen, and once it has been cleared the stage is done with it.
  const notes = visibleMessages(timer);

  // The operator's Flash blinks the whole screen. On the timer's face it is the
  // digits that blink, because the digits are the screen; here there is no one
  // element that is, so the frame wears it and every panel blinks together.
  const flashing = useFlash(timer.flashAt, now);

  if (timer.blackout) return <div className="size-full bg-black" />;

  // A note the operator has sent full screen is the whole stage for as long as
  // it is up. The point of that button is that the person standing there should
  // not have to find the words in the corner of a screen of slides — the same
  // reason the timer's face gives way to one.
  const takeover = notes.filter(note => note.fullScreen);

  if (takeover.length > 0)
    return (
      <div
        className="size-full bg-black px-[6%] py-[5%] font-sans"
        style={{ animation: flashAnimation(flashing) }}
      >
        {/* The frame wears the flash here as it does below, so a note under it
            blinks only when it was the one flashed. */}
        <Notes messages={takeover} now={now} screenFlashing={0} />
      </div>
    );

  return (
    <div
      ref={frameRef}
      className="flex size-full bg-black font-sans"
      style={{ padding: unit * PAD, gap: unit * GAP, animation: flashAnimation(flashing) }}
    >
      <div className="flex min-w-0 flex-[68] flex-col" style={{ gap: unit * GAP }}>
        <div className="flex min-h-0 flex-[62] flex-col">
          <Panel label="Current slide" color="#ffffff" unit={unit}>
            <Slide slide={showData} lang={lang} color="#ffffff" />
          </Panel>
        </div>

        <div className="flex min-h-0 flex-[38] flex-col">
          <Panel label="Next slide" color="#fbbf24" unit={unit} outlined>
            <Slide slide={next} lang={lang} color="#fbbf24" />
          </Panel>
        </div>
      </div>

      <div className="flex min-w-0 flex-[32] flex-col" style={{ gap: unit * GAP }}>
        <div className="flex min-h-0 flex-[26] flex-col">
          <Panel label="Clock" color="#ffffff" unit={unit}>
            <Readout text={now === null ? '--:--' : formatClock(now, false)} color="#ffffff" />
          </Panel>
        </div>

        {/* The running order sits between the two: it is read the way the clock
            is, in glances, while a note from the operator is the one thing on
            this screen that has to be found at once — so it keeps the corner it
            has always had. */}
        <div className="flex min-h-0 flex-[38] flex-col">
          <Panel label="Agenda" color="#ffffff" unit={unit}>
            <Agenda timer={timer} />
          </Panel>
        </div>

        <div className="flex min-h-0 flex-[36] flex-col">
          <Panel
            label="Stage message"
            color={notes.length > 0 ? MESSAGE_COLORS[notes[0].color] : '#ffffff'}
            unit={unit}
            outlined={notes.length > 0}
          >
            {/* The screen's own flash is worn by the frame, so a note under it
                blinks only when it was the one flashed. */}
            <Notes messages={notes} now={now} screenFlashing={0} />
          </Panel>
        </div>
      </div>
    </div>
  );
};
