import Link from 'next/link';

import { LlamaMark } from '@/components/brand/Wordmark';

const STEPS = [
  {
    title: 'Bring up the passage',
    body: 'Type “John 3:16-18” and it is on screen. Every verse of the chapter is already loaded, so stepping through costs nothing.',
  },
  {
    title: 'Three languages, one slide',
    body: 'Up to three languages stacked in whatever order your congregation reads them — Georgian, Russian, Spanish, Greek, Japanese and more. Psalm numbering is reconciled for you.',
  },
  {
    title: 'Send it anywhere in the room',
    body: 'The projector machine and your OBS lower third open a link. No installs, no cables, no second copy of the app.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="relative py-24">
        {/* A single wash of the brand yellow behind the headline, so the page
            opens with the colour rather than only borrowing it for buttons. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-32 -z-10 size-[34rem] rounded-full
            bg-studio-accent/[0.07] blur-3xl"
        />

        <p className="flex items-center gap-2 text-xs tracking-[0.25em] text-studio-accent uppercase">
          <LlamaMark className="size-5" />
          For the person at the back of the room
        </p>

        <h1 className="mt-6 max-w-2xl text-5xl leading-[1.05] text-balance text-studio-text">
          Scripture on the screen, without the scramble.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-studio-muted">
          LlamaPresenter is the console churches use to put verses and song lyrics on a projector and a livestream — in
          three languages, at the same time.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-studio bg-studio-accent px-5 py-3 text-sm font-medium text-studio-onaccent
              transition-colors duration-150 hover:bg-[#ffe97a]"
          >
            Start free
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-studio-muted transition-colors hover:text-studio-text"
          >
            See what Pro adds →
          </Link>
        </div>
      </section>

      <section className="grid gap-px border-t border-studio-divider pb-24 sm:grid-cols-3">
        {STEPS.map(step => (
          <div key={step.title} className="pt-10 sm:pr-8">
            <h2 className="text-lg text-studio-text">{step.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-studio-muted">{step.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
