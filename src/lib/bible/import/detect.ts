import { rootOf, scanXml } from '@/lib/bible/import/xml';
import type { BibleFormat } from '@/lib/bible/import/types';

export const detectFormat = (source: string): BibleFormat | null => {
  const root = rootOf(source);

  if (root === 'xmlbible' || root === 'x') return 'zefania';
  if (root === 'usx') return 'usx';
  if (root === 'osis' || root === 'osistext') return 'osis';
  if (root !== 'bible' && root !== 'bibletext') return null;

  for (const event of scanXml(source)) {
    if (event.kind !== 'open') continue;
    if (event.name !== 'b' && event.name !== 'book') continue;

    const named = event.attrs.n ?? event.attrs.number ?? event.attrs.name ?? '';

    return /^\d+$/.test(named.trim()) ? 'beblia' : 'opensong';
  }

  return 'opensong';
};
