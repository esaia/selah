import { NextResponse, type NextRequest } from 'next/server';

import { admin } from '@/lib/supabase/admin';

const UPSTREAM = process.env.BIBLE_API_URL || 'https://holybible.ge/service.php';

/** Params the upstream understands, in a fixed order so the cache key is stable. */
const PARAMS = ['w', 't', 'm', 's', 'mv', 'language', 'page'] as const;

/** A chapter as `bible_text` holds it: `[[muxli, bv], …]`. */
type StoredVerses = [number, string][];

/**
 * A stored chapter, in the shape the client reads.
 *
 * Only two fields of an upstream response are ever read: `bibleData`, and
 * `tavi[0].cc` for the chapter count. The book names and the translation list
 * that ride along with every upstream chapter moved into `lib/bible/languages.ts`
 * long ago, which is why they are not stored and not rebuilt here.
 */
const chapterOf = (row: { wigni: number; chapters: number; verses: unknown }, chapter: string) => ({
  bibleData: (row.verses as StoredVerses).map(([muxli, bv]) => ({
    bv,
    wigni: row.wigni,
    tavi: chapter,
    muxli,
  })),
  tavi: [{ cc: row.chapters }],
});

/**
 * Scripture: the local copy first, then the response cache, then upstream.
 *
 * `bible_text` is our own copy of the corpus and answers almost everything —
 * see the migration for why it is one row per chapter. `bible_cache` behind it
 * holds whole upstream responses and covers whatever the copy does not have:
 * a translation added upstream since the last mirror run, or a request made
 * with no translation named. Only past both of those does a service touch a
 * third party at all.
 *
 * That ordering is the point of the route existing. Scripture never changes, so
 * one fetch can serve every operator forever, and a projector in a hall is not
 * waiting on a shared PHP host it has no relationship with.
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

  // The copy is keyed by the request's own four fields. A request that names no
  // translation is not one of them — upstream picks a default we would only be
  // guessing at — so it falls through to the cache and the proxy, as it always did.
  const lang = query.get('language') ?? '';
  const version = query.get('mv') ?? '';
  const book = Number(query.get('w'));
  const chapter = Number(query.get('t'));

  if (lang && version && book && chapter) {
    const { data: stored } = await db
      .from('bible_text')
      .select('wigni, chapters, verses')
      .eq('lang', lang)
      .eq('version', version)
      .eq('book', book)
      .eq('chapter', chapter)
      .maybeSingle();

    if (stored) {
      return NextResponse.json(chapterOf(stored, String(chapter)), { headers: { 'x-bible-source': 'local' } });
    }
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
