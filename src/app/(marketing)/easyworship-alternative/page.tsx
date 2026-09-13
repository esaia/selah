import Image from 'next/image';
import Link from 'next/link';

import { Art } from '@/components/marketing/Art';
import { BothCover } from '@/components/marketing/BothCover';
import { ConsoleDemo } from '@/components/marketing/ConsoleDemo';
import { Marker } from '@/components/marketing/Marker';
import { Tick } from '@/components/marketing/Tick';
import { plansFor, type Plan, type PlanId } from '@/lib/billing/plans';
import { claimedSpots } from '@/lib/billing/seats';
import { findUseCase, LIVE_SEARCH_DEMO } from '@/lib/marketing/useCases';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const TITLE = 'EasyWorship Alternative for Churches | LlamaPresenter';

const DESCRIPTION =
  'Looking for an EasyWorship alternative? LlamaPresenter is browser-based church presentation software for Bible '
  + 'verses, lyrics, multiple languages, projector, stage, livestream, templates, and remote control.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/easyworship-alternative' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/easyworship-alternative',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const OURS = 'LlamaPresenter';
const THEIRS = 'EasyWorship';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

const PLATFORMS = [
  {
    title: THEIRS,
    body: 'Church presentation software you install on the booth computer. Version 8 runs natively on Windows and '
      + 'Mac, and your schedules, songs, and media move between the two.',
  },
  {
    title: OURS,
    body: 'Browser-based church presentation software. Open it in your browser and connect your projector, stage '
      + 'display, livestream, and remote devices.',
  },
];

const comparison = (PLANS: Record<PlanId, Plan>): { label: string; ours: string; theirs: string }[] => [
  {
    label: 'Where the software runs',
    ours: 'In the browser. Any computer will do.',
    theirs: 'Installed on each Windows or Mac computer.',
  },
  {
    label: 'Getting a screen on',
    ours: 'A link, opened on the screen itself.',
    theirs: 'An output of the presenting computer.',
  },
  {
    label: 'Adding the fourth screen',
    ours: 'Another link, at no cost.',
    theirs: 'Another display, or another install.',
  },
  {
    label: 'Learning curve',
    ours: 'Simple and intuitive.',
    theirs: 'Moderate. A schedule, a resource list and a live view to learn.',
  },
  {
    label: 'Two languages on one slide',
    ours: 'Arm them once. Every verse comes out in all of them.',
    theirs: 'No bilingual Bible. Two boxes, filled in by hand.',
  },
  {
    label: 'Different languages per screen',
    ours: 'Each screen shows the languages you give it.',
    theirs: 'One slide, every screen.',
  },
  {
    label: 'Two languages in a song',
    ours: 'The same as a verse, out of the box.',
    theirs: 'Both typed into the slide.',
  },
  {
    label: 'A Bible in your own language',
    ours: 'Over a thousand, from public archives. Or upload one.',
    theirs: 'From the built-in library.',
  },
  {
    label: 'The remote',
    ours: 'Any phone browser, from anywhere.',
    theirs: 'Their app, installed on the phone.',
  },
  {
    label: 'The stage timer',
    ours: 'In Stage View, and on a link of its own.',
    theirs: 'On the foldback output.',
  },
  {
    label: 'Songs from another presenter',
    ours: 'Drop a ProPresenter export on the console.',
    theirs: 'Usually a separate conversion tool.',
  },
  {
    label: 'What it costs to start',
    ours: `Free, with no time limit. Pro is ${PLANS.pro.price} ${PLANS.pro.cadence}.`,
    theirs: 'From $17.50 a month yearly, after a 30-day trial.',
  },
];

const SHARED = [
  'Bible search and verse slides',
  'Song lyrics, with CCLI SongSelect on their side',
  'Projector output',
  'A stage or confidence display',
  'Livestream graphics',
  'Custom templates and slide design',
  'A countdown timer',
  'Remote control from a phone',
  'Your own backgrounds and music',
  'PowerPoint and media playback',
];

const REASONS = [
  {
    title: 'Nothing to install, anywhere',
    body: 'Not on the booth computer, not on the screen at the front, not on the phone in your hand. If it has a '
      + 'browser, it can run its part of the service.',
  },
  {
    title: 'Every screen is a link',
    body: 'The projector, the stage, the stream and the lower third each open on the device that needs them. No '
      + 'cable across the building, and no second computer to license.',
  },
  {
    title: 'Languages are armed, not pasted',
    body: 'Two or more translations on the same slide, from one passage read once — not two scripture boxes you '
      + 'fill in yourself. Songs carry their languages the same way, out of the box.',
  },
  {
    title: 'Each screen picks its own languages',
    body: 'The congregation can read two while the stage carries one and the stream carries the other — from the '
      + 'same verse, or the same song, you just sent.',
  },
  {
    title: 'A Bible you brought yourself',
    body: 'Over a thousand translations from public archives, fetched inside the console, plus any file of your '
      + 'own. Your language does not have to be one somebody sells.',
  },
  {
    title: 'A free plan that is not a countdown',
    body: 'The Bible, both outputs and the stage display are never gated. Pro raises the ceilings; it does not '
      + 'unlock the Sunday.',
  },
];

const SCREENS = [
  { title: 'Projector', body: 'Show Bible verses, lyrics, announcements, and media to the congregation.' },
  { title: 'Stage', body: 'Give your team the current slide, next slide, agenda, clock, and timer.' },
  { title: 'Livestream', body: 'Send verses, lyrics, and other graphics to your stream.' },
];

const AUDIENCE = [
  {
    title: 'Churches using multiple languages',
    body: 'Show Bible translations side by side without building a second set of slides.',
  },
  {
    title: 'Churches watching the budget',
    body: 'Run a full service on the free plan, and pay only when you want the higher limits.',
  },
  {
    title: 'Churches with volunteers on rotation',
    body: 'Whoever is in the booth signs in on the computer that is there rather than installing anything.',
  },
  {
    title: 'Churches that prefer browser-based tools',
    body: 'Open the service in a browser instead of maintaining desktop presentation software.',
  },
];

const QUESTIONS = [
  {
    q: `Is ${OURS} an ${THEIRS} alternative?`,
    a: `Yes. ${OURS} is an alternative for churches looking for presentation software with Bible verses, song `
      + 'lyrics, multiple languages, projector output, stage display, livestream graphics, templates, and remote '
      + `control. The biggest difference is that ${OURS} is browser-based.`,
  },
  {
    q: `Is ${OURS} cheaper than ${THEIRS}?`,
    a: `${THEIRS} is sold as a subscription, from $17.50 per month billed yearly at the time of writing, with a `
      + `30-day trial. ${OURS} has a free plan with no time limit, and Pro raises the limits for churches that need `
      + 'more room.',
  },
  {
    q: `Does ${OURS} work on Mac and Windows?`,
    a: `Yes. ${OURS} runs in a modern web browser, so it works on Mac, Windows, and anything else with a modern `
      + `browser. ${THEIRS} 8 also runs on both, as an application you install.`,
  },
  {
    q: 'Can I show multiple Bible translations at the same time?',
    a: `Yes. ${OURS} draws two or more languages on the same slide and lets each output choose which of them it `
      + 'shows, so turning a language on in the middle of a service is one click.',
  },
  {
    q: 'Can I use my own Bible translation?',
    a: `Yes. Pick one from a public Bible archive inside the console, or upload a file of your own. It stays in your `
      + 'church account.',
  },
  {
    q: 'Can I import my ProPresenter songs?',
    a: `Yes. ${OURS} reads song lyrics from a ProPresenter export, so you can bring an existing library across.`,
  },
  {
    q: `Can I use ${OURS} with OBS?`,
    a: `Yes. ${OURS} provides a browser-based livestream output that you add to OBS as a browser source. ${THEIRS} `
      + 'takes the other route and sends NDI or an alpha channel out of the application.',
  },
  {
    q: 'Does it need an internet connection?',
    a: `Yes, for now. ${OURS} is browser-based, so changing what is on the screens needs a working connection. `
      + 'The screens keep showing the slide they are on if it drops. Native Mac and Windows apps are on the way for '
      + 'buildings where the internet cannot be trusted, and they will run a service with no connection at all.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: OURS,
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Church presentation software',
      operatingSystem: 'Web browser',
      description:
        'Browser-based church presentation software for Bible verses, song lyrics, multiple languages, projector '
        + 'output, stage display, livestream graphics, templates, and remote control.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: QUESTIONS.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export const revalidate = 60;

export default async function EasyWorshipAlternativePage() {
  const PLANS = plansFor(await claimedSpots());
  const COMPARISON = comparison(PLANS);
  const video = findUseCase('multilingual-church-services')?.video;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">{THEIRS} alternative</p>

        <div className="mt-5 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
              An {THEIRS} alternative that runs in{' '}
              <Marker>your browser</Marker>
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-site-muted">
              {THEIRS} is well-established church presentation software you install and subscribe to. {OURS} takes a
              different approach. It runs in your browser, starts free, and brings Bible verses, song lyrics,
              multiple languages, projector, stage, livestream, templates, and remote control into one workflow.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="rounded-studio bg-site-accent px-6 py-3.5 text-[17px] font-medium text-site-onaccent
                  shadow-sm transition-colors duration-150 hover:bg-site-accent/85"
              >
                Try {OURS} free
              </Link>

              <Link
                href="/#room"
                className="rounded-studio border border-site-rule px-6 py-3.5 text-[17px] text-site-ink
                  transition-colors duration-150 hover:bg-site-band"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="lg:-mr-6">
            <Image
              src="/images/compare-easyworship.webp"
              alt={`The ${OURS} console open in a browser on one laptop, with the ${THEIRS} desktop app running on a `
                + 'second laptop beside it'}
              width={1919}
              height={675}
              sizes="(min-width: 1024px) 52rem, 100vw"
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Looking for an {THEIRS} alternative?</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              {THEIRS} has been running church services for a long time. It covers lyrics, scripture, media, themes,
              and a livestream feed, and a church running it well is not missing anything on a Sunday.
            </p>
            <p>
              {OURS} is built on a different idea: keep the service in the browser and keep the setup small. There is
              nothing to install, the projector, stage, livestream, and remote all open from the same session, and
              the plan you start on is free rather than a countdown to a subscription.
            </p>
            <p>
              If you like what {THEIRS} does but would rather not install and license presentation software, this
              page is the honest version of the difference — including where installed software still wins.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Installed software or the browser?</h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
          The biggest difference is where the software lives. Everything else on this page follows from it.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {PLATFORMS.map(item => (
            <div key={item.title} className="rounded-studio-lg border border-site-rule bg-site-surface p-6 sm:p-8">
              <h3 className={`${DISPLAY} text-2xl`}>{item.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-site-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="table" className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl scroll-mt-20 px-6 py-16 sm:py-24">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
            {OURS} vs {THEIRS}
          </h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
            Only the rows where the two part company. Both run a Sunday, and the list under the table says so — but
            these are the lines a church is actually choosing between.
          </p>

          <div
            className="mt-10 overflow-x-auto rounded-studio-lg border border-site-rule bg-site-bg
              lg:overflow-visible"
          >
            <table className="w-full min-w-3xl border-separate border-spacing-0 text-left align-top">
              <caption className="sr-only">
                {OURS} compared with {THEIRS}, feature by feature
              </caption>

              <thead>
                <tr>
                  <th
                    scope="col"
                    className="site-pinhead w-[24%] bg-site-bg py-4 pr-6 pl-5 sm:pl-8 text-left text-[15px] font-semibold
                      text-site-muted"
                  >
                    Feature
                  </th>

                  <th
                    scope="col"
                    className="site-pinhead w-[38%] bg-[color-mix(in_oklab,var(--color-site-accent)_18%,var(--color-site-bg))] px-6 py-4 text-left
                      text-[15px] font-semibold text-site-ink"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-site-accent" />
                      {OURS}
                    </span>
                  </th>

                  <th
                    scope="col"
                    className="site-pinhead w-[38%] bg-site-bg py-4 pr-5 pl-6 text-left
                      text-[15px] font-semibold text-site-muted sm:pr-8"
                  >
                    {THEIRS}
                  </th>
                </tr>
              </thead>

              <tbody>
                {COMPARISON.map(row => (
                  <tr key={row.label} className="align-top">
                    <th
                      scope="row"
                      className="border-t border-site-rule py-5 pr-6 pl-5 text-left text-[15px] font-medium
                        text-site-ink sm:pl-8"
                    >
                      {row.label}
                    </th>

                    <td
                      className="border-t border-site-rule bg-site-accent/18 px-6 py-5 text-[15px] leading-relaxed
                        font-semibold text-site-ink"
                    >
                      <span className="flex gap-2.5">
                        <Tick className="mt-[6px] size-3.5 shrink-0 text-site-ink" />
                        <span>{row.ours}</span>
                      </span>
                    </td>

                    <td
                      className="border-t border-site-rule py-5 pr-5 pl-6 text-[15px] leading-relaxed
                        text-site-muted sm:pr-8"
                    >
                      {row.theirs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <BothCover theirs={THEIRS} items={SHARED} />

          <p className="mt-8 max-w-2xl text-[16px] leading-relaxed text-site-muted">
            Prices and plans on the {THEIRS} side are what their site said when this page was written, and they are
            the sort of thing that moves. Check theirs before you decide on ours.
          </p>
        </div>
      </section>

      <ConsoleDemo video={LIVE_SEARCH_DEMO} />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
          What you get here that {THEIRS} does not
        </h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
          {THEIRS} gives a church a deep, mature desktop application. These six are the things it cannot do from
          where it runs, and they are the reason this exists.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map(item => (
            <div key={item.title} className="rounded-studio-lg border border-site-rule bg-site-surface p-6">
              <h3 className={`${DISPLAY} text-xl`}>{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className={`${DISPLAY} max-w-md text-3xl leading-[1.1] sm:text-4xl`}>
              Multiple Bible languages, side by side
            </h2>

            <div className="mt-5 max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
              <p>
                A large translation library answers a different question from a bilingual service. {THEIRS} has many
                translations to choose between; {OURS} draws two or more of them on the same slide and lets the
                projector, the stage, and the stream each show the ones they need.
              </p>
              <p>
                It is the same passage read once, so turning a language on or off mid-service is one click rather
                than a second set of slides. Your own translation can join them: pick one from a public Bible
                archive inside the console, or bring a file of your own.
              </p>
              <p>
                Songs work the same way. A song holds the languages it is sung in, they stack on the big screen one
                under the other, and the stage and the lower third each carry one of them — so the words on the
                platform can be in one language while the congregation reads two.
              </p>
            </div>
          </div>

          <Art
            src="/images/features/languages.webp"
            alt="A slide carrying the same verse in Georgian and English, beside the panel that arms each language"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className={`${DISPLAY} max-w-md text-3xl leading-[1.1] sm:text-4xl`}>
              Projector, stage, and livestream in one workflow
            </h2>

            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-site-muted">
              {OURS} is designed around three outputs. Each one is a link you open on the screen that needs it, and
              each can show something different while the whole service stays connected.
            </p>

            <dl className="mt-8 space-y-5">
              {SCREENS.map(screen => (
                <div key={screen.title} className="flex gap-3">
                  <Tick className="mt-[7px] size-3.5 shrink-0 text-site-ink" />
                  <div>
                    <dt className="text-[17px] font-medium text-site-ink">{screen.title}</dt>
                    <dd className="mt-1 text-[16px] leading-relaxed text-site-muted">{screen.body}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <Art
            src="/images/features/outputs.webp"
            alt="One session feeding a stage display, a projector slide and a transparent stream overlay, each at its own link"
          />
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 sm:py-24 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>A free plan, not a countdown</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              {THEIRS} is sold as a subscription with a 30-day trial. When the trial ends, the software stops being
              yours to use.
            </p>
            <p>
              The free plan here is not a trial. The Bible, both outputs, and the stage display are never gated. What
              Pro buys is volume — more songs, more languages, more of your own templates — and the{' '}
              <Link href="/pricing" className="text-site-ink underline underline-offset-4">
                pricing
              </Link>{' '}
              page has the current numbers. A church that never crosses those ceilings never pays.
            </p>
            <p>
              One thing a subscription does buy on their side: the Premium plan comes with a large stock media
              library. {OURS} does not sell you backgrounds. You bring your own, and they stay on the computer that
              added them rather than being uploaded anywhere.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
            When {THEIRS} may be the better choice
          </h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              If the internet in the building is unreliable, installed software is the safer answer today, and
              {THEIRS} is a good one — though native Mac and Windows apps are on the way here for exactly that
              building. The same goes for a team that leans on CCLI SongSelect inside the application, wants a stock
              media library included, or sends NDI around the building to a video switcher.
            </p>
            <p>
              If you would rather open a browser, start free, and run a multilingual service across projector, stage,
              and stream from one session, {OURS} is designed for that.
            </p>
            <p>
              Weighing up other options too? The{' '}
              <Link href="/propresenter-alternative" className="text-site-ink underline underline-offset-4">
                ProPresenter alternative
              </Link>{' '}
              page covers the other large desktop presenter, the{' '}
              <Link href="/freeshow-alternative" className="text-site-ink underline underline-offset-4">
                FreeShow alternative
              </Link>{' '}
              page covers the free and open-source one, and the{' '}
              <Link href="/stagetimer-alternative" className="text-site-ink underline underline-offset-4">
                StageTimer alternative
              </Link>{' '}
              page covers the church stage timer on its own. The{' '}
              <Link href="/proclaim-alternative" className="text-site-ink underline underline-offset-4">
                Proclaim alternative
              </Link>{' '}
              page covers the cloud-connected one.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Who should use {OURS}?</h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
            Churches that want browser-based church presentation software with their screens, languages, and timing
            in one place.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map(card => (
              <div key={card.title} className="rounded-studio-lg border border-site-rule bg-site-bg p-6">
                <h3 className={`${DISPLAY} text-xl`}>{card.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {video ? <ConsoleDemo video={video} /> : null}

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>{THEIRS} alternative FAQ</h2>

        <div className="mt-12 gap-x-14 sm:columns-2">
          {QUESTIONS.map(item => (
            <div key={item.q} className="mb-9 break-inside-avoid">
              <h3 className="text-[19px] leading-snug font-medium text-site-ink">{item.q}</h3>
              <p className="mt-2.5 text-[16px] leading-relaxed text-site-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-studio-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-valera text-3xl leading-[1.1] tracking-tight text-studio-text sm:text-4xl">
              Ready to try a browser-based church presenter?
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              Move your Bible verses, lyrics, screens, livestream, and stage timer into one simple browser-based
              workflow.
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
        {THEIRS} is a trademark of Softouch Development, Inc., and ProPresenter is a trademark of Renewed Vision,
        LLC. {OURS} is not affiliated with, endorsed by or sponsored by either of them. Their names are used here
        only to say which products we are comparing ourselves with.
      </p>
    </main>
  );
}
