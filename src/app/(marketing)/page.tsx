import Link from 'next/link';

const STEPS = [
  {
    title: 'Bring up the passage',
    body: 'Type “John 3:16-18” and it is on screen. Every verse of the chapter is already loaded, so stepping through costs nothing.',
  },
  {
    title: 'Three languages, one slide',
    body: 'Georgian, English and Russian stacked in whatever order your congregation reads them. Psalm numbering is reconciled for you.',
  },
  {
    title: 'Send it anywhere in the room',
    body: 'The projector machine and your OBS lower third open a link. No installs, no cables, no second copy of the app.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="py-24">
        <p className="text-brand-400 text-xs tracking-[0.25em] uppercase">For the person at the back of the room</p>

        <h1 className="mt-6 max-w-2xl text-5xl leading-[1.05] text-balance">
          Scripture on the screen, without the scramble.
        </h1>

        <p className="text-ink-300 mt-6 max-w-xl text-lg">
          Selah is the console churches use to put verses and song lyrics on a projector and a livestream — in
          Georgian, English and Russian, at the same time.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/login"
            className="bg-brand-500 text-ink-950 hover:bg-brand-400 rounded-lg px-5 py-3 text-sm font-medium transition"
          >
            Start free
          </Link>
          <Link href="/pricing" className="text-ink-300 hover:text-white text-sm transition">
            See what Pro adds →
          </Link>
        </div>
      </section>

      <section className="border-ink-850 grid gap-px border-t pb-24 sm:grid-cols-3">
        {STEPS.map(step => (
          <div key={step.title} className="pt-10 sm:pr-8">
            <h2 className="text-lg">{step.title}</h2>
            <p className="text-ink-500 mt-3 text-sm leading-relaxed">{step.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
