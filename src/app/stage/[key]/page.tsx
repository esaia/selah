import { notFound } from 'next/navigation';

import { StageOutput, type StageInitial } from '@/components/projector/StageOutput';
import { admin } from '@/lib/supabase/admin';
import { asTimerState } from '@/lib/timer/model';
import { emptyShowData, type ProjectorStyle, type ShowData } from '@/lib/types';

export const metadata = { title: 'Stage', robots: { index: false } };

/**
 * The stage display, addressed by the same session key as the projector.
 *
 * Rendered from the stored row so a monitor switched on mid-service already
 * shows the slide, what is coming and the run in progress, rather than a black
 * screen until the operator next touches something.
 */
export default async function StagePage({ params }: PageProps<'/stage/[key]'>) {
  const { key } = await params;

  const db = admin();
  const { data: session } = await db.from('sessions').select('id').eq('output_key', key).maybeSingle();

  if (!session) notFound();

  const { data: state } = await db
    .from('session_state')
    .select('show_data, next_show_data, projector, timer')
    .eq('session_id', session.id)
    .maybeSingle();

  const initial: StageInitial = {
    showData: (state?.show_data as ShowData) ?? emptyShowData(),
    next: (state?.next_show_data as ShowData) ?? emptyShowData(),
    projector: (state?.projector as Partial<ProjectorStyle>) ?? {},
    timer: asTimerState(state?.timer),
  };

  return <StageOutput outputKey={key} initial={initial} />;
}
