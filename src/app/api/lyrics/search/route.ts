import { NextResponse, type NextRequest } from 'next/server';

import { searchLyrics } from '@/lib/lyrics/providers';

/**
 * Candidates for a song the operator only knows by name.
 *
 * Four sources answer at once and their results are shown together, each
 * wearing the name of where it came from — the same shape FreeShow settled on,
 * for the same reason: the hymn a small church sings and the song on the radio
 * are almost never in the same place, and asking the operator to pick a source
 * before they have seen what is in it is asking them to guess.
 *
 * The catalogues are read from here rather than from the browser: none of them
 * sends CORS headers, and none of them wants to hear from a hundred consoles
 * with a hundred different stories about what they are.
 */
export const GET = async (request: NextRequest) => {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!query) return NextResponse.json({ error: 'a search term is required' }, { status: 400 });

  const hits = await searchLyrics(query);

  // A song is on more than one of these — the same words, filed twice — and the
  // operator only needs to be offered it once per source.
  const seen = new Set<string>();

  const results = hits
    .filter(hit => hit.title.trim())
    .map(hit => ({ id: `${hit.source}:${hit.key}`, ...hit }))
    .filter(hit => {
      const key = `${hit.source}|${hit.artist}|${hit.title}`.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);

      return true;
    });

  return NextResponse.json({ results }, { headers: { 'cache-control': 'no-store' } });
};
