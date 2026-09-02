import { NextResponse } from 'next/server';

import { admin } from '@/lib/supabase/admin';

/**
 * What a session is showing right now, for an output page that has just opened.
 *
 * The projector and the OBS overlay have no account: knowing the session's
 * unguessable output_key is what authorises them, so this runs with the service
 * role and looks the session up by that key alone. It is read-only, and returns
 * nothing but the current slide and the look it should be drawn in.
 */
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
    .select('show_data, next_show_data, projector, stream_style, stream_lang, timer')
    .eq('session_id', session.id)
    .maybeSingle();

  return NextResponse.json(
    {
      name: session.name,
      showData: state?.show_data ?? { geo: [], eng: [], rus: [] },
      next: state?.next_show_data ?? { geo: [], eng: [], rus: [] },
      projector: state?.projector ?? {},
      style: state?.stream_style ?? {},
      streamLang: state?.stream_lang ?? 'geo',
      timer: state?.timer ?? {},
    },
    { headers: { 'cache-control': 'no-store' } },
  );
};
