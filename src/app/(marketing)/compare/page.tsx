import Link from 'next/link';

import { CompareMatrix, type CompareColumn, type CompareGroup } from '@/components/marketing/CompareMatrix';
import { ConsoleDemo } from '@/components/marketing/ConsoleDemo';
import { Marker } from '@/components/marketing/Marker';
import { Monitor } from '@/components/marketing/Monitor';
import { plansFor, type Plan, type PlanId } from '@/lib/billing/plans';
import { claimedSpots } from '@/lib/billing/seats';
import { findUseCase, LIVE_SEARCH_DEMO } from '@/lib/marketing/useCases';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const OURS = 'LlamaPresenter';

const TITLE = 'Church Presentation Software Compared | LlamaPresenter';

const DESCRIPTION =
  'ProPresenter, EasyWorship, FreeShow, Proclaim and LlamaPresenter side by side: platform, price, Bible '
  + 'languages, projector, stage, livestream, templates and remote control in one table.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/compare' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/compare',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const CHECKED = 'September 2026';

const COLUMNS: CompareColumn[] = [
  { name: OURS, ours: true },
  { name: 'ProPresenter', href: '/propresenter-alternative' },
  { name: 'EasyWorship', href: '/easyworship-alternative' },
  { name: 'FreeShow', href: '/freeshow-alternative' },
  { name: 'Proclaim', href: '/proclaim-alternative' },
];

const groups = (PLANS: Record<PlanId, Plan>): CompareGroup[] => [
  {
    title: 'Where it runs',
    rows: [
      { label: 'Runs in a browser', cells: [true, false, false, false, false] },
      {
        label: 'Platforms',
        cells: [
          'Any browser, Mac and Windows soon', 'Mac, Windows', 'Mac, Windows', 'Windows, Mac, Linux', 'Mac, Windows',
        ],
      },
      { label: 'Presents with no internet', cells: [{ soon: 'Soon' }, true, true, true, true] },
      { label: 'Open source', cells: [false, false, false, true, false] },
    ],
  },
  {
    title: 'Getting started',
    rows: [
      {
        label: 'Learning curve',
        cells: ['Simple and intuitive', 'Complex', 'Moderate', 'Moderate', 'Moderate'],
      },
    ],
  },
  {
    title: 'What it costs',
    rows: [
      {
        label: 'Price to start',
        cells: ['Freemium', '$29/mo a seat', 'From $17.50/mo', 'Free', 'From $24.99/mo'],
      },
      { label: 'Free plan with no time limit', cells: [true, false, false, true, false] },
      {
        label: 'One price covers the team',
        cells: [true, 'Per seat', 'Campus licence', true, true],
      },
      {
        label: 'Paid plan',
        cells: [`${PLANS.pro.price} ${PLANS.pro.cadence}`, 'Subscription', 'Subscription', '—', 'Subscription'],
      },
    ],
  },
  {
    title: 'Scripture',
    rows: [
      { label: 'Bible built in', cells: [true, true, true, true, true] },
      {
        label: 'Two languages on one verse',
        cells: [true, 'Theme with two text boxes', 'By hand, per slide', null, 'By hand, per slide'],
      },
      {
        label: 'Each screen picks its languages',
        cells: [true, 'One slide, every screen', 'One slide, every screen', 'One slide, every screen',
          'One slide, every screen'],
      },
      {
        label: 'Add your own translation',
        cells: [true, 'Import or buy a module', 'From the built-in library', 'Import an XML Bible',
          'From the Logos library'],
      },
    ],
  },
  {
    title: 'The screens',
    rows: [
      { label: 'Projector output', cells: [true, true, true, true, true] },
      { label: 'Stage or confidence display', cells: [true, true, true, true, true] },
      { label: 'Livestream graphics', cells: [true, true, true, true, true] },
      { label: 'Stage timer', cells: [true, true, true, true, true] },
      { label: 'Remote control', cells: ['Any browser', 'App', 'App', 'App', 'App'] },
    ],
  },
  {
    title: 'Songs and media',
    rows: [
      { label: 'Song lyrics', cells: [true, true, true, true, true] },
      {
        label: 'Two languages in a song',
        cells: [true, 'Typed into the slide', 'Typed into the slide', 'Typed into the slide',
          'Typed into the slide'],
      },
      { label: 'CCLI SongSelect built in', cells: [false, true, true, null, true] },
      { label: 'Your own backgrounds and music', cells: [true, true, true, true, true] },
      { label: 'Stock media included', cells: [false, false, 'On Premium', false, true] },
    ],
  },
];

const PAGES = [
  {
    href: '/propresenter-alternative',
    title: 'vs ProPresenter',
    body: 'The large desktop presenter, licensed by the seat.',
  },
  {
    href: '/easyworship-alternative',
    title: 'vs EasyWorship',
    body: 'Long-established, installed, and sold as a subscription.',
  },
  {
    href: '/freeshow-alternative',
    title: 'vs FreeShow',
    body: 'Free and open source, and the other free column here.',
  },
  {
    href: '/proclaim-alternative',
    title: 'vs Proclaim',
    body: "Logos's cloud plan, presented from an installed app.",
  },
  {
    href: '/stagetimer-alternative',
    title: 'vs StageTimer',
    body: 'Not a presenter at all: the church stage timer on its own.',
  },
  {
    href: '/propresenter-vs-easyworship',
    title: 'ProPresenter vs EasyWorship',
    body: 'The two of them against each other, with us as the third column.',
  },
];

export const revalidate = 60;

export default async function ComparePage() {
  const PLANS = plansFor(await claimedSpots());
  const GROUPS = groups(PLANS);
  const video = findUseCase('multilingual-church-services')?.video;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">Comparison</p>

        <div className="mt-5 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-14">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
              Church presentation software,{' '}
              <Marker>side by side</Marker>
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[54ch] text-lg leading-relaxed text-site-muted">
              ProPresenter, EasyWorship, FreeShow, Proclaim and {OURS}, on one grid: what each one runs on, what it
              costs to start, what it does with a second language in a verse and in a song, and which screens it
              can drive.
            </p>
          </div>

          <Monitor
            src="/images/console-verses.webp"
            alt="The console on a desk monitor: Philippians 1 broken into verse cards with one of them live, and
              the projector preview carrying that verse"
            aspect="2000/1063"
            sizes="(min-width: 1024px) 40rem, 100vw"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <CompareMatrix columns={COLUMNS} groups={GROUPS} />

        <p className="mt-6 text-[15px] leading-relaxed text-site-muted">
          We are one of the columns. The others are what each maker published about their own product, read in
          {' '}{CHECKED}, and a dash is a square we could not confirm rather than a no.
        </p>
      </section>

      {video ? <ConsoleDemo video={video} band={false} /> : null}
      <ConsoleDemo video={LIVE_SEARCH_DEMO} />

      <section className="border-t border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>One at a time</h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
            A grid is a summary. Each of these pages makes the case in sentences, including where the other product
            is the better choice.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PAGES.map(page => (
              <Link
                key={page.href}
                href={page.href}
                className="group rounded-studio-lg border border-site-rule bg-site-bg p-6 transition-colors
                  duration-150 hover:border-site-ink/25"
              >
                <h3 className={`${DISPLAY} flex items-center gap-2 text-xl`}>
                  {page.title}
                  <span aria-hidden className="text-site-faint transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{page.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-studio-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-valera text-3xl leading-[1.1] tracking-tight text-studio-text sm:text-4xl">
              Try the column on the left
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              Bible verses, lyrics, screens, livestream and stage timer in one browser tab, on a free plan that is
              not a countdown.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3">
            <Link
              href="/login"
              className="rounded-studio bg-studio-accent px-6 py-3 font-medium text-studio-onaccent
                transition-colors duration-150 hover:bg-studio-accent/85"
            >
              Start for free
            </Link>

            <p className="text-sm text-studio-muted">No credit card required</p>
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-7xl px-6 pt-10 pb-12 text-sm leading-relaxed text-site-faint">
        ProPresenter is a trademark of Renewed Vision, LLC. EasyWorship is a trademark of Softouch Development, Inc.
        Proclaim and Logos are trademarks of Faithlife Corporation. FreeShow is an open-source project owned by its
        authors. {OURS} is not affiliated with, endorsed by or sponsored by any of them, and their names are used
        here only to say which products we are comparing ourselves with.
      </p>
    </main>
  );
}
