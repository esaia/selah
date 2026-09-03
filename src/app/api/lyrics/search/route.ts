import { NextResponse, type NextRequest } from 'next/server';

const CATALOGUE = process.env.DEEZER_API_URL || 'https://api.deezer.com';

/** As much of a Deezer track as the picker shows. */
interface Track {
  id: number;
  title: string;
  title_short?: string;
  artist?: { name?: string };
  album?: { cover_small?: string };
}

/**
 * Candidates for a song the operator only knows by name.
 *
 * The catalogue and the words come from two different services, and this is the
 * first half: a title in, a shortlist of artist-and-title pairs out. The second
 * half (`/api/lyrics`) needs both halves of that pair spelled the way the
 * catalogue spells them, which is the whole reason this step exists rather than
 * asking the operator to type an artist. The short title is the one that
 * travels: a lyric sheet is filed under "Way Maker", never "Way Maker (Live)".
 *
 * Coverage is commercial music. A song the local church wrote is not in here,
 * and that is what ProPresenter import and the built-in library are for.
 */
export const GET = async (request: NextRequest) => {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!query) return NextResponse.json({ error: 'a search term is required' }, { status: 400 });

  let payload: { data?: Track[] };

  try {
    const upstream = await fetch(`${CATALOGUE}/search?q=${encodeURIComponent(query)}&limit=12`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    payload = (await upstream.json()) as { data?: Track[] };
  } catch {
    return NextResponse.json({ error: 'the lyrics service is unreachable' }, { status: 502 });
  }

  // A popular song is in the catalogue a dozen times over — live, radio edit,
  // every compilation it ever appeared on — and all of them share one lyric
  // sheet. The operator should see the song once.
  const seen = new Set<string>();

  const results = (payload.data ?? [])
    .filter(track => track.artist?.name)
    .map(track => ({
      id: String(track.id),
      title: track.title_short || track.title,
      artist: track.artist?.name ?? '',
      cover: track.album?.cover_small ?? '',
    }))
    .filter(result => {
      const key = `${result.artist}|${result.title}`.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);

      return true;
    });

  return NextResponse.json({ results }, { headers: { 'cache-control': 'no-store' } });
};
