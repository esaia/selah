'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { lyricFor } from '@/lib/lyrics/langs';
import { fitText, refitOnFontLoad } from '@/lib/projector/fitText';
import { useBox } from '@/lib/projector/useBox';
import { flashAnimation, useFlash } from '@/lib/projector/useFlash';
import { plain, verseRef } from '@/lib/studio/text';
import {
  MESSAGE_COLORS,
  formatClock,
  formatDuration,
  runUnderWay,
  visibleMessages,
  type StageTimer,
  type TimerMessage,
  type TimerState,
} from '@/lib/timer/model';
import { LANGS, REQUIRED_LANG, type Lang, type ProjectorStyle, type ShowData } from '@/lib/types';

import { TimerScreen, useTimerNow } from './TimerScreen';

const langOf = (projector: Partial<ProjectorStyle>, chosen: Lang | undefined): Lang =>
  chosen && projector.enabled?.[chosen]
    ? chosen
    : ((projector.order ?? LANGS).find(lang => projector.enabled?.[lang]) ?? REQUIRED_LANG);

const stageLines = (slide: ShowData | undefined, lang: Lang): { text: string[]; ref: string } => {
  if (slide?.lyrics) {
    return { text: [lyricFor(slide.lyrics, slide.lyrics.stage).split('\n').join(' ')], ref: '' };
  }

  const verses = slide?.[lang] ?? [];

  if (verses.length === 0) return { text: [], ref: '' };

  const first = verses[0];
  const last = verses[verses.length - 1];
  const ref = verses.length > 1 ? `${verseRef(first, lang)}-${last.muxli}` : verseRef(first, lang);

  return { text: verses.map(verse => plain(verse.bv)), ref };
};

const PAD = 0.035;
const GAP = 0.028;
const RADIUS = 0.022;
const INSET = 0.025;

const LABEL = { size: 0.032, gap: 0.012, min: 8 };

const TEXT_SHARE = 0.92;

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

const Slide = ({ slide, lang, color }: { slide: ShowData | undefined; lang: Lang; color: string }) => {
  const [boxRef, box] = useBox();
  const textRef = useRef<HTMLDivElement>(null);

  const { text, ref } = stageLines(slide, lang);
  const said = text.join('␟');

  useLayoutEffect(() => {
    const refit = () =>
      fitText(textRef.current, box.height * TEXT_SHARE, {
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
          <p className="text-white/25">—</p>
        ) : (
          text.map((line, index) => <p key={index}>{line}</p>)
        )}

        {ref ? <p className="mt-[0.3em] text-[0.55em] opacity-60">{ref}</p> : null}
      </div>
    </div>
  );
};

const widthInEms = (text: string) =>
  [...text].reduce((sum, char) => sum + (char === ':' ? 0.34 : char === '-' ? 0.42 : 0.62), 0);

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

const AGENDA_ROWS = 6;

const AGENDA_LINES = AGENDA_ROWS * 1.35 + (AGENDA_ROWS - 1) * 0.28;

const agendaWindow = (timers: StageTimer[], activeId: string) => {
  if (timers.length <= AGENDA_ROWS) return { rows: timers, from: 0 };

  const active = Math.max(0, timers.findIndex(timer => timer.id === activeId));
  const from = Math.min(Math.max(0, active - 1), timers.length - AGENDA_ROWS);

  return { rows: timers.slice(from, from + AGENDA_ROWS), from };
};

const Agenda = ({ timer }: { timer: TimerState }) => {
  const [boxRef, box] = useBox();
  const textRef = useRef<HTMLDivElement>(null);

  const { rows, from } = agendaWindow(timer.timers, timer.activeId);
  const active = timer.timers.findIndex(item => item.id === timer.activeId);
  const said = rows.map(row => `${row.name}|${row.speaker}|${row.duration}|${row.kind}`).join('\u241f');

  useLayoutEffect(() => {
    const refit = () =>
      fitText(textRef.current, box.height * TEXT_SHARE, {
        min: 4,
        max: Math.max(6, (box.height * TEXT_SHARE) / AGENDA_LINES),
      });

    refit();

    return refitOnFontLoad(refit);
  }, [box.height, said, active]);

  return (
    <div ref={boxRef} className="flex size-full items-center overflow-hidden">
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
  stageLang,
  timer,
}: {
  showData: ShowData;
  next: ShowData;
  projector: Partial<ProjectorStyle>;
  stageLang?: Lang;
  timer: TimerState;
}) => {
  const now = useTimerNow();
  const lang = langOf(projector, stageLang);

  const [frameRef, frame] = useBox();
  const unit = frame.height;

  const notes = visibleMessages(timer);

  const onRail = runUnderWay(timer);

  const flashing = useFlash(timer.flashAt, now);

  const takeover = notes.filter(note => note.fullScreen);

  if (takeover.length > 0)
    return (
      <div
        className="size-full bg-black px-[6%] py-[5%] font-sans"
        style={{ animation: flashAnimation(flashing) }}
      >
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

        <div className="flex min-h-0 flex-[38] flex-col">
          <Panel label="Agenda" color="#ffffff" unit={unit}>
            <Agenda timer={timer} />
          </Panel>
        </div>

        <div className="flex min-h-0 flex-[36] flex-col">
          <Panel
            label={notes.length > 0 || !onRail ? 'Stage message' : 'Timer'}
            color={notes.length > 0 ? MESSAGE_COLORS[notes[0].color] : '#ffffff'}
            unit={unit}
            outlined={notes.length > 0}
          >
            {notes.length === 0 && onRail ? (
              <TimerScreen state={timer} showClock={false} />
            ) : (
              <Notes messages={notes} now={now} screenFlashing={0} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};
