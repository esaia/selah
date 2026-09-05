'use client';

import { cn } from '@/lib/cn';

/**
 * The two outputs that carry one language, as columns.
 *
 * The projector stacks everything armed, but the stage display and the lower
 * third each show one — so both are picked from the same list of languages,
 * and nothing can be chosen that the room is not shown. Named once at the head
 * of the list, they cost each row a radio instead of two spelled-out words,
 * and reading down a column answers "what is on the stage screen" at a glance.
 *
 * Shared by the verse languages in the rail and the song's own, which sit in
 * the same slot on different tabs: the column widths below are repeated on
 * every row of both tables and have to agree, which is the whole reason this
 * is one file rather than two.
 */
export const DESTS = [
  { key: 'stage' as const, label: 'Stage', group: 'stage-language', name: 'the stage display' },
  { key: 'lower3rd' as const, label: 'Lower3rd', group: 'stream-language', name: 'the lower third in OBS' },
];

/** The column head. Every width here is repeated on the rows below it. */
export const LangDestHeader = () => (
  <div className="mb-2 flex items-center gap-1 text-[9px] font-semibold text-studio-faint uppercase">
    <span className="w-4" aria-hidden />
    <span className="flex-1" aria-hidden />
    {DESTS.map(({ key, label }) => (
      <span key={key} className="w-11 text-center">
        {label}
      </span>
    ))}
    <span className="w-9 text-center">On</span>
    <span className="w-5" aria-hidden />
  </div>
);

export const LangDestRadio = ({
  dest,
  name,
  label,
  armed,
  chosen,
  onPick,
}: {
  dest: (typeof DESTS)[number];
  /**
   * The radio group. Two tables can be on screen at once — a song's languages
   * in an editor over the rail's — and two groups sharing a name would fight
   * over one pick.
   */
  name: string;
  label: string;
  armed: boolean;
  chosen: boolean;
  onPick: () => void;
}) => {
  const says = `Show ${label} on ${dest.name}`;

  return (
    // The dot is 14px in a column of 44: the label carries the whole cell so the
    // near-miss lands on the pick rather than on nothing.
    <label
      title={says}
      className={cn(
        'flex h-7 w-11 items-center justify-center rounded-studio transition-colors duration-150',
        armed ? 'cursor-pointer hover:bg-studio-surface' : 'cursor-not-allowed',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={chosen}
        disabled={!armed}
        onChange={onPick}
        className={cn('size-3.5 accent-studio-accent', armed ? 'cursor-pointer' : 'cursor-not-allowed opacity-40')}
      />
      <span className="sr-only">{says}</span>
    </label>
  );
};
