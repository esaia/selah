import { notFound } from 'next/navigation';

import { LowerThird, type LowerThirdInitial } from '@/components/projector/LowerThird';
import { admin } from '@/lib/supabase/admin';
import type { ShowData, StreamStyle } from '@/lib/types';

export const metadata = { title: 'Lower third', robots: { index: false } };

/** The OBS overlay, addressed by the same session key as the projector. */
export default async function LowerThirdPage({ params }: PageProps<'/lower3rd/[key]'>) {
  const { key } = await params;

  const db = admin();
  const { data: session } = await db.from('sessions').select('id').eq('output_key', key).maybeSingle();

  if (!session) notFound();

  const { data: state } = await db
    .from('session_state')
    .select('show_data, stream_style')
    .eq('session_id', session.id)
    .maybeSingle();

  const initial: LowerThirdInitial = {
    showData: (state?.show_data as ShowData) ?? { geo: [], eng: [], rus: [] },
    style: (state?.stream_style as Partial<StreamStyle>) ?? {},
  };

  return <LowerThird outputKey={key} initial={initial} />;
}
