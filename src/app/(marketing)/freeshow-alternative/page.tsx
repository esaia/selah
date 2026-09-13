import Image from 'next/image';
import Link from 'next/link';

import { Art } from '@/components/marketing/Art';
import { BothCover } from '@/components/marketing/BothCover';
import { ConsoleDemo } from '@/components/marketing/ConsoleDemo';
import { Marker } from '@/components/marketing/Marker';
import { Tick } from '@/components/marketing/Tick';
import { findUseCase, LIVE_SEARCH_DEMO } from '@/lib/marketing/useCases';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const TITLE = 'FreeShow Alternative for Churches | LlamaPresenter';

const DESCRIPTION =
  'Looking for a FreeShow alternative? LlamaPresenter is a browser-based church presentation tool for Bible verses, '
  + 'lyrics, multiple languages, projector, stage, livestream, templates, and remote control.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/freeshow-alternative' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/freeshow-alternative',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const OURS = 'LlamaPresenter';
const THEIRS = 'FreeShow';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

const PLATFORMS = [
  {
    title: THEIRS,
    body: 'A free and open-source desktop application that you install on your computer. It is available for '
      + 'Windows, macOS, and Linux.',
  },
  {
    title: OURS,
    body: 'A browser-based church presentation platform. Open it in your browser and connect your projector, stage '
      + 'display, livestream, and remote devices.',
  },
];

const comparison = (): { label: string; ours: string; theirs: string }[] => [
  {
    label: 'Where the software runs',
    ours: 'In the browser. Any computer will do.',
    theirs: 'Installed on each Windows, macOS or Linux computer.',
  },
  {
    label: 'Getting a screen on',
    ours: 'A link, opened on the screen itself.',
    theirs: 'An output of the presenting computer.',
  },
  {
    label: 'Learning curve',
    ours: 'Simple and intuitive.',
    theirs: 'Moderate. Shows, slides and outputs panels to learn.',
  },
  {
    label: 'Two languages on one slide',
    ours: 'Arm them once. Every verse comes out in all of them.',
    theirs: 'Put together slide by slide.',
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
    ours: 'Ticked from a public archive inside the console.',
    theirs: 'An XML Bible, added to that machine.',
  },
  {
    label: 'The remote',
    ours: 'Any phone browser, from anywhere.',
    theirs: 'Their app, on the same network.',
  },
  {
    label: 'Where the service lives',
    ours: 'In your church account.',
    theirs: 'In files on the computer you built it on.',
  },
  {
    label: 'A volunteer covering on Sunday',
    ours: 'Signs in on whatever computer is there.',
    theirs: 'Needs the machine with the show files.',
  },
  {
    label: 'Keeping it up to date',
    ours: 'Nothing to do. Everyone is on one version.',
    theirs: 'Each machine updates itself.',
  },
];

const SHARED = [
  'Bible search and verse slides',
  'Song lyrics and a song library',
  'Importing a ProPresenter export',
  'Projector output',
  'A stage display',
  'Livestream graphics, including OBS',
  'Custom templates and slide design',
  'A countdown timer',
  'Remote control from a phone',
  'Your own backgrounds and music',
];

const REASONS = [
  {
    title: 'Nothing to install, anywhere',
    body: 'Not on the booth computer, not on the screen at the front, not on the phone in your hand. If it has a '
      + 'browser, it can run its part of the service.',
  },
  {
    title: 'Every screen is a link',
    body: 'The projector, the stage, the stream and the lower third each open on the device that needs them, '
      + 'rather than hanging off the outputs of one machine.',
  },
  {
    title: 'Languages are armed, not assembled',
    body: 'Two or more translations on the same slide, from one passage read once — and a song carries the '
      + 'languages it is sung in the same way. Turning one on mid-service is one click.',
  },
  {
    title: 'Each screen picks its own languages',
    body: 'The congregation can read two while the stage carries one and the stream carries the other — from the '
      + 'same verse, or the same song, you just sent.',
  },
  {
    title: 'The service is not in a folder',
    body: 'It lives in your church account, so the laptop that died on Saturday night is an inconvenience rather '
      + 'than the service.',
  },
  {
    title: 'Nothing to maintain',
    body: 'No installs to update, no versions to keep matched between the booth and the office, no files to carry '
      + 'across on a stick.',
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
    body: 'Show Bible translations side by side without creating separate presentations.',
  },
  {
    title: 'Churches with a livestream',
    body: 'Send Bible verses and lyrics to your stream while your projector and stage display show different content.',
  },
  {
    title: 'Church teams using multiple screens',
    body: 'Keep the projector, stage, and livestream connected to the same presentation.',
  },
  {
    title: 'Churches that prefer browser-based tools',
    body: 'Open the presentation in a browser instead of installing desktop presentation software.',
  },
];

const QUESTIONS = [
  {
    q: `Is ${OURS} a ${THEIRS} alternative?`,
    a: `Yes. ${OURS} is an alternative for churches looking for presentation software with Bible verses, song `
      + 'lyrics, multiple languages, projector output, stage display, livestream graphics, templates, and remote '
      + `control. The biggest difference is that ${OURS} is browser-based.`,
  },
  {
    q: `Is ${OURS} free like ${THEIRS}?`,
    a: `${OURS} has a free plan with the core tools needed to run a church presentation. Pro adds higher limits, `
      + 'more languages, custom templates, more songs, and other features.',
  },
  {
    q: `Is ${OURS} easier to use than ${THEIRS}?`,
    a: `That depends on what you need. ${THEIRS} offers a large number of features and deep control for desktop `
      + `presentations. ${OURS} focuses on a simpler browser-based workflow for running a church service across `
      + 'projector, stage, and livestream.',
  },
  {
    q: `Does ${OURS} work on Mac and Windows?`,
    a: `Yes. ${OURS} runs in a modern web browser, so you can use it on Mac, Windows, and other devices that `
      + 'support a modern browser.',
  },
  {
    q: 'Can I import my ProPresenter songs?',
    a: `Yes. ${OURS} can import song lyrics from a ProPresenter export, so you can bring existing songs into your `
      + 'presentation.',
  },
  {
    q: 'Can I show multiple Bible translations at the same time?',
    a: `Yes. ${OURS} lets you show multiple languages side by side on the same slide and choose which languages `
      + 'appear on each output.',
  },
  {
    q: `Can I use ${OURS} with OBS?`,
    a: `Yes. ${OURS} provides a browser-based livestream output that you can add to OBS as a Browser source.`,
  },
  {
    q: `Does ${OURS} have a stage timer?`,
    a: 'Yes. Stage View includes a timer along with the current slide, next slide, agenda, and clock. You can also '
      + 'use a clean timer-only display.',
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

export default function FreeShowAlternativePage() {
  const COMPARISON = comparison();
  const video = findUseCase('multilingual-church-services')?.video;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">{THEIRS} alternative</p>

        <div className="mt-5 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
              A {THEIRS} alternative for{' '}
              <Marker>modern church services</Marker>
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-site-muted">
              {THEIRS} is a powerful free desktop presenter. {OURS} takes a different approach. It runs in your
              browser and brings Bible verses, song lyrics, multiple languages, projector, stage, livestream,
              templates, and remote control into one online workflow.
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
              src="/images/compare-freeshow.webp"
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
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Looking for a {THEIRS} alternative?</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              {THEIRS} is a popular free and open-source presentation tool for churches. It gives churches a large set
              of features for presenting lyrics, Bible verses, media, and more.
            </p>
            <p>
              {OURS} is built with a different idea: keep the church presentation in the browser and make the setup
              simple. There is nothing to install, and your projector, stage, livestream, and remote control can all
              work from the same web-based system.
            </p>
            <p>
              If you like what {THEIRS} can do but prefer a browser-based workflow, {OURS} may be a better fit. It is
              worth reading the differences below before you move a service across, because the two products are
              built on different ground.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Desktop software or browser-based?</h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
          The biggest difference is how the two products work. Everything else on this page follows from it.
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
            {THEIRS} is a mature project with a wide feature set, and a church running it well is not missing
            anything on a Sunday. What differs is where the software lives and how a service is set up around it —
            and since it costs nothing, none of the rows above are about money.
          </p>
        </div>
      </section>

      <ConsoleDemo video={LIVE_SEARCH_DEMO} />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
          What you get here that {THEIRS} does not
        </h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
          {THEIRS} gives churches a lot of functionality for nothing, and it is a serious project. These six are the
          things it cannot do from where it runs.
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
                One of the main differences in {OURS} is its focus on multilingual church services. Show two or more
                Bible translations on the same slide and choose which languages appear on the projector, stage, or
                livestream.
              </p>
              <p>
                It is the same passage read once and drawn in each language you have armed, so turning a language on
                or off in the middle of a service is one click rather than a second set of slides. Your own
                translation can join them: pick one from a public Bible archive inside the console, or bring a file
                of your own.
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
              {OURS} is designed around three different outputs. Each screen can have its own view while the whole
              service stays connected.
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
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Your presentation lives in the browser</h2>

          <div className="max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
            <p>
              {OURS} does not require a traditional desktop installation. Open the console in your browser and connect
              your screens and devices.
            </p>
            <p>
              This makes it easier to use the same presentation system across different computers and devices. The
              laptop in the booth, the screen at the front of the platform, and the phone in your hand are all
              opening the same service, and a volunteer covering on Sunday signs in rather than installing anything.
            </p>
            <p>
              The other side of that is worth saying plainly: a browser needs a working connection to change what is
              on the screens. Your screens keep showing whatever slide they are on if the connection drops, but a
              building with unreliable internet is the case where installed software has the advantage today. Native
              Mac and Windows apps are being built for exactly that, and they will run a service with the internet
              down.
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
              {THEIRS} is a great option if you want a free and open-source desktop presenter with a large feature set
              and deep control over your presentation, media, outputs, and integrations.
            </p>
            <p>
              If you prefer installed desktop software and want an open-source solution, {THEIRS} may be the better
              fit. If you prefer a browser-based workflow with projector, stage, livestream, multilingual Bible
              presentation, and remote control in one online system, {OURS} is designed for that.
            </p>
            <p>
              If a desktop presenter is what you are weighing up in general, the{' '}
              <Link href="/propresenter-alternative" className="text-site-ink underline underline-offset-4">
                ProPresenter alternative
              </Link>{' '}
              page covers that side of the question, and the{' '}
              <Link href="/stagetimer-alternative" className="text-site-ink underline underline-offset-4">
                StageTimer alternative
              </Link>{' '}
              page covers the church stage timer on its own. If it is the paid, installed kind you are weighing, the{' '}
              <Link href="/easyworship-alternative" className="text-site-ink underline underline-offset-4">
                EasyWorship
              </Link>{' '}
              and{' '}
              <Link href="/proclaim-alternative" className="text-site-ink underline underline-offset-4">
                Proclaim
              </Link>{' '}
              pages cover those.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Who should use {OURS}?</h2>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
            Churches that want browser-based church presentation software with their screens, languages, and timing
            in one place. What it costs depends on how much of it you use, and the{' '}
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
        {THEIRS} is an open-source project owned by its authors, and ProPresenter is a trademark of Renewed Vision,
        LLC. {OURS} is not affiliated with, endorsed by or sponsored by either of them. Their names are used here only
        to say which products we are comparing ourselves with.
      </p>
    </main>
  );
}
