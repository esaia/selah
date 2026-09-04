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

import { SortHandle } from './SortHandle';
import { TimerEditor, TimerLength } from './TimerEditor';
import { LIFTED_SLOT, useSortable, type Sortable } from './sortable';
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

/**
 * A figure on a row: read here, edited in the panel behind the pencil.
 *
 * A button rather than a span, because it does something — and dashed under the
 * digits, which is how a value you may click has been drawn since long before
 * any of this.
 */
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

/** One line of the row menu. */
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

/**
 * Everything else the row can have done to it: another timer either side of it,
 * a copy of it, or the end of it.
 *
 * One button rather than four. A running order is read far more often than it
 * is rearranged, and a rail of icons on every line turned the column into a
 * control panel — the operator lost the times and titles in it. The one button
 * stays out on every row: something that appears under the pointer has to be
 * found before it can be used, which is the wrong game to play mid-service.
 */
const RowMenu = ({ timer }: { timer: StageTimer }) => {
  const { updateTimer } = useStudio();

  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Which side of the button it hangs from. Under it by default, over it for
  // the last rows of a long running order, where a menu opening downwards runs
  // off the bottom of the console and the operator has to scroll to answer it.
  // Measured before the browser paints, so it never opens down and jumps.
  const [above, setAbove] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const panel = menu.current;
      const anchor = box.current?.getBoundingClientRect();

      if (!panel || !anchor) return;

      const under = window.innerHeight - anchor.bottom;

      // Only flips when the other side is genuinely roomier: squeezed both
      // ways, hanging down is the arrangement the operator expects.
      setAbove(under < panel.offsetHeight + 8 && anchor.top > under);
    };

    place();

    window.addEventListener('resize', place);
    // Captured, so the menu follows a scroll of the list it is in and not only
    // one of the window.
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
        // Hung off the right edge: the menu is at the end of the row, and one
        // opening leftwards would run off the panel on a narrow console.
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

              // The last one is never removed outright: a console with no timer
              // has nothing to put on screen. It is emptied back to a fresh one.
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

  // The transport icon follows the run rather than the highlight — they part
  // company for a timer armed but not up — and Clear stops the run, so a row
  // that has gone quiet offers play again.
  const running = state.activeId === timer.id && state.running;

  // Armed: the one the transport is pointed at, whether or not it is on a
  // screen. It is what pressing play will start, so the list says so.
  const armed = state.activeId === timer.id;

  // The last item a run was actually started on. Not the armed one — arming the
  // next thing does not undo having given this one — and never both at once.
  const played = !live && !armed && timer.id === state.playedId;

  return (
    <li
      {...sortable.row(timer.id)}
      onClick={() => updateTimer(current => armTimer(current, timer.id))}
      className={cn(
        'group relative flex cursor-pointer flex-wrap items-center gap-2 rounded-studio border px-3 py-2.5',
        'transition-colors duration-150',
        // Three states, each a flat fill: the row is a block of colour that can
        // be picked out of the column at a glance, rather than a wash that
        // fades out halfway across and leaves the far half looking ordinary.
        // Up on a screen is the loud one, armed is the same colour held back,
        // and given-already is a flat grey with a tick.
        // The fill does all of it. Every row keeps the same quiet border, so
        // the column reads as one list and the colour is the only thing that
        // moves down it as the service goes.
        //
        // Red is the clock actually running — the console's live colour, the
        // same one the outputs wear when they are on air. Blue is the pointer:
        // armed, or up on a screen, but not counting. So the operator can see
        // from the far side of the room whether time is passing.
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
        // Last, so the empty berth wins over whatever the row was wearing. The
        // browser snapshots the ghost before this paints, so it lands on the
        // slot the row is holding open rather than on the one in the air.
        sortable.lifted === timer.id && LIFTED_SLOT,
      )}
    >
      {/* The place in the order, until this is the row that was last given —
          then the tick takes the slot, which is the mark the stage's agenda
          wears for the same timer. Either way it is also the grip: the running
          order is dragged by the number it is read by. */}
      <SortHandle index={index} className="w-4" {...sortable.handle(timer.id)}>
        {played ? <Check className="size-3.5 text-studio-go" /> : index + 1}
      </SortHandle>

      {/* Read on the row, set in a panel of its own under it — a field here
          meant the running order was half a form: boxes to tab through on every
          line of a list that is mostly read. The length has its own panel
          rather than sharing the title's, because "give them five more" is one
          click on the number, not a hunt through a form for it. */}
      <span className="relative shrink-0">
        {/* A clock has no length to read, but the cell still opens the panel:
            it is where what a timer counts is chosen, and a clock set by
            mistake would otherwise have no way back. */}
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

      {/* The title is read here and written in the panel behind it, which is
          where the rest of what it says lives: a field in the row invited the
          operator to type a name in one place and everything else about the
          same item in another. The words themselves open that panel — the
          pencil is the hint, not the only way in, the same as the times. */}
      {/* The panel hangs off this cell rather than off the pencil inside it.
          The pencil sits at the end of the title, so it moves as the title is
          typed — and a panel anchored to it slid along under the cursor with
          every keystroke. The cell's own left edge does not move. */}
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

        {/* Absent until the row is under the pointer, faint even then, and
            full strength only when it is the pencil itself being aimed at — a
            running order at rest reads as titles and times rather than a
            column of pencils. */}
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

/**
 * The join between one item and the next: with it made, the second starts the
 * moment the first runs out.
 *
 * It is part of the gap rather than a control parked in it: the patch of the
 * strip the bar itself sits in takes the click, and the link only draws — a
 * short bar bridging the two rows, the way a chain link reads — once the
 * pointer is over that patch or the join has actually been made. Reaching
 * across the whole width meant a pointer merely on its way between two rows lit
 * a link it was not aiming at, tooltip and all. A running order at rest is rows
 * and nothing between them.
 *
 * The link belongs to the *second* of the pair — "I follow that" — so moving or
 * deleting the row above cannot leave a timer promising to start something that
 * is no longer there.
 */
const Join = ({ timer, linked }: { timer: StageTimer; linked: boolean }) => {
  const { updateTimer } = useStudio();

  return (
    // Pulled into the space the list already leaves between rows, so making a
    // link does not push the running order about — and lifted above them,
    // because the rows are positioned to carry their own rail and would
    // otherwise paint over the ends of a bar that is taller than the gap.
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

/** The running order: every timer the service needs, in the order it needs them. */
export const TimerList = () => {
  const { timer, updateTimer } = useStudio();

  // Reordered by id rather than by the slots the rows were dragged through: the
  // running order can have been rewritten by another console mid-drag. Breaking
  // the joins the move falsified is part of the reorder, so it lives with it.
  const sortable = useSortable(timer.timers, item => item.id, ids =>
    updateTimer(current => ({ ...current, timers: reorderTimers(current.timers, ids) })),
  );

  const [clearing, setClearing] = useState(false);

  return (
    <section className="space-y-2">
      {/* The gaps between the rows belong to the list, and a release in one of
          them is still a release on the order the drag arrived at. */}
      <ul className="space-y-2" {...sortable.list()}>
        {sortable.items.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? <Join timer={item} linked={item.linked} /> : null}

            {/* Live means on a screen, not merely armed: cleared, the running
                order goes quiet and nothing in it claims to be up, which is the
                whole point of having pressed Clear. */}
            <Row
              timer={item}
              index={index}
              live={item.id === timer.activeId && timer.onStage}
              sortable={sortable}
            />
          </Fragment>
        ))}
      </ul>

      {/* Add on the left where the list ends, clear away on the right at arm's
          length from it: the two are not a pair, and a running order emptied by
          a mis-aimed click in the middle of a service is not recoverable. */}
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
          // Back to the state a new console opens in: one timer, armed, with
          // nothing running — not an empty list, which has nothing to show.
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
