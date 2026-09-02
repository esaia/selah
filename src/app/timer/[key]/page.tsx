import { redirect } from 'next/navigation';

export const metadata = { title: 'Stage', robots: { index: false } };

/**
 * Where the timer output used to live.
 *
 * The screen grew into a stage display and moved to `/stage`, but the old
 * address is saved in a browser on a machine at the front of a hall, and
 * finding out mid-service is not the moment.
 */
export default async function TimerPage({ params }: PageProps<'/timer/[key]'>) {
  const { key } = await params;

  redirect(`/stage/${key}`);
}
