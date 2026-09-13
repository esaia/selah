'use client';

import { useEffect, useState } from 'react';

import { asBlackout } from '@/lib/live/blackout';
import { openLiveChannel } from '@/lib/live/channel';
import type { SlidePayload } from '@/lib/live/protocol';
import { asTimerState, timerIsLive, withSkew, type TimerState } from '@/lib/timer/model';
import { emptyShowData, type Lang, type ProjectorStyle, type ShowData } from '@/lib/types';

import { OutputChrome } from './OutputChrome';
import { StageScreen } from './StageScreen';
import { TimerScreen } from './TimerScreen';
import { useCustomLangs } from './useCustomLangs';

export interface StageInitial {
  showData: ShowData;
  next: ShowData;
  projector: Partial<ProjectorStyle>;
  stageLang?: Lang;
  timer: TimerState;
  black: boolean;
}

export const StageOutput = ({ outputKey, initial }: { outputKey: string; initial: StageInitial }) => {
  const [state, setState] = useState<StageInitial>(initial);

  useCustomLangs(state.projector.langs);

  useEffect(() => {
    const channel = openLiveChannel(outputKey, 'stage');

    const off = channel.onSlide((payload: SlidePayload) =>
      setState({
        showData: payload.showData ?? emptyShowData(),
        next: payload.next ?? emptyShowData(),
        projector: payload.projector,
        stageLang: payload.stageLang,
        timer: withSkew(asTimerState(payload.timer)),
        black: asBlackout(payload.blackout).stage,
      }),
    );

    return () => {
      off();
      channel.close();
    };
  }, [outputKey]);

  return (
    <OutputChrome kind="stage">
      <div className="relative h-dvh w-full bg-black">
        {state.black ? <div className="absolute inset-0 z-20 bg-black" /> : null}

        {timerIsLive(state.timer) ? (
          <TimerScreen state={state.timer} />
        ) : (
          <StageScreen
            showData={state.showData}
            next={state.next}
            projector={state.projector}
            stageLang={state.stageLang}
            timer={state.timer}
          />
        )}
      </div>
    </OutputChrome>
  );
};
