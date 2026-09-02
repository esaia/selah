'use client';

import { useState } from 'react';
import { Check, Pause, Pencil, Play, Plus, RotateCcw, StickyNote, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

import { TimerEditor } from './TimerEditor';
import {
  LABEL_COLORS,
  TIMER_KINDS,
  armTimer,
  formatDuration,
  newTimer,
  parseDuration,
  resetRun,
  startRun,
  toggleRun,
  type StageTimer,
  type TimerKind,
} from '@/lib/timer/model';

/**
 * A duration typed the way it is read: `10` for ten minutes, `10:00` or
 * `1:02:30` for the rest. Held as text while it is being typed — reformatting
 * mid-keystroke would fight the operator — and committed on blur or Enter.
 * Anything unparseable reverts rather than emptying the timer.
 */
const DurationInput = ({
  value,
  label,
  className,
  onCommit,
}: {
  value: number;
  label: string;
  className?: string;
  onCommit: (ms: number) => void;
}) => {
  const [text, setText] = useState(() => formatDuration(value));
  const [editing, setEditing] = useState(false);

  // A duration changed elsewhere — ±1m, or a reset — has to show here too, but
  // not while it is being typed into. Adjusted during render rather than in an
  // effect: the field must never paint the old value for a frame.
  const [seen, setSeen] = useState(value);

  if (value !== seen) {
    setSeen(value);

    if (!editing) setText(formatDuration(value));
  }

  const commit = () => {
    setEditing(false);

    const parsed = parseDuration(text);

    if (parsed === null) {
      setText(formatDuration(value));
      return;
    }

    onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      title={label}
      value={text}
      onClick={event => event.stopPropagation()}
      onFocus={event => {
        setEditing(true);
        event.target.select();
      }}
      onChange={event => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur();

        if (event.key === 'Escape') {
          setText(formatDuration(value));
          setEditing(false);
          event.currentTarget.blur();
        }
      }}
      className={cn(
        'h-8 rounded-studio border border-studio-border bg-white px-2 text-center text-sm font-semibold',
        'tabular-nums text-studio-text transition-colors duration-150 focus:outline-none focus-visible:ring-2',
        'focus-visible:ring-studio-accent/40',
        className,
      )}
    />
  );
};

const Row = ({ timer, index, live }: { timer: StageTimer; index: number; live: boolean }) => {
  const { timer: state, updateTimer } = useStudio();

  const [editing, setEditing] = useState(false);

  const patch = (fields: Partial<StageTimer>) =>
    updateTimer(current => ({
      ...current,
      timers: current.timers.map(item => (item.id === timer.id ? { ...item, ...fields } : item)),
    }));

  // The transport icon follows the run rather than the highlight — they part
  // company for a timer armed but not up — and Clear stops the run, so a row
  // that has gone quiet offers play again.
  const running = state.activeId === timer.id && state.running;

  // The last item a run was actually started on. Not the armed one — arming the
  // next thing does not undo having given this one — and never both at once.
  const played = !live && timer.id === state.playedId;

  return (
    <li
      onClick={() => updateTimer(current => armTimer(current, timer.id))}
      className={cn(
        'flex cursor-pointer flex-wrap items-center gap-2 rounded-studio border px-3 py-2.5',
        'transition-colors duration-150',
        live
          ? 'border-studio-accent bg-studio-accent/10'
          : played
            ? 'border-studio-border bg-studio-surface'
            : 'border-studio-border bg-white hover:bg-studio-surface',
      )}
    >
      {/* The place in the order, until this is the row that was last given —
          then the tick takes the slot, which is the mark the stage's agenda
          wears for the same timer. */}
      <span className="w-4 shrink-0 text-xs font-medium text-studio-faint" title={played ? 'Last played' : undefined}>
        {played ? <Check className="size-3.5 text-studio-go" /> : index + 1}
      </span>

      {timer.kind === 'clock' ? (
        <span className="flex h-8 w-[76px] items-center justify-center text-xs text-studio-muted">clock</span>
      ) : (
        <DurationInput
          value={timer.duration}
          label={`Duration of ${timer.name}`}
          className="w-[76px] shrink-0"
          onCommit={duration => patch({ duration })}
        />
      )}

      <input
        type="text"
        aria-label="Timer name"
        value={timer.name}
        onClick={event => event.stopPropagation()}
        onChange={event => patch({ name: event.target.value })}
        className="h-8 min-w-0 flex-1 rounded-studio border border-transparent bg-transparent px-2 text-sm
          font-medium text-studio-text transition-colors duration-150 hover:border-studio-border
          focus:border-studio-border focus:bg-white focus:outline-none focus-visible:ring-2
          focus-visible:ring-studio-accent/40"
      />

      <Select
        className="w-[118px] shrink-0"
        value={timer.kind}
        onChange={kind => patch({ kind: kind as TimerKind })}
        onClick={event => event.stopPropagation()}
        options={TIMER_KINDS}
      />

      {/* The wrap-up is a countdown's own: it is the amount of time *left*, and
          a count-up counts away from a start rather than towards a deadline the
          operator is watching. Offering the field there only invited someone to
          set an amber warning that never arrives. */}
      {timer.kind === 'countdown' ? (
        <DurationInput
          value={timer.wrapUp}
          label="Wrap-up warning — the digits turn amber with this much left"
          className="w-[70px] shrink-0 border-amber-300 text-amber-600"
          onCommit={wrapUp => patch({ wrapUp })}
        />
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <span className="relative">
          <IconButton
            label="Speaker, notes and labels"
            onClick={event => {
              event.stopPropagation();
              setEditing(current => !current);
            }}
          >
            <Pencil className="size-3.5" />
          </IconButton>

          {editing ? <TimerEditor timer={timer} onClose={() => setEditing(false)} /> : null}
        </span>

        <IconButton
          label="Reset this timer"
          onClick={event => {
            event.stopPropagation();
            updateTimer(current => resetRun(armTimer(current, timer.id)));
          }}
        >
          <RotateCcw className="size-3.5" />
        </IconButton>

        <button
          type="button"
          title={running ? 'Pause' : 'Start'}
          aria-label={running ? 'Pause' : 'Start'}
          onClick={event => {
            event.stopPropagation();
            updateTimer(current =>
              current.activeId === timer.id ? toggleRun(current) : startRun(armTimer(current, timer.id)),
            );
          }}
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-studio text-white transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
            running ? 'bg-studio-danger hover:bg-[#b91c1c]' : 'bg-studio-go hover:bg-[#19643f]',
          )}
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>

        <IconButton
          label="Remove this timer"
          tone="danger"
          onClick={event => {
            event.stopPropagation();
            updateTimer(current => {
              const timers = current.timers.filter(item => item.id !== timer.id);

              // The last one is never removed outright: a console with no timer
              // has nothing to put on screen. It is emptied back to a fresh one.
              return timers.length
                ? { ...current, timers }
                : { ...resetRun(current), timers: [newTimer({ name: 'Timer 1' })] };
            });
          }}
        >
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>

      {/* The detail line, and only when there is detail: an empty second row
          under every timer would double the height of the running order to say
          nothing. The speaker is the one thing here the stage also sees, so it
          leads; the labels and the note are the operator's own. */}
      {timer.speaker || timer.labels.length > 0 || timer.notes ? (
        <div className="flex basis-full flex-wrap items-center gap-1.5 pl-6 text-[11px]">
          {timer.speaker ? <span className="font-medium text-studio-muted">{timer.speaker}</span> : null}

          {timer.labels.map(label => (
            <span
              key={label.id}
              className="rounded-[3px] px-1.5 py-px font-medium text-white"
              style={{ backgroundColor: LABEL_COLORS[label.color] }}
            >
              {label.text}
            </span>
          ))}

          {timer.notes ? (
            <span className="flex min-w-0 items-center gap-1 text-studio-faint" title={timer.notes}>
              <StickyNote className="size-3 shrink-0" />
              <span className="truncate">{timer.notes.split('\n')[0]}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

/** The running order: every timer the service needs, in the order it needs them. */
export const TimerList = () => {
  const { timer, updateTimer } = useStudio();

  return (
    <section className="space-y-2">
      <ul className="space-y-2">
        {timer.timers.map((item, index) => (
          // Live means on a screen, not merely armed: cleared, the running
          // order goes quiet and nothing in it claims to be up, which is the
          // whole point of having pressed Clear.
          <Row key={item.id} timer={item} index={index} live={item.id === timer.activeId && timer.onStage} />
        ))}
      </ul>

      <Button
        icon={<Plus className="size-3.5" />}
        onClick={() =>
          updateTimer(current => ({
            ...current,
            timers: [...current.timers, newTimer({ name: `Timer ${current.timers.length + 1}` })],
          }))
        }
      >
        Add timer
      </Button>
    </section>
  );
};
