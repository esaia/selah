import { NextResponse, type NextRequest } from 'next/server';

import { fetchLyrics, isSource, keyIsSound } from '@/lib/lyrics/providers';

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
