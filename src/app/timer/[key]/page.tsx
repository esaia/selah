import { notFound } from 'next/navigation';

import { TimerOutput } from '@/components/projector/TimerOutput';
import { admin } from '@/lib/supabase/admin';
import { asTimerState } from '@/lib/timer/model';

export const metadata = { title: 'Timer', robots: { index: false } };

/**
 * The stage timer output, addressed by the same session key as the projector.
 *
 * Rendered from the stored run so a monitor switched on mid-service shows the
 * countdown already in progress, rather than a black screen until the operator
 * next touches something.
 */
export default async function TimerPage({ params }: PageProps<'/timer/[key]'>) {
  const { key } = await params;

  const db = admin();
  const { data: session } = await db.from('sessions').select('id').eq('output_key', key).maybeSingle();

  if (!session) notFound();

  const { data: state } = await db.from('session_state').select('timer').eq('session_id', session.id).maybeSingle();

  return <TimerOutput outputKey={key} initial={asTimerState(state?.timer)} />;
}
