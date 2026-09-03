'use client';

import { Fragment, useState } from 'react';
import { Check, Pause, Pencil, Play, Plus, RotateCcw, StickyNote, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

import { SortHandle } from './SortHandle';
import { TimerEditor } from './TimerEditor';
import { useSortable, type Sortable } from './sortable';
import {
  LABEL_COLORS,
  TIMER_KINDS,
  armTimer,
  formatDuration,
  newTimer,
  resetRun,
  startRun,
  toggleRun,
  type StageTimer,
  type TimerKind,
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
  tone = 'plain',
  onOpen,
}: {
  value: string;
  label: string;
  tone?: 'plain' | 'warn';
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
      tone === 'warn'
        ? 'text-amber-600 decoration-amber-300 hover:text-amber-700'
        : 'text-studio-text decoration-studio-border hover:text-studio-accent',
    )}
  >
    {value}
  </button>
);

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
      {...sortable.row(timer.id)}
      onClick={() => updateTimer(current => armTimer(current, timer.id))}
      className={cn(
        'group flex cursor-pointer flex-wrap items-center gap-2 rounded-studio border px-3 py-2.5',
        'transition-colors duration-150',
        // The browser snapshots the ghost before this paints, so the fade lands
        // on the slot the row is holding open rather than on the one in the air.
        sortable.lifted === timer.id && 'opacity-40',
        live
          ? 'border-studio-accent bg-studio-accent/10'
          : played
            ? 'border-studio-border bg-studio-surface'
            : 'border-studio-border bg-white hover:bg-studio-surface',
      )}
    >
      {/* The place in the order, until this is the row that was last given —
          then the tick takes the slot, which is the mark the stage's agenda
          wears for the same timer. Either way it is also the grip: the running
          order is dragged by the number it is read by. */}
      <SortHandle index={index} className="w-4" {...sortable.handle(timer.id)}>
        {played ? <Check className="size-3.5 text-studio-go" /> : index + 1}
      </SortHandle>

      {/* Read on the row, typed in the panel — the same rule as the title. A
          field here meant the running order was half a form: three boxes to tab
          through on every line of a list that is mostly read, never edited. */}
      {timer.kind === 'clock' ? (
        <span className="flex h-8 w-[76px] items-center justify-center text-xs text-studio-muted">clock</span>
      ) : (
        <Number
          value={formatDuration(timer.duration)}
          label={`Duration of ${timer.name || 'this timer'}`}
          onOpen={() => setEditing(true)}
        />
      )}

      {/* The title is read here and written in the panel behind the pencil,
          which is where the rest of what it says lives: a field in the row
          invited the operator to type a name in one place and everything else
          about the same item in another. */}
      {/* The panel hangs off this cell rather than off the pencil inside it.
          The pencil sits at the end of the title, so it moves as the title is
          typed — and a panel anchored to it slid along under the cursor with
          every keystroke. The cell's own left edge does not move. */}
      <span className="relative flex min-w-0 flex-1 items-center gap-1">
        <span className={cn('truncate text-sm font-medium', timer.name ? 'text-studio-text' : 'text-studio-faint')}>
          {timer.name || 'Untitled'}
        </span>

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
        <Number
          value={formatDuration(timer.wrapUp)}
          label="Wrap-up warning — the digits turn amber with this much left"
          tone="warn"
          onOpen={() => setEditing(true)}
        />
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
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

/**
 * The join between one item and the next: with it made, the second starts the
 * moment the first runs out.
 *
 * It is the gap itself, not a control parked in it. The whole strip between two
 * rows takes the click, and the link only draws — a short bar bridging the two,
 * the way a chain link reads — once the pointer is over that strip or the join
 * has actually been made. A running order at rest is rows and nothing between
 * them.
 *
 * The link belongs to the *second* of the pair — "I follow that" — so moving or
 * deleting the row above cannot leave a timer promising to start something that
 * is no longer there.
 */
const Join = ({ timer, linked }: { timer: StageTimer; linked: boolean }) => {
  const { updateTimer } = useStudio();

  return (
    // Pulled into the space the list already leaves between rows, so making a
    // link does not push the running order about.
    <li className="-my-2 flex h-3">
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
        className="group/join flex flex-1 items-center pl-[1.55rem] focus:outline-none"
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
  // running order can have been rewritten by another console mid-drag.
  const sortable = useSortable(timer.timers, item => item.id, ids =>
    updateTimer(current => {
      const known = new Set(ids);

      return {
        ...current,
        timers: [
          ...ids.map(id => current.timers.find(item => item.id === id)).filter((item): item is StageTimer =>
            Boolean(item),
          ),
          ...current.timers.filter(item => !known.has(item.id)),
        ],
      };
    }),
  );

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
