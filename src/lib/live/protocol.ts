import type { TimerState } from '@/lib/timer/model';
import type { Lang, ProjectorStyle, ShowData, StreamStyle } from '@/lib/types';

/**
 * Who is on a session's channel. The console is the writer; the three output
 * roles are readers. Presence over these replaces the relay's hand-rolled
 * `{ type: 'presence' }` announce, and drives the Devices panel.
 */
export type Role = 'console' | 'show' | 'lower3rd' | 'timer';

export const channelName = (outputKey: string) => `live:${outputKey}`;

/** Broadcast event names. */
export const SLIDE = 'slide';
export const SIGNAL = 'signal';

/**
 * What the outputs render. Style travels with the content because an output
 * page has no account and cannot read the operator's settings row itself.
 */
export interface SlidePayload {
  showData: ShowData;
  style: StreamStyle;
  projector: ProjectorStyle;
  streamLang: Lang;
  /**
   * The stage timer rides with the slide rather than on an event of its own.
   * One payload means one stored row for a late joiner to read, and it is why
   * `/show` can be handed the verse and the countdown in the same message.
   */
  timer: TimerState;
}

/**
 * WebRTC handshake, passed straight through. The channel has no addressing, so
 * `from`, `session` and `host` are the whole filtering scheme: `session` picks
 * out one request, and `host` latches the first console that answered so a
 * second console's candidates are ignored.
 */
export interface SignalPayload {
  session: string;
  from: 'show' | 'console';
  host?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

/** Signalling a peer connection needs, with no idea where it is carried. */
export interface SignalTransport {
  peerId: string;
  send: (payload: SignalPayload) => void;
  subscribe: (handler: (payload: SignalPayload) => void) => () => void;
}
