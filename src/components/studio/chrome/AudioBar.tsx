'use client';

import type { CSSProperties } from 'react';
import { Pause, Play, Repeat, Repeat1, Volume2, VolumeX, X } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';
import { Marquee } from '@/components/ui/Marquee';
import { cn } from '@/lib/cn';
import { useAudio, type Repeat as RepeatMode } from '@/lib/studio/AudioProvider';

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
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-studio-border bg-studio-bg
        px-3 py-2 sm:h-12 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-0"
    >
      <IconButton label={playing ? 'Fade out' : 'Play'} onClick={togglePlay}>
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </IconButton>

      <div className="order-first w-full min-w-0 sm:order-none sm:w-40 sm:shrink-0">
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
        className="studio-range h-1.5 min-w-16 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border
          disabled:cursor-default"
      />

      <span className="w-9 shrink-0 text-[11px] text-studio-muted tabular-nums">{clock(duration)}</span>

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
