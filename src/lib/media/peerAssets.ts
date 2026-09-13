
import type { SignalTransport } from '@/lib/live/protocol';
import type { LocalFileMeta } from '@/lib/types';

import type { LocalFile } from './localMedia';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const CHUNK = 16 * 1024;

const BUFFER_HIGH = 512 * 1024;

const TIMEOUT_MS = 25000;

export type ReceivedFile = LocalFileMeta & { file: Blob };

const peerConnection = () => new RTCPeerConnection({ iceServers: ICE_SERVERS });

const drain = (channel: RTCDataChannel) =>
  new Promise<void>(resolve => {
    channel.bufferedAmountLowThreshold = BUFFER_HIGH / 2;

    const done = () => {
      channel.removeEventListener('bufferedamountlow', done);
      resolve();
    };

    channel.addEventListener('bufferedamountlow', done);
  });

const sendFile = async (channel: RTCDataChannel, record: LocalFile) => {
  const buffer = await record.file.arrayBuffer();

  channel.send(
    JSON.stringify({ meta: { id: record.id, name: record.name, type: record.type, size: buffer.byteLength } }),
  );

  for (let offset = 0; offset < buffer.byteLength; offset += CHUNK) {
    if (channel.readyState !== 'open') return;

    if (channel.bufferedAmount > BUFFER_HIGH) {
      await drain(channel);
    }

    channel.send(buffer.slice(offset, offset + CHUNK));
  }

  if (channel.readyState === 'open') {
    channel.send(JSON.stringify({ done: record.id }));
  }
};

export const serveAssets = (
  resolve: (id: string) => Promise<LocalFile | null | undefined>,
  transport: SignalTransport,
) => {
  const sessions = new Map<string, { pc: RTCPeerConnection; pending: RTCIceCandidateInit[] }>();

  const close = (session: string) => {
    const open = sessions.get(session);

    if (open) {
      try {
        open.pc.close();
      } catch {
      }

      sessions.delete(session);
    }
  };

  const wire = (channel: RTCDataChannel) => {
    channel.binaryType = 'arraybuffer';

    channel.onmessage = async event => {
      let request: { req?: string };

      try {
        request = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (!request?.req) return;

      let record: LocalFile | null | undefined;

      try {
        record = await resolve(request.req);
      } catch {
        record = null;
      }

      if (channel.readyState !== 'open') return;

      if (!record?.file) {
        channel.send(JSON.stringify({ error: 'not here', id: request.req }));
        return;
      }

      try {
        await sendFile(channel, record);
      } catch {
        if (channel.readyState === 'open') {
          channel.send(JSON.stringify({ error: 'could not read the file', id: request.req }));
        }
      }
    };
  };

  const off = transport.subscribe(async payload => {
    if (payload?.from !== 'show' || !payload.session) return;

    const { session } = payload;

    if (payload.offer) {
      if (sessions.has(session)) return;

      const pc = peerConnection();
      sessions.set(session, { pc, pending: [] });

      pc.onicecandidate = event => {
        if (event.candidate) {
          transport.send({ session, from: 'console', host: transport.peerId, candidate: event.candidate.toJSON() });
        }
      };

      pc.ondatachannel = event => wire(event.channel);

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) close(session);
      };

      try {
        await pc.setRemoteDescription(payload.offer);
        await pc.setLocalDescription(await pc.createAnswer());

        transport.send({ session, from: 'console', host: transport.peerId, answer: pc.localDescription! });

        const open = sessions.get(session);

        if (open) {
          open.pending.forEach(candidate => pc.addIceCandidate(candidate).catch(() => {}));
          open.pending = [];
        }
      } catch {
        close(session);
      }

      return;
    }

    if (payload.candidate) {
      const open = sessions.get(session);

      if (!open) return;

      if (open.pc.remoteDescription && open.pc.localDescription) {
        open.pc.addIceCandidate(payload.candidate).catch(() => {});
      } else {
        open.pending.push(payload.candidate);
      }
    }
  });

  return () => {
    [...sessions.keys()].forEach(close);
    off();
  };
};

export const requestAsset = (
  id: string,
  transport: SignalTransport,
  { timeout = TIMEOUT_MS }: { timeout?: number } = {},
) =>
  new Promise<ReceivedFile>((resolve, reject) => {
    const session = `${transport.peerId}-${Math.random().toString(36).slice(2, 8)}`;
    const pc = peerConnection();
    const channel = pc.createDataChannel('assets');

    channel.binaryType = 'arraybuffer';

    let host: string | undefined;
    let meta: LocalFileMeta | null = null;
    let pending: RTCIceCandidateInit[] = [];
    const chunks: ArrayBuffer[] = [];
    let settled = false;

    const finish = (error: Error | null, value?: ReceivedFile) => {
      if (settled) return;

      settled = true;
      clearTimeout(timer);
      off();

      try {
        pc.close();
      } catch {
      }

      if (error) reject(error);
      else resolve(value!);
    };

    const timer = setTimeout(() => finish(new Error('no console answered')), timeout);

    pc.onicecandidate = event => {
      if (event.candidate) {
        transport.send({ session, from: 'show', candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') finish(new Error('could not reach the console'));
    };

    channel.onopen = () => channel.send(JSON.stringify({ req: id }));

    channel.onmessage = event => {
      if (typeof event.data !== 'string') {
        chunks.push(event.data as ArrayBuffer);
        return;
      }

      let message: { error?: string; meta?: LocalFileMeta; done?: string };

      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.error) {
        finish(new Error(message.error));
        return;
      }

      if (message.meta) {
        meta = message.meta;
        return;
      }

      if (message.done) {
        finish(null, { ...(meta as LocalFileMeta), file: new Blob(chunks, { type: meta?.type || 'image/jpeg' }) });
      }
    };

    const off = transport.subscribe(payload => {
      if (payload?.from !== 'console' || payload.session !== session) return;

      if (payload.answer) {
        if (host) return;

        host = payload.host;

        pc.setRemoteDescription(payload.answer)
          .then(() => {
            pending.forEach(candidate => pc.addIceCandidate(candidate).catch(() => {}));
            pending = [];
          })
          .catch(() => finish(new Error('handshake failed')));

        return;
      }

      if (payload.candidate) {
        if (host && payload.host !== host) return;

        if (pc.remoteDescription) {
          pc.addIceCandidate(payload.candidate).catch(() => {});
        } else {
          pending.push(payload.candidate);
        }
      }
    });

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => transport.send({ session, from: 'show', offer: pc.localDescription! }))
      .catch(() => finish(new Error('could not open a connection')));
  });
