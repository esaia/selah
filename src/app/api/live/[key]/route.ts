import { NextResponse } from 'next/server';

import { admin } from '@/lib/supabase/admin';
import { emptyShowData, REQUIRED_LANG } from '@/lib/types';

export const GET = async (_request: Request, { params }: RouteContext<'/api/live/[key]'>) => {
  const { key } = await params;

  if (!/^[a-z0-9]{16,64}$/.test(key)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const db = admin();

  const { data: session } = await db.from('sessions').select('id, name').eq('output_key', key).maybeSingle();

  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: state } = await db
    .from('session_state')
    .select('show_data, next_show_data, projector, stream_style, stream_lang, stage_lang, timer, card')
    .eq('session_id', session.id)
    .maybeSingle();

  return NextResponse.json(
    {
      name: session.name,
      showData: state?.show_data ?? emptyShowData(),
      next: state?.next_show_data ?? emptyShowData(),
      projector: state?.projector ?? {},
      style: state?.stream_style ?? {},
      streamLang: state?.stream_lang ?? REQUIRED_LANG,
      stageLang: state?.stage_lang ?? REQUIRED_LANG,
      timer: state?.timer ?? {},
      card: state?.card ?? null,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
};
