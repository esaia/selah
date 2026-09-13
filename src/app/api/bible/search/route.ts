import { NextResponse, type NextRequest } from 'next/server';

import { customIdOf } from '@/lib/bible/custom';
import { MIN_SEARCH_LENGTH, SEARCH_LIMIT, type VerseHit } from '@/lib/bible/search';
import { admin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const GET = async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;

  const lang = params.get('language') ?? '';
  const version = params.get('mv') ?? '';
  const query = (params.get('q') ?? '').trim();
  const book = Number(params.get('w')) || null;

  if (!lang || !version) {
    return NextResponse.json({ error: 'a language and a translation are required' }, { status: 400 });
  }

  if (query.length < MIN_SEARCH_LENGTH) {
    return NextResponse.json({ error: `type at least ${MIN_SEARCH_LENGTH} characters` }, { status: 400 });
  }

  const uploaded = customIdOf(version);

  let data;
  let error;

  try {
    ({ data, error } = uploaded
      ? await (await createClient()).rpc('bible_custom_search', {
          p_translation: uploaded,
          p_query: query,
          p_book: book,
          p_limit: SEARCH_LIMIT,
        })
      : await admin().rpc('bible_search', {
          p_lang: lang,
          p_version: version,
          p_query: query,
          p_book: book,
          p_limit: SEARCH_LIMIT,
        }));
  } catch (thrown) {
    return NextResponse.json({ error: (thrown as Error).message }, { status: 500 });
  }

  if (error) {
    return NextResponse.json({ error: 'could not search the scripture library' }, { status: 500 });
  }

  return NextResponse.json(
    { results: (data ?? []) as VerseHit[] },
    { headers: { 'cache-control': `${uploaded ? 'private' : 'public'}, max-age=3600` } },
  );
};
