'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';

import { SIGNAL, SLIDE, channelName, type Role, type SignalPayload, type SlidePayload } from './protocol';

export interface LiveChannel {
  peerId: string;
  publishSlide: (payload: SlidePayload) => void;
  sendSignal: (payload: SignalPayload) => void;
  onSlide: (handler: (payload: SlidePayload) => void) => () => void;
  onSignal: (handler: (payload: SignalPayload) => void) => () => void;
  onPresence: (handler: (roles: Record<Role, number>) => void) => () => void;
  close: () => void;
}

const emptyRoles = (): Record<Role, number> => ({ console: 0, show: 0, lower3rd: 0, timer: 0 });

/**
 * Join a session's realtime channel.
 *
 * The channel name carries the session's unguessable output_key, which is what
 * lets an unauthenticated projector or OBS Browser Source join: knowing the URL
 * is the credential, exactly as the old relay room worked.
 *
 * `self: false` means a sender never receives its own broadcast, which is what
 * removes the echo-suppression bookkeeping the relay version needed.
 */
export const newPeerId = () => Math.random().toString(36).slice(2, 10);

export const openLiveChannel = (outputKey: string, role: Role, peerId = newPeerId()): LiveChannel => {
  const slideHandlers = new Set<(payload: SlidePayload) => void>();
  const signalHandlers = new Set<(payload: SignalPayload) => void>();
  const presenceHandlers = new Set<(roles: Record<Role, number>) => void>();

  let channel: RealtimeChannel | null = supabase().channel(channelName(outputKey), {
    config: { broadcast: { self: false }, presence: { key: peerId } },
  });

  const emitPresence = () => {
    if (!channel) return;

    const roles = emptyRoles();

    Object.values(channel.presenceState<{ role: Role }>()).forEach(entries =>
      entries.forEach(entry => {
        if (entry.role in roles) roles[entry.role] += 1;
      }),
    );

    presenceHandlers.forEach(handler => handler(roles));
  };

  channel
    .on('broadcast', { event: SLIDE }, ({ payload }) =>
      slideHandlers.forEach(handler => handler(payload as SlidePayload)),
    )
    .on('broadcast', { event: SIGNAL }, ({ payload }) =>
      signalHandlers.forEach(handler => handler(payload as SignalPayload)),
    )
    .on('presence', { event: 'sync' }, emitPresence)
    .subscribe(status => {
      if (status === 'SUBSCRIBED') void channel?.track({ role });
    });

  const send = (event: string, payload: unknown) => {
    void channel?.send({ type: 'broadcast', event, payload });
  };

  const listen = <T>(set: Set<T>, handler: T) => {
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  };

  return {
    peerId,
    publishSlide: payload => send(SLIDE, payload),
    sendSignal: payload => send(SIGNAL, payload),
    onSlide: handler => listen(slideHandlers, handler),
    onSignal: handler => listen(signalHandlers, handler),
    onPresence: handler => {
      const off = listen(presenceHandlers, handler);
      emitPresence();
      return off;
    },
    close: () => {
      const closing = channel;
      channel = null;
      if (closing) void supabase().removeChannel(closing);
      slideHandlers.clear();
      signalHandlers.clear();
      presenceHandlers.clear();
    },
  };
};
