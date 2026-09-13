import { NextResponse, type NextRequest } from 'next/server';

import { searchLyrics } from '@/lib/lyrics/providers';

export const GET = async (request: NextRequest) => {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!query) return NextResponse.json({ error: 'a search term is required' }, { status: 400 });

  const hits = await searchLyrics(query);

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
