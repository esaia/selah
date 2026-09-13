'use client';

import { useEffect, useState } from 'react';

import type { SignalTransport } from '@/lib/live/protocol';
import { loadLocalFile, loadReceivedFile, saveReceivedFile } from '@/lib/media/localMedia';
import { requestAsset } from '@/lib/media/peerAssets';
import type { LocalFileMeta } from '@/lib/types';

const resolveFile = async (id: string, transport: SignalTransport | null): Promise<Blob | null> => {
  const own = await loadLocalFile(id).catch(() => null);

  if (own?.file) return own.file;

  const cached = await loadReceivedFile(id).catch(() => null);

  if (cached?.file) return cached.file;

  if (!transport) return null;

  try {
    const received = await requestAsset(id, transport);

    await saveReceivedFile(received as never).catch(() => {});

    return received.file;
  } catch {
    return null;
  }
};

export const useLocalBackground = (meta: LocalFileMeta | null, transport: SignalTransport | null) => {
  const [url, setUrl] = useState('');
  const id = meta?.id ?? null;

  useEffect(() => {
    if (!id) return;

    let objectUrl = '';
    let cancelled = false;

    void resolveFile(id, transport).then(file => {
      if (cancelled || !file) return;

      objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl('');
    };
  }, [id, transport]);

  return id ? url : '';
};

export const useLocalFiles = (metas: LocalFileMeta[], transport: SignalTransport | null) => {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const key = [...new Set(metas.map(meta => meta.id))].sort().join(',');

  useEffect(() => {
    if (!key) return;

    const ids = key.split(',');

    let cancelled = false;
    const made: string[] = [];

    void Promise.all(
      ids.map(async id => {
        const file = await resolveFile(id, transport);

        if (cancelled || !file) return;

        const url = URL.createObjectURL(file);

        made.push(url);
        setUrls(current => ({ ...current, [id]: url }));
      }),
    );

    return () => {
      cancelled = true;
      made.forEach(URL.revokeObjectURL);
      setUrls({});
    };
  }, [key, transport]);

  return urls;
};
