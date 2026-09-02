'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { useStudio } from '@/lib/studio/StudioProvider';
import { LABEL_COLORS, newLabel, type LabelColor, type StageTimer } from '@/lib/timer/model';

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
      className="absolute top-full right-0 z-40 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-studio-lg border
        border-studio-border bg-white p-3 shadow-studio-modal"
    >
      {/* The point of the panel: it is attached to the pencil that opened it. */}
      <span
        aria-hidden="true"
        className="absolute -top-[5px] right-2.5 size-2 rotate-45 border-t border-l border-studio-border bg-white"
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
