'use client';

import { cn } from '@/lib/cn';

export const DESTS = [
  { key: 'stage' as const, label: 'Stage', group: 'stage-language', name: 'the stage display' },
  { key: 'lower3rd' as const, label: 'Lower3rd', group: 'stream-language', name: 'the lower third in your stream' },
];

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
  name: string;
  label: string;
  armed: boolean;
  chosen: boolean;
  onPick: () => void;
}) => {
  const says = `Show ${label} on ${dest.name}`;

  return (
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
