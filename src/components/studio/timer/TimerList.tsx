'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as MouseEvent_, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

import { SortHandle } from '@/components/studio/shared/SortHandle';
import { TimerEditor, TimerLength } from '@/components/studio/timer/TimerEditor';
import { LIFTED_SLOT, useSortable, type Sortable } from '@/components/studio/shared/sortable';
import {
  LABEL_COLORS,
  armTimer,
  cloneTimer,
  formatDuration,
  insertTimer,
  newTimer,
  removeTimer,
  reorderTimers,
  resetRun,
  startRun,
  toggleRun,
  type StageTimer,
  type TimerState,
} from '@/lib/timer/model';

const Number = ({
  value,
  label,
  onOpen,
}: {
  value: string;
  label: string;
  onOpen: () => void;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={event => {
      event.stopPropagation();
      onOpen();
    }}
    className={cn(
      'h-8 w-[76px] shrink-0 rounded-studio text-center text-sm font-semibold tabular-nums',
      'underline decoration-dashed decoration-from-font underline-offset-4 transition-colors duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      'text-studio-text decoration-studio-border hover:text-studio-accent',
    )}
  >
    {value}
  </button>
);

const MenuItem = ({
  icon,
  label,
  tone = 'plain',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone?: 'plain' | 'danger';
  onClick: (event: MouseEvent_) => void;
}) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors',
      'duration-150 focus:outline-none',
      tone === 'danger'
        ? 'text-studio-danger hover:bg-studio-danger/15 focus-visible:bg-studio-danger/15'
        : 'text-studio-text hover:bg-studio-surface focus-visible:bg-studio-surface',
    )}
  >
    {icon}
    {label}
  </button>
);

const RowMenu = ({ timer }: { timer: StageTimer }) => {
  const { updateTimer } = useStudio();

  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const [above, setAbove] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const panel = menu.current;
      const anchor = box.current?.getBoundingClientRect();

      if (!panel || !anchor) return;

      const under = window.innerHeight - anchor.bottom;

      setAbove(under < panel.offsetHeight + 8 && anchor.top > under);
    };

    place();

    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const act = (change: (state: TimerState) => TimerState) => (event: MouseEvent_) => {
    event.stopPropagation();
    updateTimer(change);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <IconButton
        label="More for this timer"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(open && 'bg-studio-surface text-studio-text')}
        onClick={event => {
          event.stopPropagation();
          setOpen(current => !current);
        }}
      >
        <MoreHorizontal className="size-3.5" />
      </IconButton>

      {open ? (
        <div
          ref={menu}
          role="menu"
          className={cn(
            `absolute right-0 z-30 min-w-[148px] overflow-hidden rounded-studio border border-studio-border
             bg-studio-bg py-1 shadow-studio-panel`,
            above ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          <MenuItem
            icon={<ArrowUp className="size-3.5 text-studio-muted" />}
            label="Add above"
            onClick={act(current => ({
              ...current,
              timers: insertTimer(current.timers, timer.id, 'above'),
            }))}
          />

          <MenuItem
            icon={<ArrowDown className="size-3.5 text-studio-muted" />}
            label="Add below"
            onClick={act(current => ({
              ...current,
              timers: insertTimer(current.timers, timer.id, 'below'),
            }))}
          />

          <span aria-hidden="true" className="my-1 block h-px bg-studio-divider" />

          <MenuItem
            icon={<Copy className="size-3.5 text-studio-muted" />}
            label="Clone"
            onClick={act(current => ({ ...current, timers: cloneTimer(current.timers, timer.id) }))}
          />

          <MenuItem
            icon={<Trash2 className="size-3.5" />}
            label="Delete"
            tone="danger"
            onClick={act(current => {
              const timers = removeTimer(current.timers, timer.id);

              return timers.length
                ? { ...current, timers }
                : { ...resetRun(current), timers: [newTimer({ name: 'Timer 1' })] };
            })}
          />
        </div>
      ) : null}
    </div>
  );
};

const Row = ({
  timer,
  index,
  live,
  sortable,
}: {
  timer: StageTimer;
  index: number;
  live: boolean;
  sortable: Sortable<StageTimer>;
}) => {
  const { timer: state, updateTimer } = useStudio();

  const [editing, setEditing] = useState(false);
  const [timing, setTiming] = useState(false);

  const running = state.activeId === timer.id && state.running;

  const armed = state.activeId === timer.id;

  const played = !live && !armed && timer.id === state.playedId;

  return (
    <li
      {...sortable.row(timer.id)}
      onClick={() => updateTimer(current => armTimer(current, timer.id))}
      className={cn(
        'group relative flex cursor-pointer flex-wrap items-center gap-2 rounded-studio border px-3 py-2.5',
        'transition-colors duration-150',
        'border-studio-border',
        running
          ? 'bg-studio-live/[0.09]'
          : live
            ? 'bg-studio-accent/10'
            : armed
              ? 'bg-studio-accent/[0.055]'
              : played
                ? 'bg-studio-surface'
                : 'bg-studio-bg hover:bg-studio-surface',
        sortable.lifted === timer.id && LIFTED_SLOT,
      )}
    >
      <SortHandle index={index} className="w-4" {...sortable.handle(timer.id)}>
        {played ? <Check className="size-3.5 text-studio-go" /> : index + 1}
      </SortHandle>

      <span className="relative shrink-0">
        {timer.kind === 'clock' ? (
          <button
            type="button"
            title={`What ${timer.name || 'this timer'} counts`}
            onClick={event => {
              event.stopPropagation();
              setTiming(current => !current);
            }}
            className="h-8 w-[76px] rounded-studio text-center text-xs text-studio-muted underline
              decoration-dashed decoration-studio-border decoration-from-font underline-offset-4
              transition-colors duration-150 hover:text-studio-accent focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            clock
          </button>
        ) : (
          <Number
            value={formatDuration(timer.duration)}
            label={`Length of ${timer.name || 'this timer'}`}
            onOpen={() => setTiming(current => !current)}
          />
        )}

        {timing ? <TimerLength timer={timer} onClose={() => setTiming(false)} /> : null}
      </span>

      <span className="relative flex min-w-0 flex-1 items-center gap-1">
        <button
          type="button"
          title={`Title, speaker, notes and labels of ${timer.name || 'this timer'}`}
          onClick={event => {
            event.stopPropagation();
            setEditing(current => !current);
          }}
          className={cn(
            'min-w-0 truncate rounded-studio text-left text-sm font-medium transition-colors duration-150',
            'hover:text-studio-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
            timer.name ? 'text-studio-text' : 'text-studio-faint',
          )}
        >
          {timer.name || 'Untitled'}
        </button>

        <span
          className={cn(
            'shrink-0 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100',
            editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-35',
          )}
        >
          <IconButton
            label="Title, speaker, notes and labels"
            onClick={event => {
              event.stopPropagation();
              setEditing(current => !current);
            }}
          >
            <Pencil className="size-3.5" />
          </IconButton>
        </span>

        {editing ? <TimerEditor timer={timer} onClose={() => setEditing(false)} /> : null}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
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
            running ? 'bg-studio-danger hover:bg-[#d94439]' : 'bg-studio-go hover:bg-[#38bd7d]',
          )}
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>

        <RowMenu timer={timer} />
      </div>

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

const Join = ({ timer, linked }: { timer: StageTimer; linked: boolean }) => {
  const { updateTimer } = useStudio();

  return (
    <li className="relative z-10 -my-2 flex h-3">
      <button
        type="button"
        aria-pressed={linked}
        aria-label={linked ? 'Break the link with the timer above' : 'Start this when the timer above runs out'}
        title={
          linked
            ? 'Starts when the one above runs out — click to break the link'
            : 'Start this one when the one above runs out'
        }
        onClick={() =>
          updateTimer(current => ({
            ...current,
            timers: current.timers.map(item => (item.id === timer.id ? { ...item, linked: !linked } : item)),
          }))
        }
        className="group/join flex w-12 items-center pl-[1.55rem] focus:outline-none"
      >
        <span
          className={cn(
            'h-5 w-[6px] rounded-full transition-opacity duration-150',
            'group-hover/join:opacity-100 group-focus-visible/join:opacity-100',
            linked ? 'bg-studio-accent opacity-100' : 'bg-studio-faint/50 opacity-0',
          )}
        />
      </button>
    </li>
  );
};

export const TimerList = () => {
  const { timer, updateTimer } = useStudio();

  const sortable = useSortable(timer.timers, item => item.id, ids =>
    updateTimer(current => ({ ...current, timers: reorderTimers(current.timers, ids) })),
  );

  const [clearing, setClearing] = useState(false);

  return (
    <section className="space-y-2">
      <ul className="space-y-2" {...sortable.list()}>
        {sortable.items.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? <Join timer={item} linked={item.linked} /> : null}

            <Row
              timer={item}
              index={index}
              live={item.id === timer.activeId && timer.onStage}
              sortable={sortable}
            />
          </Fragment>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2">
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

        {timer.timers.length > 1 ? (
          <Button variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setClearing(true)}>
            Delete all timers
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={clearing}
        title="Delete all timers?"
        message={`All ${timer.timers.length} timers and the order they are in are deleted, and the running order starts again with one fresh timer. Nothing on a screen changes until you start it.`}
        confirmLabel="Delete all timers"
        onCancel={() => setClearing(false)}
        onConfirm={() => {
          updateTimer(current => {
            const fresh = newTimer({ name: 'Timer 1' });

            return { ...resetRun(current), timers: [fresh], activeId: fresh.id, playedId: '' };
          });
          setClearing(false);
        }}
      />
    </section>
  );
};
