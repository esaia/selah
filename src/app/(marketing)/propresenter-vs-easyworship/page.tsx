import Link from 'next/link';

import { CompareMatrix, type CompareColumn, type CompareGroup } from '@/components/marketing/CompareMatrix';
import { ConsoleDemo } from '@/components/marketing/ConsoleDemo';
import { Marker } from '@/components/marketing/Marker';
import { plansFor, type Plan, type PlanId } from '@/lib/billing/plans';
import { claimedSpots } from '@/lib/billing/seats';
import { findUseCase, LIVE_SEARCH_DEMO } from '@/lib/marketing/useCases';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const OURS = 'LlamaPresenter';
const A = 'ProPresenter';
const B = 'EasyWorship';

const TITLE = 'ProPresenter vs EasyWorship: Which One for Your Church? | LlamaPresenter';

const DESCRIPTION =
  'ProPresenter vs EasyWorship, side by side: what each costs, what a second screen costs, how each handles two '
  + 'Bible languages, and which one suits your church — from a third option that is neither.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/propresenter-vs-easyworship' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/propresenter-vs-easyworship',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

const CHECKED = 'September 2026';

const COLUMNS: CompareColumn[] = [
  { name: A, href: '/propresenter-alternative' },
  { name: B, href: '/easyworship-alternative' },
  { name: OURS, ours: true },
];

const groups = (PLANS: Record<PlanId, Plan>): CompareGroup[] => [
  {
    title: 'What it costs',
    rows: [
      { label: 'Price to start', cells: ['$29/mo a seat', 'From $17.50/mo', 'Free'] },
      { label: 'What a seat is', cells: ['A computer on a screen', 'Campus licence', 'No seats'] },
      { label: 'Whole building', cells: ['$59/mo campus licence', 'Included', 'Included'] },
      { label: 'Free plan with no time limit', cells: ['Watermarked output', false, true] },
      { label: 'Trial', cells: ['14 days, card required', '30 days, no card', 'Not needed'] },
      { label: 'Paid plan', cells: ['Subscription', 'Subscription', `${PLANS.pro.price} ${PLANS.pro.cadence}`] },
    ],
  },
  {
    title: 'Where it runs',
    rows: [
      { label: 'Platforms', cells: ['Mac, Windows', 'Mac, Windows', 'Any browser'] },
      { label: 'Installed on each machine', cells: [true, true, false] },
      { label: 'Presents with no internet', cells: [true, true, { soon: 'Soon' }] },
      { label: 'Cost of another screen', cells: ['Another seat', 'Another install', 'Another link'] },
      { label: 'Learning curve', cells: ['Complex', 'Moderate', 'Simple and intuitive'] },
    ],
  },
  {
    title: 'Scripture and songs',
    rows: [
      { label: 'Bible built in', cells: [true, true, true] },
      {
        label: 'Two languages on one slide',
        cells: ['Theme with two text boxes', 'By hand, per slide', true],
      },
      { label: 'Each screen picks its languages', cells: ['One slide, every screen', 'One slide, every screen', true] },
      { label: 'CCLI SongSelect built in', cells: [true, true, false] },
      { label: 'Import a ProPresenter library', cells: ['Native', 'Conversion tool', true] },
    ],
  },
  {
    title: 'The screens',
    rows: [
      { label: 'Projector output', cells: [true, true, true] },
      { label: 'Stage or confidence display', cells: [true, true, true] },
      { label: 'Livestream graphics', cells: ['NDI, alpha', 'NDI, alpha', 'Browser source'] },
      { label: 'Remote control', cells: ['App', 'App', 'Any browser'] },
      { label: 'Stock media included', cells: [false, 'On Premium', false] },
    ],
  },
];

const VERDICTS = [
  {
    title: `Pick ${A} if`,
    body: 'You build productions rather than services: layered media, motion cued to the second, props and masks, '
      + 'or a video pipeline other gear on the network subscribes to. It is the deepest of the three, and the one '
      + 'a full-time production team will grow into rather than out of.',
  },
  {
    title: `Pick ${B} if`,
    body: 'You want one mature application that covers a Sunday and costs less per month, with CCLI SongSelect '
      + 'inside it and a stock media library on the higher plan. A campus licence covers the building rather than '
      + 'each computer in it, which is the cheaper shape for a church with several machines.',
  },
  {
    title: 'Neither, if',
    body: 'The thing you keep hitting is the shape rather than the features: a licence tied to one machine, a '
      + 'volunteer who cannot open it on theirs, a second screen that costs money, or a bilingual service you are '
      + 'building by hand twice.',
  },
];

const QUESTIONS = [
  {
    q: `Is ${A} or ${B} cheaper?`,
    a: `${B} is cheaper to start: from $17.50 a month billed yearly at the time of writing, with a campus licence `
      + `included. ${A} is $29 a month for one seat, and a seat is a computer that puts something on a screen — a `
      + 'church running two machines either buys two seats or moves up to the $59 campus licence.',
  },
  {
    q: `Does ${B} run on Mac?`,
    a: `Yes. ${B} 8 runs natively on Mac and Windows, and schedules, songs and media move between the two. ${A} `
      + 'has always run on both.',
  },
  {
    q: 'Which handles two Bible languages better?',
    a: `${A}, narrowly. It can draw two translations on one slide if you build a theme with a text box for each, `
      + `and it breaks the passage onto a slide per verse to fill them. ${B} has no bilingual Bible: you place two `
      + 'scripture boxes and fill the second one in yourself.',
  },
  {
    q: `Is there a free version of ${A}?`,
    a: `There is a free download, but its output is watermarked and it is not meant to be used in front of a `
      + 'congregation — it is for building shows on another machine. The unwatermarked trial is 14 days and asks '
      + 'for a card up front.',
  },
  {
    q: 'Can I move my songs from one to the other?',
    a: `Not directly. ${B} imports from other presenters through a separate conversion tool rather than reading a `
      + `${A} export itself, which is worth pricing into a switch.`,
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      mainEntity: QUESTIONS.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Compare', item: `${SITE_URL}/compare` },
        {
          '@type': 'ListItem',
          position: 2,
          name: `${A} vs ${B}`,
          item: `${SITE_URL}/propresenter-vs-easyworship`,
        },
      ],
    },
  ],
};

export const revalidate = 60;

export default async function ProPresenterVsEasyWorshipPage() {
  const PLANS = plansFor(await claimedSpots());
  const GROUPS = groups(PLANS);
  const video = findUseCase('multilingual-church-services')?.video;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">
          <Link href="/compare" className="transition-colors hover:text-site-muted">
            Compare
          </Link>
        </p>

        <h1 className={`${DISPLAY} mt-5 max-w-4xl text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
          {A} vs {B}:{' '}
          <Marker>which one for your church?</Marker>
        </h1>

        <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

        <div className="mt-7 grid max-w-5xl gap-6 text-[17px] leading-relaxed text-site-muted lg:grid-cols-2">
          <p>
            Two mature desktop presenters, both installed on Mac and Windows, both covering a Sunday well. The
            differences a church actually feels are what a second screen costs, what happens when the volunteer who
            has it installed is away, and what either does with a second language.
          </p>
          <p>
            We make a third option, so read this knowing that. The two columns below are what {A} and {B} publish
            about themselves, read in {CHECKED}, and the honest recommendation is in the three cards under the
            table — including the case for each of them over us.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <CompareMatrix columns={COLUMNS} groups={GROUPS} />

        <p className="mt-6 text-[15px] leading-relaxed text-site-muted">
          Prices are what each maker published in {CHECKED} and are the sort of thing that moves. Check both before
          you decide.
        </p>
      </section>

      <ConsoleDemo video={LIVE_SEARCH_DEMO} padding="py-10 sm:py-14" />

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Which one</h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {VERDICTS.map(verdict => (
              <div key={verdict.title} className="rounded-studio-lg border border-site-rule bg-site-bg p-6">
                <h3 className={`${DISPLAY} text-xl`}>{verdict.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{verdict.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>The third option</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              {OURS} is browser-based church presentation software. There is nothing to install on the booth
              computer, every screen is a link rather than a seat, and a bilingual service is armed rather than
              built twice. It starts free, with no countdown on it.
            </p>
            <p>
              It is not the deeper production tool — that is {A} — and it does not sell you a media library or
              SongSelect the way {B} does. The full arguments are on the{' '}
              <Link href="/propresenter-alternative" className="text-site-ink underline underline-offset-4">
                {A}
              </Link>{' '}
              and{' '}
              <Link href="/easyworship-alternative" className="text-site-ink underline underline-offset-4">
                {B}
              </Link>{' '}
              pages, and the{' '}
              <Link href="/compare" className="text-site-ink underline underline-offset-4">
                five-way grid
              </Link>{' '}
              adds FreeShow and Proclaim to the shortlist.
            </p>
          </div>
        </div>
      </section>

      {video ? <ConsoleDemo video={video} band={false} padding="py-10 sm:py-14" /> : null}

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
            {A} vs {B} questions
          </h2>

          <div className="mt-10 gap-x-14 sm:columns-2">
            {QUESTIONS.map(item => (
              <div key={item.q} className="mb-8 break-inside-avoid">
                <h3 className="text-[19px] leading-snug font-medium text-site-ink">{item.q}</h3>
                <p className="mt-2.5 text-[16px] leading-relaxed text-site-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-studio-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-valera text-3xl leading-[1.1] tracking-tight text-studio-text sm:text-4xl">
              Try the third column first
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              It is free, it opens in the browser you are reading this in, and it takes about as long as reading
              this page.
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
        {A} is a trademark of Renewed Vision, LLC, and {B} is a trademark of Softouch Development, Inc.{' '}
        {OURS} is not affiliated with, endorsed by or sponsored by either of them, and their names are used here
        only to say which products are being compared.
      </p>
    </main>
  );
}
