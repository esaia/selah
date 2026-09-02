import { NextResponse, type NextRequest } from 'next/server';

import { admin } from '@/lib/supabase/admin';

const UPSTREAM = process.env.BIBLE_API_URL || 'https://holybible.ge/service.php';

/** Params the upstream understands, in a fixed order so the cache key is stable. */
const PARAMS = ['w', 't', 'm', 's', 'mv', 'language', 'page'] as const;

/**
 * Proxy and cache for the scripture API.
 *
 * Two reasons this is server-side. Scripture never changes, so one fetch can
 * serve every operator forever — the cache table is the whole point, and it is
 * also the seam where a full local import later replaces the upstream fetch
 * without any client change. And it keeps the browser off a third-party host
 * that sends `no-cache` and no CORS headers we control.
 */
export const GET = async (request: NextRequest) => {
  const query = new URLSearchParams();
  PARAMS.forEach(name => query.set(name, request.nextUrl.searchParams.get(name) ?? ''));

  const cacheKey = query.toString();

  let db: ReturnType<typeof admin>;

  try {
    db = admin();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const { data: cached } = await db.from('bible_cache').select('payload').eq('cache_key', cacheKey).maybeSingle();

  if (cached) {
    return NextResponse.json(cached.payload, { headers: { 'x-bible-cache': 'HIT' } });
  }

  let payload: unknown;

  try {
    const upstream = await fetch(`${UPSTREAM}?${cacheKey}`, { signal: AbortSignal.timeout(10000) });

    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    payload = await upstream.json();
  } catch {
    return NextResponse.json({ error: 'scripture service unreachable' }, { status: 502 });
  }

  // A failed write is not worth failing the request over — the operator gets
  // their verse and the next reader pays for the fetch again.
  await db.from('bible_cache').upsert({ cache_key: cacheKey, payload });

  return NextResponse.json(payload, { headers: { 'x-bible-cache': 'MISS' } });
};
