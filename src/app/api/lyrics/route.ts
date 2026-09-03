import { NextResponse, type NextRequest } from 'next/server';

const LYRICS = process.env.LYRICS_API_URL || 'https://api.lyrics.ovh';

/**
 * The words for one track the operator picked out of `/api/lyrics/search`.
 *
 * Both names are passed through as the catalogue spelled them — the service
 * matches on the pair, so a helpfully "tidied" artist is a miss. A miss is
 * common and not an error worth dressing up: plenty of tracks the catalogue
 * knows have no lyrics on file, and the honest answer is a 404 the panel can
 * say out loud.
 *
 * Nothing is cached. Unlike scripture, a lyric sheet is fetched once per song a
 * church ever adds, and the song itself lands in `songs` straight after.
 */
export const GET = async (request: NextRequest) => {
  const artist = request.nextUrl.searchParams.get('artist')?.trim() ?? '';
  const title = request.nextUrl.searchParams.get('title')?.trim() ?? '';

  if (!artist || !title) {
    return NextResponse.json({ error: 'an artist and a title are required' }, { status: 400 });
  }

  const missing = NextResponse.json({ error: 'no lyrics found for that song' }, { status: 404 });

  let lyrics: string;

  try {
    const upstream = await fetch(
      `${LYRICS}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(10000) },
    );

    if (upstream.status === 404) return missing;

    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    lyrics = ((await upstream.json()) as { lyrics?: string }).lyrics ?? '';
  } catch {
    return NextResponse.json({ error: 'the lyrics service is unreachable' }, { status: 502 });
  }

  if (!lyrics.trim()) return missing;

  return NextResponse.json({ lyrics }, { headers: { 'cache-control': 'no-store' } });
};
