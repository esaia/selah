'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import {
  LABEL_COLORS,
  TIMER_KINDS,
  formatDuration,
  newLabel,
  type LabelColor,
  type StageTimer,
  type TimerKind,
  type TimerLabel,
} from '@/lib/timer/model';

/**
 * The digits of a duration, filling from the right: `5` is five seconds, `530`
 * is five thirty, `13000` is an hour and a half. Everything but a digit is
 * dropped on the way in and the colons are put back as they are earned, so
 * there is no way to type a time the field cannot read — and no way to leave it
 * holding something that is not one.
 */
const maskOf = (input: string) => {
  // Six digits is `HH:MM:SS`. Past that the field would be counting days, which
  // no service does and no output draws.
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(-6);

  if (!digits) return { digits, shown: '', ms: 0 };

  const parts = [];

  for (let at = digits.length; at > 0; at -= 2) parts.unshift(digits.slice(Math.max(0, at - 2), at));

  const [hours, minutes, seconds] = [0, 0, 0, ...parts.map(Number)].slice(-3);

  return {
    digits,
    // The leading group keeps whatever it was given; the rest are pairs, which
    // is what makes a half-typed time read as one.
    shown: parts.map((part, at) => (at ? part.padStart(2, '0') : part)).join(':'),
    ms: ((hours * 60 + minutes) * 60 + seconds) * 1000,
  };
};

/**
 * A duration typed as a stage clock is read, masked as it goes: the operator
 * types digits and the field puts the colons in. Held as text while it is being
 * typed — reformatting mid-keystroke would fight them — and committed on blur
 * or Enter. An empty field reverts rather than emptying the timer.
 */
const DurationInput = ({
  value,
  label,
  className,
  autoFocus,
  onCommit,
}: {
  value: number;
  label: string;
  className?: string;
  autoFocus?: boolean;
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

    const { digits, ms } = maskOf(text);

    if (!digits) {
      setText(formatDuration(value));
      return;
    }

    setText(formatDuration(ms));
    onCommit(ms);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoFocus={autoFocus}
      aria-label={label}
      title={label}
      value={text}
      onClick={event => event.stopPropagation()}
      onFocus={event => {
        setEditing(true);
        event.target.select();
      }}
      onChange={event => setText(maskOf(event.target.value).shown)}
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

const COLORS = Object.keys(LABEL_COLORS) as LabelColor[];

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[4.5rem_1fr] items-start gap-3">
    <span className="pt-1.5 text-xs text-studio-muted">{label}</span>
    {children}
  </div>
);

const INPUT =
  'w-full rounded-studio border border-studio-border bg-white px-2.5 py-1.5 text-sm text-studio-text ' +
  'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40';

/**
 * Escape, or a click anywhere but the panel and the control it hangs from.
 *
 * The anchor is the ref's parent: counting a click on the button that opened
 * the panel as "outside" would close it on the way down and let that button's
 * own toggle reopen it on the way up.
 */
const useDismiss = (onClose: () => void) => {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const onDown = (event: MouseEvent) => {
      if (!box.current?.parentElement?.contains(event.target as Node)) onClose();
    };

    window.addEventListener('keydown', onKey);
    // Captured, so a control that stops the click on its way up cannot leave
    // the panel open behind it.
    document.addEventListener('mousedown', onDown, true);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [onClose]);

  return box;
};

/**
 * The sheet both panels are drawn on: hung under the cell that opened it,
 * arrow and all, rather than taking the middle of the screen. What is being
 * edited is one row of a list the operator is reading down, and a centred
 * dialog puts the answer somewhere other than the question.
 */
const Panel = ({
  label,
  width,
  boxRef,
  children,
}: {
  label: string;
  width: string;
  boxRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) => {
  // Which side of the row it hangs from. Under it by default, over it when the
  // last timer in a long running order is the one being edited and there is no
  // window left below — a panel that opens off the bottom of the screen is a
  // panel the operator has to scroll to answer.
  const [above, setAbove] = useState(false);

  useLayoutEffect(() => {
    const panel = boxRef.current;

    if (!panel) return;

    const place = () => {
      const anchor = panel.parentElement?.getBoundingClientRect();

      if (!anchor) return;

      const under = window.innerHeight - anchor.bottom;
      const over = anchor.top;

      // Only flips when the other side is genuinely roomier: squeezed both
      // ways, hanging down is the arrangement the operator expects.
      setAbove(under < panel.offsetHeight + 16 && over > under);
    };

    place();

    window.addEventListener('resize', place);
    // Captured, so the panel follows a scroll of the list it is in and not
    // only one of the window.
    window.addEventListener('scroll', place, true);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [boxRef]);

  return (
    // The row it belongs to is clickable — that is how a timer is armed — so
    // nothing that happens inside the panel is allowed to reach it.
    <div
      ref={boxRef}
      role="dialog"
      aria-label={label}
      onClick={event => event.stopPropagation()}
      className={cn(
        // The console's ordinary radius, not the larger one: a corner that
        // round left the arrow standing off on its own with nothing to meet.
        'absolute left-0 z-40 rounded-studio border border-studio-border bg-white p-3 shadow-studio-modal',
        above ? 'bottom-full mb-2' : 'top-full mt-2',
        width,
      )}
    >
      {/* Says which cell the panel belongs to. It marks the start of the cell
          rather than the button inside it: a pencil follows the text as it is
          typed, and an arrow that tracked it would take the panel along. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-3 size-2 rotate-45 border-studio-border bg-white',
          above ? '-bottom-[5px] border-r border-b' : '-top-[5px] border-t border-l',
        )}
      />

      <div className="space-y-2">{children}</div>
    </div>
  );
};

/** Writes one timer's fields, wherever the panel is. */
const usePatch = (timer: StageTimer) => {
  const { updateTimer } = useStudio();

  return (fields: Partial<StageTimer>) =>
    updateTimer(current => ({
      ...current,
      timers: current.timers.map(item => (item.id === timer.id ? { ...item, ...fields } : item)),
    }));
};

/**
 * How long the item runs, and when it starts warning.
 *
 * A panel of its own, hung off the duration on the row, because the length is
 * the one thing here an operator changes mid-service — "give them five more" —
 * and hunting for it under a name and a note is the wrong shape for that. What
 * the item *is* stays behind the pencil.
 */
export const TimerLength = ({ timer, onClose }: { timer: StageTimer; onClose: () => void }) => {
  const box = useDismiss(onClose);
  const patch = usePatch(timer);

  return (
    <Panel
      boxRef={box}
      label={`Length of ${timer.name || 'this timer'}`}
      width="w-[min(21rem,calc(100vw-2rem))]"
    >
      {/* What it counts, beside how long for: the two answer one question
          between them, and reading the length without knowing which way it
          runs says nothing. It is on the row as well — this is the panel the
          operator is already in when they change one of the two. */}
      <Field label="Counts">
        <Select
          className="w-[140px]"
          value={timer.kind}
          onChange={kind => patch({ kind: kind as TimerKind })}
          options={TIMER_KINDS}
        />
      </Field>

      {/* A clock reads the hour off the wall, so there is nothing to set. */}
      {timer.kind === 'clock' ? null : (
        <Field label="Length">
          <DurationInput
            autoFocus
            value={timer.duration}
            label="How long this item runs"
            className="w-[88px]"
            onCommit={duration => patch({ duration })}
          />
        </Field>
      )}

      {/* Both warnings are read off the time *left*, so anything with a length
          to run out of has them — a count-up towards a target turns amber and
          then red on its way there in exactly the same way. Only the clock has
          neither: it counts the hour, which nothing runs out of. */}
      {timer.kind === 'clock' ? null : (
        <>
          {/* What each one does is said by the colour it is written in — the
              same amber and red the digits will wear — so the panel is three
              figures rather than three sentences. The titles carry the rest. */}
          <Field label="Wrap-up">
            <DurationInput
              value={timer.wrapUp}
              label="Wrap-up warning — with this much left the digits turn amber"
              className="w-[88px] border-amber-300 text-amber-600"
              onCommit={wrapUp => patch({ wrapUp })}
            />
          </Field>

          <Field label="Final">
            <DurationInput
              value={timer.finalAt}
              label="The last stretch — with this much left the digits turn red and beat out the seconds"
              className="w-[88px] border-red-300 text-studio-danger"
              onCommit={finalAt => patch({ finalAt })}
            />
          </Field>
        </>
      )}
    </Panel>
  );
};

/**
 * Writing a label: its words and its colour, in one dialog.
 *
 * A modal rather than a field in the panel, because a label is picked as much
 * as it is typed — the colour is the point of it, and cycling through tints by
 * clicking the chip until the right one came round was a guessing game. The
 * same dialog edits an existing label, so a colour chosen once can be changed.
 */
const LabelModal = ({
  label,
  taken,
  onSave,
  onClose,
}: {
  label: TimerLabel | null;
  taken: LabelColor[];
  onSave: (fields: { text: string; color: LabelColor }) => void;
  onClose: () => void;
}) => {
  // Opened on nothing means a new label, and it arrives wearing the first tint
  // this timer is not already using — two labels the same colour say nothing.
  const [text, setText] = useState(label?.text ?? '');
  const [color, setColor] = useState<LabelColor>(
    label?.color ?? COLORS.find(tint => !taken.includes(tint)) ?? 'amber',
  );

  const save = () => {
    const trimmed = text.trim();

    if (!trimmed) return;

    onSave({ text: trimmed, color });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={label ? 'Edit label' : 'Add label'}
      width="max-w-sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="accent" disabled={!text.trim()} onClick={save}>
            {label ? 'Save label' : 'Add label'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs text-studio-muted">Label</span>

          <input
            autoFocus
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') save();
            }}
            placeholder="What this row is, in a word"
            className={INPUT}
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs text-studio-muted">Colour</span>

          <div className="flex flex-wrap gap-2">
            {COLORS.map(tint => (
              <button
                key={tint}
                type="button"
                aria-label={tint}
                title={tint}
                aria-pressed={color === tint}
                onClick={() => setColor(tint)}
                style={{ backgroundColor: LABEL_COLORS[tint] }}
                className={cn(
                  'size-7 rounded-full transition-transform duration-150 focus:outline-none',
                  'hover:scale-110 focus-visible:ring-2 focus-visible:ring-studio-accent/40',
                  color === tint && 'ring-2 ring-studio-text ring-offset-2',
                )}
              />
            ))}
          </div>
        </div>

        {/* What it will look like on the row, at the size it is read there. */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-studio-muted">Preview</span>

          <span
            className="rounded-[3px] px-1.5 py-px text-[11px] font-medium text-white"
            style={{ backgroundColor: LABEL_COLORS[color] }}
          >
            {text.trim() || 'label'}
          </span>
        </div>
      </div>
    </Modal>
  );
};

/**
 * What the item *is*: the title and the speaker, which the person standing up
 * is shown, and the note and the labels, which are the operator's own — a cue
 * to themselves and a colour to find the row by. Anything meant to be *read* on
 * stage is a stage message, sent deliberately and one at a time.
 *
 * How long it runs is not here: that is `TimerLength`, on the duration itself.
 *
 * The fields write as they are typed, like every other field in the console.
 * There is no Save because there is nothing here that is half-entered — a name
 * is a name the moment it is typed, and the row behind it shows it happening.
 * A label is the exception: it is written in a dialog and lands finished.
 */
export const TimerEditor = ({ timer, onClose }: { timer: StageTimer; onClose: () => void }) => {
  const box = useDismiss(onClose);
  const patch = usePatch(timer);

  // The label being written: an existing one, `'new'` for one that does not
  // exist yet, or nothing at all with the dialog shut.
  const [writing, setWriting] = useState<TimerLabel | 'new' | null>(null);

  return (
    <Panel
      boxRef={box}
      label={`Details for ${timer.name || 'this timer'}`}
      width="w-[min(26rem,calc(100vw-2rem))]"
    >
      <Field label="Title">
        <input
          autoFocus
          value={timer.name}
          onChange={event => patch({ name: event.target.value })}
          placeholder="What this item is"
          className={INPUT}
        />
      </Field>

      <Field label="Speaker">
        <input
          value={timer.speaker}
          onChange={event => patch({ speaker: event.target.value })}
          placeholder="Who is up — shown on the stage"
          className={INPUT}
        />
      </Field>

      <Field label="Notes">
        <textarea
          rows={3}
          value={timer.notes}
          onChange={event => patch({ notes: event.target.value })}
          placeholder="For you, not for the screens"
          className={`${INPUT} resize-y`}
        />
      </Field>

      <Field label="Labels">
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {timer.labels.map(label => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-[4px] py-0.5 pr-1 pl-2 text-xs font-medium
                text-white"
              style={{ backgroundColor: LABEL_COLORS[label.color] }}
            >
              {/* The chip is the way back into it: its words and its colour are
                  written in the same dialog they were made in. */}
              <button type="button" title="Edit this label" onClick={() => setWriting(label)}>
                {label.text}
              </button>

              <button
                type="button"
                aria-label={`Remove the ${label.text} label`}
                onClick={() => patch({ labels: timer.labels.filter(item => item.id !== label.id) })}
                className="text-white/70 hover:text-white"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={() => setWriting('new')}
            className="h-6 rounded-[4px] border border-dashed border-studio-border px-2 text-xs
              text-studio-muted transition-colors duration-150 hover:border-studio-accent/50
              hover:text-studio-text focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            Add label
          </button>
        </div>
      </Field>

      {writing ? (
        <LabelModal
          label={writing === 'new' ? null : writing}
          taken={timer.labels.map(item => item.color)}
          onClose={() => setWriting(null)}
          onSave={({ text, color }) =>
            patch({
              labels:
                writing === 'new'
                  ? [...timer.labels, newLabel({ text, color })]
                  : timer.labels.map(item => (item.id === writing.id ? { ...item, text, color } : item)),
            })
          }
        />
      ) : null}
    </Panel>
  );
};
