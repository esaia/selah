'use client';

import type { CSSProperties } from 'react';
import { Pause, Play, Repeat, Repeat1, Volume2, VolumeX, X } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';
import { Marquee } from '@/components/ui/Marquee';
import { cn } from '@/lib/cn';
import { useAudio, type Repeat as RepeatMode } from '@/lib/studio/AudioProvider';

/** What the button is about to do, said the way an operator would ask for it. */
const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: 'Play once — click to play the library through',
  all: 'Playing the library through — click to repeat this track',
  one: 'Repeating this track — click to play it once',
};

const clock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const total = Math.floor(seconds);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Transport for whatever is playing, kept mounted on every tab so a bed can be
 * faded or stopped without leaving the passage the operator is presenting.
 */
export const AudioBar = () => {
  const {
    current,
    playing,
    position,
    duration,
    volume,
    repeat,
    muted,
    togglePlay,
    stop,
    seek,
    setVolume,
    cycleRepeat,
    toggleMute,
  } = useAudio();

  if (!current) return null;

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-t border-studio-border bg-studio-bg px-3 sm:gap-3 sm:px-4">
      <IconButton label={playing ? 'Fade out' : 'Play'} onClick={togglePlay}>
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </IconButton>

      <div className="hidden w-40 shrink-0 sm:block">
        <Marquee text={current.title} className="text-xs font-medium text-studio-text" />
        <p className="truncate text-[11px] text-studio-faint">{current.artist}</p>
      </div>

      <span className="w-9 shrink-0 text-right text-[11px] text-studio-muted tabular-nums">{clock(position)}</span>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.5}
        value={Math.min(position, duration || 0)}
        aria-label="Seek"
        disabled={!duration}
        onChange={event => seek(Number(event.target.value))}
        style={{ '--range-fill': `${duration ? (Math.min(position, duration) / duration) * 100 : 0}%` } as CSSProperties}
        className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border
          disabled:cursor-default"
      />

      <span className="w-9 shrink-0 text-[11px] text-studio-muted tabular-nums">{clock(duration)}</span>

      {/* One button through three states rather than two controls: what is to
          happen at the end of a track is a single question, and the icon
          answers it — a loop with a 1 on it is the one place a player has ever
          put "this track again". */}
      <button
        type="button"
        aria-pressed={repeat !== 'off'}
        aria-label={REPEAT_LABEL[repeat]}
        title={REPEAT_LABEL[repeat]}
        onClick={cycleRepeat}
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-studio transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
          repeat === 'off'
            ? 'text-studio-muted hover:bg-studio-surface hover:text-studio-text'
            : 'bg-studio-accent text-studio-onaccent',
        )}
      >
        {repeat === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
      </button>

      <span className="hidden shrink-0 items-center gap-1.5 md:flex">
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute' : 'Mute'}
          title={muted ? 'Unmute' : 'Mute'}
          className={cn(
            'transition-colors duration-150',
            muted ? 'text-studio-danger' : 'text-studio-faint hover:text-studio-text',
          )}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        {/* The slider reads what is coming out, so muted it reads zero rather
            than leaving the handle parked at the old level on an empty track —
            which says the sound is set to 80 and looks broken.

            The two ends work the way every other player's do: dragging to zero
            mutes, and moving off zero unmutes to wherever it was dropped.
            Dragging to zero deliberately does not write a volume of 0 — mute
            rides on the element, so the level behind it survives and unmuting
            comes back to it. */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={muted ? 0 : Math.round(volume * 100)}
          aria-label="Volume"
          aria-valuetext={muted ? 'Muted' : `${Math.round(volume * 100)} percent`}
          title={muted ? 'Muted — drag to unmute' : `Volume ${Math.round(volume * 100)}`}
          onChange={event => {
            const next = Number(event.target.value);

            if (next === 0) {
              if (!muted) toggleMute();

              return;
            }

            setVolume(next / 100);

            if (muted) toggleMute();
          }}
          style={{ '--range-fill': `${muted ? 0 : Math.round(volume * 100)}%` } as CSSProperties}
          className="studio-range h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-studio-border"
        />

        {/* The number, not just the handle: a level is something an operator
            sets back to what it was last week, and reads out to the desk.

            It reads what is coming out, so it agrees with the handle beside it
            — muted, both say zero. The level behind the mute is not shown at
            all: a number disagreeing with the handle was the confusing part,
            and unmuting still comes back to it. Dimmed while muted, never
            struck through — at this size a strikethrough stopped it reading as
            a number. Wide enough for three digits: 100 is a level like any
            other. */}
        <span
          className={cn(
            'w-7 shrink-0 text-right text-[11px] tabular-nums',
            muted ? 'text-studio-faint' : 'text-studio-muted',
          )}
        >
          {muted ? 0 : Math.round(volume * 100)}
        </span>
      </span>

      <IconButton label="Stop and clear" onClick={stop}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
};
