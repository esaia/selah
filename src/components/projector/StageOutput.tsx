'use client';

import { useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';

import { openLiveChannel } from '@/lib/live/channel';
import type { SlidePayload } from '@/lib/live/protocol';
import { asTimerState, timerIsLive, withSkew, type TimerState } from '@/lib/timer/model';
import { emptyShowData, type ProjectorStyle, type ShowData } from '@/lib/types';

import { StageScreen } from './StageScreen';
import { TimerScreen } from './TimerScreen';

export interface StageInitial {
  showData: ShowData;
  next: ShowData;
  projector: Partial<ProjectorStyle>;
  timer: TimerState;
}

/**
 * The stage display: a confidence monitor for whoever is standing up.
 *
 * Kept apart from `/show` on purpose — the congregation is meant to be reading
 * the verse, not a countdown — though the console can arm the timer onto the
 * projector as well, for the minutes before a service when the clock *is* the
 * point.
 *
 * It has two faces. A run that has been started takes the whole screen, because
 * while a countdown is going it is the only thing being asked for. The rest of
 * the service the screen is far more use showing the slides, which is what it
 * does.
 *
 * Nothing ticks over the channel. The payload says when the run started; this
 * page counts the seconds itself, which is what keeps a screen on a slow
 * connection from drifting.
 */
export const StageOutput = ({ outputKey, initial }: { outputKey: string; initial: StageInitial }) => {
  const [state, setState] = useState<StageInitial>(initial);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const channel = openLiveChannel(outputKey, 'stage');

    const off = channel.onSlide((payload: SlidePayload) =>
      setState({
        showData: payload.showData ?? emptyShowData(),
        next: payload.next ?? emptyShowData(),
        projector: payload.projector,
        timer: withSkew(asTimerState(payload.timer)),
      }),
    );

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
      {timerIsLive(state.timer) ? (
        <TimerScreen state={state.timer} />
      ) : (
        <StageScreen
          showData={state.showData}
          next={state.next}
          projector={state.projector}
          timer={state.timer}
        />
      )}

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
