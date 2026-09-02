'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import {
  LABEL_COLORS,
  formatDuration,
  newLabel,
  parseDuration,
  type LabelColor,
  type StageTimer,
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

const COLORS = Object.keys(LABEL_COLORS) as LabelColor[];

/** The next tint round the ring, so a second label never looks like the first. */
const after = (color: LabelColor): LabelColor => COLORS[(COLORS.indexOf(color) + 1) % COLORS.length];

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
 * Everything about one item in the running order that does not fit on its row.
 *
 * Two of these fields go to the screens and two do not, which is the whole
 * shape of the panel: the title and the speaker are what the person standing
 * up is shown, and the note and the labels are the operator's own — a cue to
 * themselves and a colour to find the row by. Anything meant to be *read* on
 * stage is a stage message, sent deliberately and one at a time.
 *
 * It hangs off the pencil that opened it rather than taking the middle of the
 * screen: what is being edited is one row of a list the operator is reading
 * down, and a centred dialog puts the answer somewhere other than the question.
 *
 * It writes as it is typed, like every other field in the console. There is no
 * Save because there is nothing here that is half-entered: a name is a name the
 * moment it is typed, and the row behind it shows it happening.
 */
export const TimerEditor = ({ timer, onClose }: { timer: StageTimer; onClose: () => void }) => {
  const { updateTimer } = useStudio();

  const box = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState('');

  // Clicking away is how a panel like this is dismissed — there is nothing to
  // confirm — so Escape and a click outside do the same thing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    // The panel *and* the button it hangs from: the anchor is its parent, and
    // counting a click on the pencil as "outside" would close the panel on the
    // way down and let the button's own toggle reopen it on the way up.
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

  const patch = (fields: Partial<StageTimer>) =>
    updateTimer(current => ({
      ...current,
      timers: current.timers.map(item => (item.id === timer.id ? { ...item, ...fields } : item)),
    }));

  const addLabel = () => {
    const text = adding.trim();

    setAdding('');

    if (!text) return;

    const last = timer.labels[timer.labels.length - 1];

    patch({ labels: [...timer.labels, newLabel({ text, color: last ? after(last.color) : 'amber' })] });
  };

  return (
    // The row it belongs to is clickable — that is how a timer is armed — so
    // nothing that happens inside the panel is allowed to reach it.
    <div
      ref={box}
      role="dialog"
      aria-label={`Details for ${timer.name}`}
      onClick={event => event.stopPropagation()}
      className="absolute top-full left-0 z-40 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-studio-lg border
        border-studio-border bg-white p-3 shadow-studio-modal"
    >
      {/* The point of the panel: it is attached to the pencil that opened it. */}
      <span
        aria-hidden="true"
        className="absolute -top-[5px] left-2.5 size-2 rotate-45 border-t border-l border-studio-border bg-white"
      />

      <div className="space-y-2">
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

        {/* A clock reads the hour, so there is nothing to set; and a wrap-up is
            a countdown's own — a count-up counts away from a start rather than
            towards a deadline anyone is watching. */}
        {timer.kind === 'clock' ? null : (
          <Field label="Length">
            <div className="flex items-center gap-2">
              <DurationInput
                value={timer.duration}
                label="How long this item runs"
                className="w-[88px]"
                onCommit={duration => patch({ duration })}
              />

              {timer.kind === 'countdown' ? (
                <>
                  <span className="text-xs text-studio-muted">wrap-up at</span>

                  <DurationInput
                    value={timer.wrapUp}
                    label="Wrap-up warning — the digits turn amber with this much left"
                    className="w-[88px] border-amber-300 text-amber-600"
                    onCommit={wrapUp => patch({ wrapUp })}
                  />
                </>
              ) : null}
            </div>
          </Field>
        )}

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
                {/* The text is the colour control: a swatch of its own would be
                    a second thing to aim at on a chip this size. */}
                <button type="button" title="Change the colour" onClick={() =>
                  patch({
                    labels: timer.labels.map(item =>
                      item.id === label.id ? { ...item, color: after(item.color) } : item,
                    ),
                  })
                }>
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

            <input
              value={adding}
              onChange={event => setAdding(event.target.value)}
              onBlur={addLabel}
              onKeyDown={event => {
                if (event.key === 'Enter') addLabel();

                if (event.key === 'Escape') setAdding('');
              }}
              placeholder="Add label"
              aria-label="Add a label"
              className="h-6 w-24 rounded-[4px] border border-dashed border-studio-border px-2 text-xs
                text-studio-text transition-colors duration-150 focus:outline-none focus-visible:ring-2
                focus-visible:ring-studio-accent/40"
            />
          </div>
        </Field>
      </div>
    </div>
  );
};
