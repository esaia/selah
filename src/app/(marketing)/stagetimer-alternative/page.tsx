import Image from 'next/image';
import Link from 'next/link';

import { Art } from '@/components/marketing/Art';
import { ConsoleDemo } from '@/components/marketing/ConsoleDemo';
import { Marker } from '@/components/marketing/Marker';
import { Tick } from '@/components/marketing/Tick';
import { findUseCase, LIVE_SEARCH_DEMO } from '@/lib/marketing/useCases';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const TITLE = 'StageTimer Alternative: Worship Stage Timer Online | LlamaPresenter';

const DESCRIPTION =
  'Looking for a StageTimer alternative for your church? LlamaPresenter combines Bible verses, song lyrics, stage '
  + 'timing, projector, livestream, and remote control in one browser-based church presentation tool.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/stagetimer-alternative' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/stagetimer-alternative',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const OURS = 'LlamaPresenter';
const THEIRS = 'StageTimer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

const NEEDS = [
  {
    title: 'Bible verses',
    body: 'Search and present Bible passages without leaving your presentation.',
  },
  {
    title: 'Multiple languages',
    body: 'Show different Bible translations side by side and choose which languages appear on each screen.',
  },
  {
    title: 'Song lyrics',
    body: 'Present your songs and playlists alongside the rest of your service. You can also import songs from a '
      + 'ProPresenter export.',
  },
  {
    title: 'Projector, stage, and livestream',
    body: 'Run three different views from the same presentation: your projector, your stage display, and your '
      + 'livestream lower third.',
  },
  {
    title: 'Stage timer',
    body: 'Keep your team on schedule with a built-in timer that works alongside your presentation.',
  },
  {
    title: 'Phone remote',
    body: 'Control the presentation from your phone without staying next to the main computer.',
  },
];

const COMPARISON: { label: string; ours: string; theirs: string }[] = [
  {
    label: 'Primary use',
    ours: 'Church presentation and service control with stage timing included.',
    theirs: 'Professional event timing, rundowns, and timer control.',
  },
  { label: 'Bible verses', ours: 'Yes', theirs: 'Not a Bible presentation tool' },
  { label: 'Multiple Bible languages', ours: 'Yes', theirs: 'Not a Bible presentation feature' },
  { label: 'Song lyrics', ours: 'Yes', theirs: 'Not a song presentation tool' },
  { label: 'ProPresenter song import', ours: 'Yes', theirs: 'No' },
  { label: 'Projector presentation', ours: 'Yes', theirs: 'Timer-focused outputs' },
  { label: 'Stage view', ours: 'Yes', theirs: 'Yes' },
  { label: 'Timer', ours: 'Yes', theirs: 'Yes' },
  {
    label: 'Livestream output',
    ours: 'Yes, through a browser-based output',
    theirs: 'Yes, including broadcast-oriented outputs',
  },
  {
    label: 'Custom templates',
    ours: 'Custom templates for Bible verses and lyrics',
    theirs: 'Custom timer and output layouts',
  },
  { label: 'Phone control', ours: 'Yes', theirs: 'Yes' },
  {
    label: 'Church-focused workflow',
    ours: 'Yes',
    theirs: 'Designed for broader live-event and production use',
  },
];

const STAGE = [
  'Countdown and count-up',
  'Clock',
  'Service agenda',
  'Current and next slide',
  'Timer controls',
  'Remote control',
  'Timer-only stage display',
];

const SERVICE = [
  'Present Bible verses',
  'Show multiple languages side by side',
  'Present song lyrics',
  'Import songs from ProPresenter',
  'Send content to your projector',
  'Give your team a stage view',
  'Send lyrics and verses to your livestream',
  'Create custom presentation templates',
  'Control slides from your phone',
  'Keep your service in one running order',
];

const AUDIENCE = [
  { title: 'Small churches', body: 'Run your service without a complicated production setup.' },
  { title: 'Worship teams', body: 'Keep songs, Bible verses, screens, and timing together.' },
  {
    title: 'Church livestream teams',
    body: 'Send verses and lyrics to your stream while your projector and stage display run separately.',
  },
  { title: 'Church production teams', body: 'Control the presentation, stage view, and timer from one place.' },
];

const QUESTIONS = [
  {
    q: `Is ${OURS} a ${THEIRS} alternative?`,
    a: `Yes. ${OURS} can be used as a ${THEIRS} alternative when your church needs stage timing together with Bible `
      + 'verses, song lyrics, multiple languages, projector output, livestream graphics, and presentation control.',
  },
  {
    q: `Does ${OURS} have a stage timer?`,
    a: `Yes. ${OURS} includes a stage timer with countdown, count-up, clock, agenda, and timer controls. You can also `
      + 'use a clean timer-only view on the stage display.',
  },
  {
    q: `Can I use ${OURS} with OBS?`,
    a: `Yes. ${OURS} provides a browser-based livestream output that you can add to OBS as a Browser source.`,
  },
  {
    q: 'Can I import songs from ProPresenter?',
    a: 'Yes. You can import song lyrics from a ProPresenter export, making it easier to move an existing song '
      + `library into ${OURS}.`,
  },
  {
    q: `Can ${OURS} show multiple Bible languages?`,
    a: 'Yes. You can show multiple Bible translations or languages on the same slide and choose which languages '
      + 'appear on each output.',
  },
  {
    q: 'Is LlamaPresenter a replacement for ProPresenter too?',
    a: `${OURS} is designed as a simpler, browser-based church presentation option. It covers core workflows such as `
      + 'Bible verses, lyrics, multiple languages, projector output, stage view, livestream output, templates, and '
      + 'remote control.',
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
        + 'output, stage display, livestream graphics, and stage timing.',
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

export default function StageTimerAlternativePage() {
  const video = findUseCase('multilingual-church-services')?.video;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">{THEIRS} alternative</p>

        <div className="mt-5 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
              A {THEIRS} alternative built for{' '}
              <Marker>church services</Marker>
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-site-muted">
              Need more than a timer? {OURS} combines stage timing with Bible verses, song lyrics, multiple languages,
              projector output, livestream graphics, and remote control in one browser-based tool.
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
              src="/images/compare-stagetimer.webp"
              alt={`The ${OURS} stage timer open in a browser on one laptop, with the ${THEIRS} controller on a `
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
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Looking for a {THEIRS} alternative?</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              {THEIRS} is built around keeping events on time. {OURS} takes a different approach. It combines a stage
              timer with the tools a church team needs to run a service, so your Bible verses, songs, screens,
              livestream, and timing can all work together.
            </p>
            <p>
              If you already use a separate presentation tool and a separate timer, {OURS} can bring those parts of
              your service into one place. It runs in a browser, so the machine in the booth, the screen on the
              platform, and the phone in your hand all open the same service.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>When a timer is not enough</h2>

        <div className="mt-5 max-w-2xl space-y-4 text-[17px] leading-relaxed text-site-muted">
          <p>
            A church service is more than a countdown. Your team may need to present Bible verses in multiple
            languages, show song lyrics, send graphics to a livestream, control a projector, and keep the people on
            stage informed.
          </p>
          <p>
            {OURS} puts those tasks around the same presentation workflow, so the countdown on the platform and the
            verse on the wall are two parts of one service rather than two programs to keep in step.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {NEEDS.map(item => (
            <div key={item.title} className="rounded-studio-lg border border-site-rule bg-site-surface p-6">
              <h3 className={`${DISPLAY} text-xl`}>{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{item.body}</p>
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
            Both tools can help a production team stay on schedule. The main difference is the workflow they are
            designed around.
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

          <p className="mt-8 max-w-2xl text-[16px] leading-relaxed text-site-muted">
            The two overlap where a service needs timing: a countdown before the meeting starts, a clock on the
            platform, a running order the team can follow, a message to the person speaking, and a screen that can be
            read from the back of a stage. Past that point the tools part company. {THEIRS} goes further into event
            production. {OURS} goes further into the service itself.
          </p>
        </div>
      </section>

      <ConsoleDemo video={LIVE_SEARCH_DEMO} />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>A timer is part of the service</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              With {OURS}, the timer is not a separate part of your setup. It works alongside your presentation,
              songs, Bible verses, screens, and livestream.
            </p>
            <p>
              Your team can use Stage View to see the current slide, next slide, agenda, clock, and timer. Or use a
              clean timer-only display when that is all the stage needs.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 sm:pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className={`${DISPLAY} max-w-md text-3xl leading-[1.1] sm:text-4xl`}>
              A stage timer without another tool
            </h2>

            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-site-muted">
              Keep your service moving with countdowns, count-ups, clocks, and timer controls built into the
              presentation workflow. The stage display is a link like every other output, so the screen at the front
              of the platform can be an old laptop or a cheap stick.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {STAGE.map(item => (
                <li key={item} className="flex items-start gap-2.5 text-[16px] leading-relaxed text-site-ink">
                  <Tick className="mt-[7px] size-3.5 shrink-0 text-site-ink" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Art
            src="/images/features/stage-timer.webp"
            alt="The stage display showing the current verse, the next one, the clock, the running order and a countdown"
          />
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className={`${DISPLAY} max-w-md text-3xl leading-[1.1] sm:text-4xl`}>
              More than a {THEIRS} alternative
            </h2>

            <div className="mt-5 max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
              <p>
                If you are searching for an alternative to {THEIRS} because you need a timer, you may also need a
                presentation system for the rest of your service. {OURS} brings those pieces together.
              </p>
              <p>
                It is church presentation software first: scripture, songs and screens, with the timing your team
                already runs on. If you are weighing up a desktop presenter at the same time, the{' '}
                <Link href="/propresenter-alternative" className="text-site-ink underline underline-offset-4">
                  ProPresenter alternative
                </Link>{' '}
                and{' '}
                <Link href="/easyworship-alternative" className="text-site-ink underline underline-offset-4">
                  EasyWorship
                </Link>{' '}
                and{' '}
                <Link href="/proclaim-alternative" className="text-site-ink underline underline-offset-4">
                  Proclaim
                </Link>{' '}
                pages cover those comparisons.
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {SERVICE.map(item => (
                <li key={item} className="flex items-start gap-2.5 text-[16px] leading-relaxed text-site-ink">
                  <Tick className="mt-[7px] size-3.5 shrink-0 text-site-ink" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Art
            src="/images/features/languages.webp"
            alt="A slide carrying the same verse in Georgian and English, beside the panel that arms each language"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>When {THEIRS} may be the better fit</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              If your main goal is professional event timing, rundowns, timer outputs, and production timing
              workflows, {THEIRS} may be the better fit. If you want those timing tools as part of a complete church
              presentation workflow, {OURS} is designed for that.
            </p>
            <p>
              It is also worth saying plainly that {OURS} runs in a browser. A service in a building with an
              unreliable connection is the one case where a tool that lives on the machine in front of you has the
              advantage, whatever that tool is. Native Mac and Windows apps are on the way for exactly that
              building.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Who should use {OURS}?</h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
            {OURS} is a good fit for churches that want a browser-based presentation system with stage timing built
            in. What it costs depends on how much of it you use, and the{' '}
            <Link href="/pricing" className="text-site-ink underline underline-offset-4">
              pricing
            </Link>{' '}
            page has the current plans.
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
              One tool for your whole service
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              Run your Bible verses, lyrics, screens, livestream, and stage timer from one simple browser-based
              console.
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
        {THEIRS} is a trademark of its owner, and ProPresenter is a trademark of Renewed Vision, LLC. {OURS} is not
        affiliated with, endorsed by or sponsored by either of them. Their names are used here only to say which
        products we are comparing ourselves with.
      </p>
    </main>
  );
}
