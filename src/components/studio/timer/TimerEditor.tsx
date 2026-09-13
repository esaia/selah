'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal, useModalClose } from '@/components/ui/Modal';
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

const maskOf = (input: string) => {
  const digits = input.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(-6);

  if (!digits) return { digits, shown: '', ms: 0 };

  const parts = [];

  for (let at = digits.length; at > 0; at -= 2) parts.unshift(digits.slice(Math.max(0, at - 2), at));

  const [hours, minutes, seconds] = [0, 0, 0, ...parts.map(Number)].slice(-3);

  return {
    digits,
    shown: parts.map((part, at) => (at ? part.padStart(2, '0') : part)).join(':'),
    ms: ((hours * 60 + minutes) * 60 + seconds) * 1000,
  };
};

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
        'h-8 rounded-studio border border-studio-border bg-studio-bg px-2 text-center text-sm font-semibold',
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
  'w-full rounded-studio border border-studio-border bg-studio-bg px-2.5 py-1.5 text-sm text-studio-text ' +
  'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40';

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
    document.addEventListener('mousedown', onDown, true);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [onClose]);

  return box;
};

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
  const [above, setAbove] = useState(false);

  useLayoutEffect(() => {
    const panel = boxRef.current;

    if (!panel) return;

    const place = () => {
      const anchor = panel.parentElement?.getBoundingClientRect();

      if (!anchor) return;

      const under = window.innerHeight - anchor.bottom;
      const over = anchor.top;

      setAbove(under < panel.offsetHeight + 16 && over > under);
    };

    place();

    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [boxRef]);

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label={label}
      onClick={event => event.stopPropagation()}
      className={cn(
        'absolute left-0 z-40 rounded-studio border border-studio-border bg-studio-bg p-3 shadow-studio-modal',
        above ? 'bottom-full mb-2' : 'top-full mt-2',
        width,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-3 size-2 rotate-45 border-studio-border bg-studio-bg',
          above ? '-bottom-[5px] border-r border-b' : '-top-[5px] border-t border-l',
        )}
      />

      <div className="space-y-2">{children}</div>
    </div>
  );
};

const usePatch = (timer: StageTimer) => {
  const { updateTimer } = useStudio();

  return (fields: Partial<StageTimer>) =>
    updateTimer(current => ({
      ...current,
      timers: current.timers.map(item => (item.id === timer.id ? { ...item, ...fields } : item)),
    }));
};

export const TimerLength = ({ timer, onClose }: { timer: StageTimer; onClose: () => void }) => {
  const box = useDismiss(onClose);
  const patch = usePatch(timer);

  return (
    <Panel
      boxRef={box}
      label={`Length of ${timer.name || 'this timer'}`}
      width="w-[min(21rem,calc(100vw-2rem))]"
    >
      <Field label="Counts">
        <Select
          className="w-[140px]"
          value={timer.kind}
          onChange={kind => patch({ kind: kind as TimerKind })}
          options={TIMER_KINDS}
        />
      </Field>

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

      {timer.kind === 'clock' ? null : (
        <>
          <Field label="Wrap-up">
            <DurationInput
              value={timer.wrapUp}
              label="Wrap-up warning — with this much left the digits turn amber"
              className="w-[88px] border-studio-accent/50 text-studio-accent"
              onCommit={wrapUp => patch({ wrapUp })}
            />
          </Field>

          <Field label="Final">
            <DurationInput
              value={timer.finalAt}
              label="The last stretch — with this much left the digits turn red and beat out the seconds"
              className="w-[88px] border-studio-danger/50 text-studio-danger"
              onCommit={finalAt => patch({ finalAt })}
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-studio-text">
            <input
              type="checkbox"
              checked={timer.autoClear}
              onChange={event => patch({ autoClear: event.target.checked })}
              className="mt-px size-3.5 cursor-pointer accent-studio-accent"
            />

            <span>
              Clear when it finishes
              <span className="mt-0.5 block text-[11px] text-studio-faint">
                At zero it comes off the stage and the projector by itself, as Clear timer does.
              </span>
            </span>
          </label>
        </>
      )}
    </Panel>
  );
};

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
  const [text, setText] = useState(label?.text ?? '');
  const [color, setColor] = useState<LabelColor>(
    label?.color ?? COLORS.find(tint => !taken.includes(tint)) ?? 'amber',
  );
  const close = useModalClose();

  const save = () => {
    const trimmed = text.trim();

    if (!trimmed) return;

    close.current?.(() => {
      onSave({ text: trimmed, color });
      onClose();
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeRef={close}
      title={label ? 'Edit label' : 'Add label'}
      width="max-w-sm"
      footer={
        <>
          <Button onClick={() => close.current?.()}>Cancel</Button>
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

export const TimerEditor = ({ timer, onClose }: { timer: StageTimer; onClose: () => void }) => {
  const box = useDismiss(onClose);
  const patch = usePatch(timer);

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
