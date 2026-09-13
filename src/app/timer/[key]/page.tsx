import { redirect } from 'next/navigation';

export const metadata = { title: 'Stage', robots: { index: false } };

export default async function TimerPage({ params }: PageProps<'/timer/[key]'>) {
  const { key } = await params;

  redirect(`/stage/${key}`);
}
