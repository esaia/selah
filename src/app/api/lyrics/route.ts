import { NextResponse, type NextRequest } from 'next/server';

import { fetchLyrics, isSource, keyIsSound } from '@/lib/lyrics/providers';

/**
 * The words for one candidate the operator picked out of `/api/lyrics/search`.
 *
 * The pair that comes back is the source and its own key for the song, passed
 * through untouched: every source addresses its songs differently, and asking
 * one of them for a title and an artist is how a search misses. The key is
 * checked against the host that issued it before anything is fetched — it has
 * been through the browser, so it is an address this server is being asked to
 * open rather than one it chose.
 *
 * A miss is common and not an error worth dressing up: plenty of what these
 * catalogues list has no words on file, and the honest answer is a 404 the
 * panel can say out loud.
 *
 * Nothing is cached. Unlike scripture, a lyric sheet is fetched once per song a
 * church ever adds, and the song itself lands in `songs` straight after.
 */
export const GET = async (request: NextRequest) => {
  const source = request.nextUrl.searchParams.get('source') ?? '';
  const key = request.nextUrl.searchParams.get('key')?.trim() ?? '';

  if (!isSource(source) || !key) {
    return NextResponse.json({ error: 'a source and a song are required' }, { status: 400 });
  }

  if (!keyIsSound(source, key)) {
    return NextResponse.json({ error: 'that song does not belong to that source' }, { status: 400 });
  }

  const missing = NextResponse.json({ error: `${source} has no words for that one` }, { status: 404 });

  let lyrics: string;

  try {
    lyrics = await fetchLyrics(source, key);
  } catch {
    return NextResponse.json({ error: `${source} could not be reached` }, { status: 502 });
  }

  if (!lyrics.trim()) return missing;

  return NextResponse.json({ lyrics }, { headers: { 'cache-control': 'no-store' } });
};
