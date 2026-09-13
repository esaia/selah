import { notFound } from 'next/navigation';

import { Projector, type ProjectorInitial } from '@/components/projector/Projector';
import { asBlackout } from '@/lib/live/blackout';
import { admin } from '@/lib/supabase/admin';
import { asTimerState } from '@/lib/timer/model';
import { emptyShowData, type ProjectorStyle, type ShowData } from '@/lib/types';

export const metadata = { title: 'Projector', robots: { index: false } };

export default async function ShowPage({ params }: PageProps<'/show/[key]'>) {
  const { key } = await params;

  const db = admin();
  const { data: session } = await db.from('sessions').select('id').eq('output_key', key).maybeSingle();

  if (!session) notFound();

  const { data: state } = await db
    .from('session_state')
    .select('show_data, projector, timer, blackout')
    .eq('session_id', session.id)
    .maybeSingle();

  const initial: ProjectorInitial = {
    showData: (state?.show_data as ShowData) ?? emptyShowData(),
    projector: (state?.projector as Partial<ProjectorStyle>) ?? {},
    timer: asTimerState(state?.timer),
    black: asBlackout(state?.blackout).audience,
  };

  return <Projector outputKey={key} initial={initial} />;
}
