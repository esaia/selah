import { NextResponse, type NextRequest } from 'next/server';

import { customIdOf } from '@/lib/bible/custom';
import { admin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type StoredVerses = [number, string][];

const chapterOf = (row: { wigni: number; chapters: number; verses: unknown }, chapter: number) => ({
  bibleData: (row.verses as StoredVerses).map(([muxli, bv]) => ({
    bv,
    wigni: row.wigni,
    tavi: String(chapter),
    muxli,
  })),
  tavi: [{ cc: row.chapters }],
});

const readOurs = async (lang: string, version: string, book: number, chapter: number) => {
  const db = admin();

  return db
    .from('bible_text')
    .select('wigni, chapters, verses')
    .eq('lang', lang)
    .eq('version', version)
    .eq('book', book)
    .eq('chapter', chapter)
    .maybeSingle();
};

export const GET = async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;

  const lang = params.get('language') ?? '';
  const version = params.get('mv') ?? '';
  const book = Number(params.get('w'));
  const chapter = Number(params.get('t'));

  if (!lang || !version || !book || !chapter) {
    return NextResponse.json({ error: 'a language, a translation, a book and a chapter are required' }, { status: 400 });
  }

  const uploaded = customIdOf(version);

  let found;

  try {
    found = uploaded
      ? await (await createClient())
          .from('bible_translation_text')
          .select('wigni, chapters, verses')
          .eq('translation_id', uploaded)
          .eq('book', book)
          .eq('chapter', chapter)
          .maybeSingle()
      : await readOurs(lang, version, book, chapter);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  if (found.error) {
    return NextResponse.json({ error: 'could not read the scripture library' }, { status: 500 });
  }

  const stored = found.data;

  if (!stored) {
    return NextResponse.json(
      { error: uploaded ? 'that uploaded translation is not there' : `${version} (${lang}) is not in the scripture library` },
      { status: 404 },
    );
  }

  return NextResponse.json(chapterOf(stored, chapter), {
    headers: {
      'cache-control': `${uploaded ? 'private' : 'public'}, max-age=31536000, immutable`,
    },
  });
};
