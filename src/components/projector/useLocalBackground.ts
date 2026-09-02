'use client';

import { useEffect, useState } from 'react';

import type { SignalTransport } from '@/lib/live/protocol';
import { loadLocalFile, loadReceivedFile, saveReceivedFile } from '@/lib/media/localMedia';
import { requestAsset } from '@/lib/media/peerAssets';
import type { LocalFileMeta } from '@/lib/types';

/**
 * Resolve the operator's own background to something this machine can draw.
 *
 * Three places to look, cheapest first: this browser may own the file (the
 * console's own projector tab does), it may have been sent one before, or it
 * has to be pulled from the console over WebRTC. A received copy is cached, so
 * a reload — or a console that has since been shut — does not blank the screen.
 */
export const useLocalBackground = (meta: LocalFileMeta | null, transport: SignalTransport | null) => {
  const [url, setUrl] = useState('');
  const id = meta?.id ?? null;

  useEffect(() => {
    if (!id) return;

    let objectUrl = '';
    let cancelled = false;

    const show = (file: Blob) => {
      if (cancelled) return;

      objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
    };

    const resolve = async () => {
      const own = await loadLocalFile(id).catch(() => null);

      if (own?.file) return show(own.file);

      const cached = await loadReceivedFile(id).catch(() => null);

      if (cached?.file) return show(cached.file);

      if (!transport) return;

      try {
        const received = await requestAsset(id, transport);

        await saveReceivedFile(received as never).catch(() => {});
        show(received.file);
      } catch {
        // Nothing to draw. An empty background reads as the picture arriving
        // late rather than as a broken image.
      }
    };

    void resolve();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl('');
    };
  }, [id, transport]);

  return id ? url : '';
};
