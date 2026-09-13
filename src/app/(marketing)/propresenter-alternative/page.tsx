import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';

import { Art } from '@/components/marketing/Art';
import { BothCover } from '@/components/marketing/BothCover';
import { ConsoleDemo } from '@/components/marketing/ConsoleDemo';
import { Marker } from '@/components/marketing/Marker';
import { Tick } from '@/components/marketing/Tick';
import { TryFreeButton } from '@/components/marketing/TryFreeButton';
import { plansFor, type Plan, type PlanId } from '@/lib/billing/plans';
import { claimedSpots } from '@/lib/billing/seats';
import { findUseCase, LIVE_SEARCH_DEMO } from '@/lib/marketing/useCases';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const TITLE = 'Web-Based ProPresenter Alternative for Churches | LlamaPresenter';

const DESCRIPTION =
  'Looking for a free ProPresenter alternative for churches? LlamaPresenter is browser-based church presentation '
  + 'software for Bible verses, lyrics, multiple languages, projector, stage, livestream, templates and remote '
  + 'control. No install required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/propresenter-alternative' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/propresenter-alternative',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

const OURS = 'LlamaPresenter';
const THEIRS = 'ProPresenter';

const comparison = (PLANS: Record<PlanId, Plan>): { group: string; rows: { label: string; ours: string; theirs: string }[] }[] => [
  {
    group: 'Getting it running',
    rows: [
      {
        label: 'Installation',
        theirs: 'Installed and licensed on every machine.',
        ours: 'None. It runs in any browser.',
      },
      {
        label: 'A volunteer covering on Sunday',
        theirs: 'Needs the machine with the licence.',
        ours: 'Signs in on whatever computer is there.',
      },
      {
        label: 'Learning curve',
        theirs: 'Complex. Layers, cues and messages to learn first.',
        ours: 'Simple and intuitive.',
      },
      {
        label: 'Remote control',
        theirs: 'Their app, on the same network.',
        ours: 'Any phone browser, from anywhere.',
      },
    ],
  },
  {
    group: 'The screens',
    rows: [
      {
        label: 'Display outputs',
        theirs: 'The video outputs of that machine.',
        ours: 'A link each — projector, stage, lower third.',
      },
      {
        label: 'Adding the fourth screen',
        theirs: 'Another seat, at $29 a month.',
        ours: 'Another link, at no cost.',
      },
      {
        label: 'Stage timer and clocks',
        theirs: 'Countdowns on the stage display.',
        ours: 'In Stage View, and on a link of its own.',
      },
      {
        label: 'Livestream overlay',
        theirs: 'An alpha-keyed or network video feed.',
        ours: 'A browser source, straight into OBS.',
      },
    ],
  },
  {
    group: 'Scripture, songs and looks',
    rows: [
      {
        label: 'Multi-language scripture',
        theirs: 'A theme per translation, verse by verse.',
        ours: 'Arm the languages. Every verse comes out in all of them.',
      },
      {
        label: 'Different languages per screen',
        theirs: 'One slide, every screen.',
        ours: 'Each screen shows the languages you give it.',
      },
      {
        label: 'Two languages in a song',
        theirs: 'Both typed into the slide.',
        ours: 'The same as a verse, out of the box.',
      },
      {
        label: 'A Bible in your own language',
        theirs: 'Buy a module, or import a file.',
        ours: 'Over a thousand, from public archives.',
      },
      {
        label: 'Template customization',
        theirs: 'Themes built in the app, on that machine.',
        ours: 'A drag-and-drop editor, in the browser.',
      },
    ],
  },
  {
    group: 'What it costs',
    rows: [
      {
        label: 'Pricing model',
        theirs: '$29 a month a seat, and a seat is a computer.',
        ours: `Free, with no time limit. Pro is ${PLANS.pro.price} ${PLANS.pro.cadence}.`,
      },
    ],
  },
];

const SHARED = [
  'Bible search and verse slides',
  'Song lyrics and a song library',
  'Projector output',
  'A stage display',
  'Livestream graphics',
  'Custom templates and slide design',
  'A countdown timer',
  'Remote control from a phone',
  'Your own backgrounds and music',
  'Lower thirds over the stream',
];

const HEADLINES = [
  {
    title: '100% web-based, zero install',
    body:
      'Run your entire Sunday service from a browser tab. No bulky desktop app, no licence to activate, and no '
      + 'software update waiting for you right before the service starts.',
  },
  {
    title: 'Multi-screen and remote control',
    body:
      'Send distinct feeds to your projector, your stage display and your livestream lower third. Control all of '
      + 'them from a desktop or from your phone.',
  },
  {
    title: 'Fully custom template builder',
    body:
      'Design your own templates for Bible verses and song lyrics. Fonts, backgrounds and layout are yours, on the '
      + 'main screens and on the stream overlay alike.',
  },
];

const THEIRS_IS_BETTER = [
  'Your service runs without reliable internet, today. A native app on a machine in the booth does not care '
    + 'about the building’s wifi; a browser tab does. Our own Mac and Windows apps are on the way for that room.',
  'You build heavy productions — layered media, motion backgrounds cued to the second, props and masks, a video '
    + 'pipeline that other gear on the network subscribes to.',
  'You drive presentation from a lighting or playback desk over MIDI, timecode or the show-control gear that lives '
    + 'in a large auditorium.',
  'Your team already knows it, the licences are bought, and Sunday is not asking for anything it cannot do.',
];

const QUESTIONS = [
  {
    q: 'Is LlamaPresenter a good web based ProPresenter alternative?',
    a: 'Yes, for churches that want a browser-based system instead of installed software. LlamaPresenter covers the '
      + 'core church presentation workflow — Bible verses in multiple languages, song lyrics, projector output, a '
      + 'stage display, livestream graphics and remote control — without anything to download or license.',
  },
  {
    q: 'Is there a free ProPresenter alternative for churches?',
    a: 'LlamaPresenter has a free plan that runs your Bible, both outputs and the stage with no gate on any of them. '
      + 'Pro raises the limits — more languages, more songs, custom templates — for churches that outgrow Free.',
  },
  {
    q: 'Can I bring my songs over?',
    a: 'Yes. Drop a ProPresenter 7 document or bundle on the console and we read the lyrics out of it, slide by '
      + 'slide, and make songs of them. It is the words we take, not the layout — the look comes from your template '
      + 'here. If a bundle carries more songs than your plan holds, you pick the ones you are singing rather than '
      + 'being refused the file.',
  },
  {
    q: 'Do I have to replace ProPresenter to try this?',
    a: 'No, and most churches should not start by trying. Open the console on a laptop, send the projector its link, '
      + 'and run one midweek service on it. Nothing has been uninstalled and nothing has been paid for.',
  },
  {
    q: 'What happens if the internet drops mid-service?',
    a: 'The screens keep showing whatever slide they are on — they do not go blank. What you lose until it comes '
      + 'back is the ability to change it. If your building’s connection is genuinely unreliable, that is the honest '
      + 'reason to stay on a native app for now — and the reason we are building Mac and Windows apps of our own, '
      + 'which will run a service with no connection.',
  },
  {
    q: 'Does the projector machine need an account?',
    a: 'No. Every output is an unguessable link, and whoever opens it sees that session and nothing else. Only the '
      + 'person running the console signs in.',
  },
  {
    q: 'Where do my backgrounds and music live?',
    a: 'On the machine running the console, held by the browser. We keep the names and settings, not the files — '
      + 'which is why they cost you nothing, and why you copy them over when you move to a different computer.',
  },
  {
    q: 'Is this made by ProPresenter?',
    a: 'No. LlamaPresenter is a separate product, and ProPresenter is a trademark of its own owner. We read their '
      + 'song files because churches asked us to, not because there is any arrangement between us.',
  },
];

export const revalidate = 60;

export default async function ProPresenterAlternativePage() {
  const PLANS = plansFor(await claimedSpots());
  const COMPARISON = comparison(PLANS);
  const video = findUseCase('multilingual-church-services')?.video;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">{THEIRS} alternative</p>

        <div className="mt-5 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
              A {THEIRS} alternative that runs in <Marker>your browser</Marker>
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-site-muted">
              {THEIRS} is a capable desktop presenter used by churches everywhere. {OURS} takes a different approach:
              no install, no license to activate, and Bible verses in any language, side by side, song lyrics, stage
              timers and lower thirds all in one browser tab.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <TryFreeButton
                className="rounded-studio bg-site-accent px-6 py-3.5 text-[17px] font-medium text-site-onaccent
                  shadow-sm transition-colors duration-150 hover:bg-site-accent/85 disabled:opacity-70"
              >
                Start free in browser
              </TryFreeButton>

              <Link
                href="#table"
                className="rounded-studio border border-site-rule px-6 py-3.5 text-[17px] text-site-ink
                  transition-colors duration-150 hover:bg-site-band"
              >
                Compare with {THEIRS}
              </Link>
            </div>

            <p className="mt-4 text-sm text-site-faint">Zero setup. No app downloads. Works on any device.</p>
          </div>

          <div className="lg:-mr-6">
            <Image
              src="/images/compare-propresenter.webp"
              alt={`The ${OURS} console open in a browser on one laptop, with ${THEIRS} running on a second laptop `
                + 'beside it'}
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
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 sm:py-16 md:grid-cols-3">
          {HEADLINES.map(item => (
            <div key={item.title} className="rounded-studio-lg border border-site-rule bg-site-bg p-6">
              <h2 className={`${DISPLAY} text-xl`}>{item.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="table" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
          {OURS} vs {THEIRS}
        </h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
          Only the rows where the two part company, in the order a church tech team meets them: getting it running,
          getting it onto the screens, what goes on those screens, and what it costs. What both do is listed under
          the table.
        </p>

        <div
          className="mt-10 overflow-x-auto rounded-studio-lg border border-site-rule bg-site-surface lg:overflow-visible"
        >
          <table className="w-full min-w-3xl border-separate border-spacing-0 text-left align-top">
            <caption className="sr-only">
              {OURS} compared with {THEIRS}, row by row
            </caption>

            <thead>
              <tr>
                <th
                  className="site-pinhead w-[22%] bg-site-surface py-4 pr-6 pl-5 sm:pl-8 text-left text-sm font-normal
                    text-site-faint"
                >
                  <span className="sr-only">What is being compared</span>
                </th>

                <th
                  scope="col"
                  className="site-pinhead w-[39%] bg-[color-mix(in_oklab,var(--color-site-accent)_18%,var(--color-site-surface))] px-6 py-4 text-left
                    text-[15px] font-semibold text-site-ink"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-site-accent" />
                    {OURS}
                  </span>
                </th>

                <th
                  scope="col"
                  className="site-pinhead w-[39%] bg-site-surface py-4 pr-5 pl-6 text-left
                    text-[15px] font-semibold text-site-muted sm:pr-8"
                >
                  {THEIRS}
                </th>
              </tr>
            </thead>

            <tbody>
              {COMPARISON.map(section => (
                <Fragment key={section.group}>
                  <tr>
                    <th
                      scope="colgroup"
                      className="border-t border-site-rule pt-8 pb-2 pl-5 text-left text-[11px] font-semibold sm:pl-8
                        tracking-wider text-site-faint uppercase"
                    >
                      {section.group}
                    </th>
                    <td className="border-t border-site-rule bg-site-accent/18" />
                    <td className="border-t border-site-rule" />
                  </tr>

                  {section.rows.map(row => (
                    <tr key={row.label} className="align-top">
                      <th
                        scope="row"
                        className="py-5 pr-6 pl-5 text-left text-[15px] font-medium text-site-ink sm:pl-8"
                      >
                        {row.label}
                      </th>

                      <td className="bg-site-accent/18 px-6 py-5 text-[15px] leading-relaxed font-semibold
                        text-site-ink">
                        <span className="flex gap-2.5">
                          <Tick className="mt-[6px] size-3.5 shrink-0 text-site-ink" />
                          <span>{row.ours}</span>
                        </span>
                      </td>

                      <td className="py-5 pr-6 pl-6 text-[15px] leading-relaxed text-site-muted sm:pr-8">
                        {row.theirs}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}

            </tbody>
          </table>
        </div>

        <BothCover theirs={THEIRS} items={SHARED} />
      </section>

      <ConsoleDemo video={LIVE_SEARCH_DEMO} />

      <Detail
        title="Multi-screen output, without a video card"
        visual={
          <Art
            src="/images/features/outputs.webp"
            alt="One session feeding a stage display, a projector slide and a transparent stream overlay, each at its own link"
          />
        }
      >
        <p>
          With a desktop presenter, one computer is the service: it holds the licence, the files and every video
          output, and how many screens you can feed is a question about that machine.
        </p>
        <p>
          Here every output is a URL. The projector opens one, the stage display another, and OBS, vMix or whatever
          you stream with takes a third as a browser source. Open as many as you need, on as many machines as you
          like — none of them signs in, and none of them holds a copy of your media.
        </p>
      </Detail>

      <Detail
        flip
        title="A template builder for verses and lyrics"
        visual={
          <Art
            src="/images/features/template-editor.webp"
            alt="The template editor with a lyric text box selected and its size, case, colour and outline in the panel beside it"
          />
        }
      >
        <p>
          Drag boxes onto a 16:9 frame and put the verse, the reference, the lyric or a picture where you want them.
          Fonts, colours, backgrounds and layout are yours, for the projector and for the stream overlay alike, and
          the same template comes out right on a 4K wall and in the preview beside you.
        </p>
        <p>
          It is also where your old library lands. Drop a{' '}
          <code className="rounded bg-site-band px-1.5 py-0.5 text-[0.9em]">.pro</code> file or a whole{' '}
          <code className="rounded bg-site-band px-1.5 py-0.5 text-[0.9em]">.proBundle</code> from {THEIRS} 7 on the
          console and we read the lyrics out of it in slide order — the words come across, and the look comes from
          your template here.
        </p>
      </Detail>

      <Detail
        title="Dual-language Bible verses, side by side"
        visual={
          <Art
            src="/images/features/languages.webp"
            alt="A slide carrying the same verse in Georgian and English, beside the panel that arms each language"
          />
        }
      >
        <p>
          Arm the languages your congregation reads and every verse you send comes out stacked on one slide, in the
          order you set, with the projector and the stream agreeing about it.
        </p>
        <p>
          Nothing is duplicated and nothing is pasted: it is the same passage, read out of our own copy of each
          translation, so turning a language off mid-service is one click rather than a different set of slides.
        </p>
        <p>
          Your language does not have to be one of ours. The console browses public Bible archives — over a thousand
          translations in hundreds of languages — and fetches the one you tick, with nothing to download and nothing to
          upload. It then reads exactly like the ones we ship, side by side with them on the same slide.
        </p>
      </Detail>

      <Detail
        flip
        title="A stage display and timers built for the platform"
        visual={
          <Art
            src="/images/features/stage-timer.webp"
            alt="The stage display showing the current verse, the next one, the clock, the running order and a countdown"
          />
        }
      >
        <p>
          The stage display carries the slide on screen now, the one coming next, the clock, the running order and a
          countdown the speaker can read from the platform — or just the countdown, when that is all they want. Set
          up your timers for the run of the service, start and adjust them mid-service, and send a message to the
          platform without anybody in the room seeing it.
        </p>
        <p>
          It is a link like the others, so the screen at the front of the platform is a cheap stick or an old laptop
          rather than another licensed seat.
        </p>
      </Detail>

      <Detail
        title="Run it from your phone, from anywhere in the room"
        visual={
          <Art
            src="/images/features/remote-phone.webp"
            alt="The same session open on a laptop and on a phone, the same card selected on both"
          />
        }
      >
        <p>
          Open the session on your phone and you have the console: move through the slides, change what is showing,
          fire a name card. There is no remote app to install and nothing to pair — it is the same address.
        </p>
        <p>
          A second person can open it too, on their own laptop, and both of you see the same live slide.
        </p>
      </Detail>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>When to stay with {THEIRS}</h2>
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-site-muted">
              We would rather you read this here than find it out on a Sunday. {THEIRS} has had two decades to grow a
              production toolkit, and there are rooms it fits and we do not.
            </p>
          </div>

          <ul className="space-y-4">
            {THEIRS_IS_BETTER.map(item => (
              <li
                key={item}
                className="rounded-studio-lg border border-site-rule bg-site-bg p-5 text-[16px] leading-relaxed
                  text-site-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto max-w-7xl px-6 pb-16 text-[15px] leading-relaxed text-site-muted sm:pb-24">
          Comparing a specific piece of your setup rather than the whole app? See how the built-in{' '}
          <Link href="/stagetimer-alternative" className="text-site-ink underline underline-offset-4">
            stage timer
          </Link>{' '}
          stacks up against a dedicated timer, or how we read a library exported from a{' '}
          <Link href="/freeshow-alternative" className="text-site-ink underline underline-offset-4">
            free, open-source presenter
          </Link>{' '}
          or a subscription one such as{' '}
          <Link href="/easyworship-alternative" className="text-site-ink underline underline-offset-4">
            EasyWorship
          </Link>{' '}
          or{' '}
          <Link href="/proclaim-alternative" className="text-site-ink underline underline-offset-4">
            Proclaim
          </Link>
          .
        </p>
      </section>

      {video ? <ConsoleDemo video={video} /> : null}

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Questions about switching</h2>

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
              Try it on a midweek service.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              Nothing to install and nothing to cancel. Open the console, send the projector its link, and put a verse
              on the wall — {THEIRS} is still sitting there on Sunday if it does not suit you.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-studio bg-studio-accent px-6 py-3 font-medium text-studio-onaccent
                transition-colors duration-150 hover:bg-studio-accent/85"
            >
              Start free
            </Link>

            <Link
              href="/pricing"
              className="rounded-studio border border-studio-border px-6 py-3 font-medium text-studio-text
                transition-colors duration-150 hover:bg-studio-panel"
            >
              See the plans
            </Link>
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-7xl px-6 pt-10 pb-12 text-sm leading-relaxed text-site-faint">
        {THEIRS} is a trademark of Renewed Vision, LLC. {OURS} is not affiliated with, endorsed by or sponsored by
        Renewed Vision. Product names are used here only to say which product we are comparing ourselves with.
      </p>
    </main>
  );
}

const Detail = ({
  title,
  children,
  visual,
  flip,
}: {
  title: string;
  children: React.ReactNode;
  visual: React.ReactNode;
  flip?: boolean;
}) => (
  <section className="mx-auto max-w-7xl px-6 py-8 sm:py-12">
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? 'lg:order-last' : undefined}>
        <h2 className={`${DISPLAY} max-w-md text-3xl leading-[1.1] sm:text-4xl`}>{title}</h2>
        <div className="mt-5 max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">{children}</div>
      </div>
      <div>{visual}</div>
    </div>
  </section>
);
