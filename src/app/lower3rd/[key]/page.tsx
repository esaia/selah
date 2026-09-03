import { notFound } from 'next/navigation';

import { LowerThird, type LowerThirdInitial } from '@/components/projector/LowerThird';
import { admin } from '@/lib/supabase/admin';
import { emptyShowData, type ShowData, type StreamStyle } from '@/lib/types';

export const metadata = { title: 'Lower third', robots: { index: false } };

/** The OBS overlay, addressed by the same session key as the projector. */
export default async function LowerThirdPage({ params }: PageProps<'/lower3rd/[key]'>) {
  const { key } = await params;

  const db = admin();
  const { data: session } = await db.from('sessions').select('id').eq('output_key', key).maybeSingle();

  if (!session) notFound();

  const { data: state } = await db
    .from('session_state')
    .select('show_data, stream_style, card')
    .eq('session_id', session.id)
    .maybeSingle();

  const initial: LowerThirdInitial = {
    showData: (state?.show_data as ShowData) ?? emptyShowData(),
    style: (state?.stream_style as Partial<StreamStyle>) ?? {},
    // A card that was live when this overlay opened. Read raw: the hold
    // arithmetic and the clock correction belong to the component.
    card: state?.card ?? null,
  };

  return <LowerThird outputKey={key} initial={initial} />;
}
