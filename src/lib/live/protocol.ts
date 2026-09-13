import type { Blackout } from '@/lib/live/blackout';
import type { CardRun } from '@/lib/lower3rd/card';
import type { TimerState } from '@/lib/timer/model';
import type { Lang, ProjectorStyle, ShowData, StreamStyle } from '@/lib/types';

export type Role = 'console' | 'show' | 'lower3rd' | 'stage';

export const channelName = (outputKey: string) => `live:${outputKey}`;

export const SLIDE = 'slide';
export const SIGNAL = 'signal';

export interface SlidePayload {
  showData: ShowData;
  next: ShowData;
  style: StreamStyle;
  projector: ProjectorStyle;
  streamLang: Lang;
  stageLang: Lang;
  timer: TimerState;
  card: CardRun | null;
  blackout: Blackout;
}

export interface SignalPayload {
  session: string;
  from: 'show' | 'console';
  host?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface SignalTransport {
  peerId: string;
  send: (payload: SignalPayload) => void;
  subscribe: (handler: (payload: SignalPayload) => void) => () => void;
}
