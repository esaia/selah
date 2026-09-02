'use client';

import { useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';

import { openLiveChannel } from '@/lib/live/channel';
import type { SlidePayload } from '@/lib/live/protocol';
import { asTimerState, withSkew, type TimerState } from '@/lib/timer/model';

import { TimerScreen } from './TimerScreen';

/**
 * The timer's own output: a confidence monitor for whoever is on stage.
 *
 * Kept apart from `/show` on purpose — a countdown belongs to the speaker and
 * the congregation is meant to be reading the verse — though the console can
 * arm it onto the projector as well, for the countdown before a service when
 * the clock *is* the point.
 *
 * Nothing ticks over the channel. The payload says when the run started; this
 * page counts the seconds itself, which is what keeps a screen on a slow
 * connection from drifting.
 */
export const TimerOutput = ({ outputKey, initial }: { outputKey: string; initial: TimerState }) => {
  const [state, setState] = useState<TimerState>(initial);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const channel = openLiveChannel(outputKey, 'timer');

    const off = channel.onSlide((payload: SlidePayload) => setState(withSkew(asTimerState(payload.timer))));

    return () => {
      off();
      channel.close();
    };
  }, [outputKey]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener('fullscreenchange', onChange);

    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <div className="relative h-dvh w-full bg-black">
      <div className="h-full w-full px-[4vw] py-[5vh]">
        <TimerScreen state={state} />
      </div>

      {!fullscreen ? (
        <button
          type="button"
          title="Fullscreen"
          aria-label="Fullscreen"
          onClick={() => void document.documentElement.requestFullscreen()}
          className="absolute right-4 bottom-4 rounded-studio p-3 text-white/25 transition-colors duration-150
            hover:bg-white/10 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Maximize2 className="size-5" />
        </button>
      ) : null}
    </div>
  );
};
