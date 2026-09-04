import Link from 'next/link';

import { Frame } from '@/components/marketing/Frame';
import { NameCardMock } from '@/components/marketing/NameCardMock';
import { HeroScene } from '@/components/marketing/HeroScene';
import { ScreenTiles } from '@/components/marketing/ScreenTiles';
import { SlideMock } from '@/components/marketing/SlideMock';
import { StageMock } from '@/components/marketing/StageMock';
import { PLANS } from '@/lib/billing/plans';

/* The two type roles for the page: the rounded display face the brand is drawn
   in, and the interface stack for everything read as a sentence. */
const DISPLAY = 'font-valera tracking-tight text-site-ink';

/** A feature: a paragraph on one side, a screen on the other. */
const Feature = ({
  id,
  title,
  children,
  visual,
  flip,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  visual: React.ReactNode;
  flip?: boolean;
}) => (
  <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 sm:py-24">
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? 'lg:order-last' : undefined}>
        <h2 className={`${DISPLAY} max-w-md text-3xl leading-[1.1] sm:text-4xl`}>{title}</h2>
        <div className="mt-5 max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">{children}</div>
      </div>
      <div>{visual}</div>
    </div>
  </section>
);

const SMALL = [
  {
    title: 'Psalms line up',
    body: 'Translations disagree about where the psalms divide. Type one reference and every language on the slide lands on the verse it actually is.',
  },
  {
    title: 'Songs come across',
    body: 'Import a ProPresenter library and the lyrics arrive as slides you can step through, in the order the band plays them.',
  },
  {
    title: 'Your own typefaces',
    body: 'Paste a Google Fonts family or a link to a font file and it is on the wall. Nothing to install on the projector machine.',
  },
  {
    title: 'A screen can join late',
    body: 'A projector switched on halfway through the service opens the link and is already showing the verse the room is on.',
  },
  {
    title: 'Backgrounds stay yours',
    body: 'Your images and music live on your computer, not in our storage. The projector pulls them from you directly when it needs them.',
  },
  {
    title: 'Two clicks to black',
    body: 'Take the screen down without losing your place. The verse is still armed underneath when you bring it back.',
  },
];

const FAQ = [
  {
    q: 'Does anything need installing?',
    a: 'No. The console, the projector and the stage display are browser tabs, and the stream overlay is an OBS browser source. The machine at the back of the room needs a browser and nothing else.',
  },
  {
    q: 'How does the projector know which session it belongs to?',
    a: 'Each session has its own unguessable link. Whoever opens it sees that session and nothing else — which is why the projector needs no account and no password. Treat the link the way you would a meeting link.',
  },
  {
    q: 'Which translations can I use?',
    a: 'Six languages and seventeen translations, and any three of them can share a slide. The text comes out of our own database rather than a third-party API, so a service never depends on somebody else being up.',
  },
  {
    q: 'What happens if the internet drops mid-service?',
    a: 'Whatever is on the screens stays there. The outputs count their own clocks, so a countdown keeps running, and when the connection returns the next slide goes through as normal.',
  },
  {
    q: 'Can two people run it at once?',
    a: 'Yes. The console is a browser tab, so a second operator can open the same session on their own laptop and both see the same live slide.',
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ------------------------------------------------------------- hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-8 sm:pt-16">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[1.0]`}>
              Simple Church Presentation Software
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[54ch] text-lg leading-relaxed text-site-muted">
              Present scripture, lyrics, announcements, and media from one browser-based tool. Display verses in
              multiple languages side by side so everyone can follow along, ideal for multilingual congregations.
            </p>

            <Link
              href="/login"
              className="mt-9 flex w-full max-w-md items-center justify-center rounded-studio bg-site-accent px-6 py-4
                text-lg font-medium text-site-onaccent shadow-sm transition-transform duration-150 hover:-translate-y-px"
            >
              Try for free in the browser
            </Link>

            <p className="mt-4 text-sm text-site-faint">No credit card or signup required</p>
          </div>

          <HeroScene />
        </div>
      </section>

      {/* -------------------------------------------------------- the links */}
      <section id="room" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>One console, and three links.</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-site-muted">
            You sign in. Nothing else does. Every other screen in the building opens an address of its own and starts
            following the console — so the projector machine, the streaming laptop and the stage monitor need a browser
            and nothing more.
          </p>
        </div>

        <div className="mt-12">
          <ScreenTiles />
        </div>
      </section>

      {/* ------------------------------------------------- what they see */}
      <section className="mt-16 border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
            <div>
              <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
                Built for the person at the back of the room.
              </h2>
              <div className="mt-5 max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">
                <p>
                  Type “John 14:6-7” and it is on the wall. The whole chapter loads with it, so stepping to the next
                  verse costs nothing — no waiting, no second search, no dead air while somebody finds the passage.
                </p>
                <p>
                  The console is dark because a volunteer sits in front of it for an hour in a dim room, and the keys
                  are the ones your hands already know: arrows to step, space to hold, a single key to go to black.
                </p>
              </div>
            </div>

            <Frame
              url="llamapresenter.com/studio"
              label="Screenshot of the console — the passage box, the slide list and the live preview"
              paneClassName="aspect-16/10"
              className="shadow-site-frame"
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- features */}
      <Feature
        id="languages"
        title="Several languages, stacked the way your congregation reads them."
        visual={
          <Frame url="llamapresenter.com/show/8f3c…" className="shadow-site-frame">
            <SlideMock />
          </Frame>
        }
      >
        <p>
          Seventeen translations across six languages, and any three of them can share a slide, in whatever order your
          congregation reads them. Each one keeps its own book names and its own verse numbering.
        </p>
        <p>
          That last part matters more than it sounds. Translations do not agree about where the psalms divide, so one
          reference can be three different verses. LlamaPresenter reconciles them, and the line on the wall is the line
          being read from the front.
        </p>
      </Feature>

      <Feature
        flip
        title="A clock the person on stage can trust."
        visual={
          <Frame url="llamapresenter.com/stage/8f3c…" className="shadow-site-frame">
            <StageMock />
          </Frame>
        }
      >
        <p>
          The stage display shows what is on the screen now, what is coming next, and how long is left. Give the
          preacher five more minutes and the number changes under them without anyone waving from the back.
        </p>
        <p>
          Nothing about the countdown travels over the network second by second. Each screen counts its own, so a slow
          connection shows the same time as the console rather than drifting behind it.
        </p>
      </Feature>

      <Feature
        title="Name the person speaking, then forget about it."
        visual={
          <Frame url="llamapresenter.com/lower3rd/8f3c…" className="shadow-site-frame">
            <NameCardMock />
          </Frame>
        }
      >
        <p>
          Keep your preachers, worship leaders and guests in a list, pick one of five finished designs, and send their
          name to the lower third. It holds for a few seconds and takes itself away.
        </p>
        <p>
          The card goes to the stream alone. The projector keeps its verse and the stage keeps its clock, so nobody in
          the hall sees a graphic meant for the people at home.
        </p>
      </Feature>

      {/* ------------------------------------------------------- small print */}
      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className={`${DISPLAY} max-w-lg text-3xl leading-[1.1] sm:text-4xl`}>
            The small things a service actually turns on.
          </h2>

          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {SMALL.map(item => (
              <div key={item.title} className="border-t border-site-rule pt-4">
                <h3 className="text-base font-medium text-site-ink">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-site-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ price */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Free is a real plan.</h2>
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-site-muted">
              A congregation putting scripture on a screen never has to pay us. Pro is for the teams running songs,
              music and their own look on top of it.
            </p>
            <Link href="/pricing" className="mt-6 inline-block text-[17px] text-site-ink underline underline-offset-4">
              Compare the two plans
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {Object.values(PLANS).map(plan => (
              <div
                key={plan.id}
                className={
                  plan.id === 'pro'
                    ? 'rounded-studio-lg border border-site-ink bg-site-surface p-6'
                    : 'rounded-studio-lg border border-site-rule p-6'
                }
              >
                <h3 className="text-sm text-site-muted">{plan.name}</h3>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className={`${DISPLAY} text-4xl`}>{plan.price}</span>
                  <span className="text-sm text-site-faint">{plan.cadence}</span>
                </p>
                <ul className="mt-5 space-y-2 text-[15px] text-site-muted">
                  {plan.highlights.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- faq */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-16 sm:py-24">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Questions we get asked</h2>

        <div className="mt-10">
          {FAQ.map(item => (
            <details key={item.q} className="group border-t border-site-rule py-5 last:border-b">
              <summary className="flex items-start justify-between gap-6 text-[17px] text-site-ink marker:content-none">
                {item.q}
                <span
                  aria-hidden
                  className="mt-1 shrink-0 text-site-faint transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-prose text-[16px] leading-relaxed text-site-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- last word */}
      <section className="bg-studio-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-valera text-3xl leading-[1.1] tracking-tight text-studio-text sm:text-4xl">
              Sunday is in six days.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              Set it up in the time it takes to make coffee. Open the console, send the projector its link, and put a
              verse on the wall.
            </p>
          </div>

          <Link
            href="/login"
            className="rounded-studio bg-studio-accent px-6 py-3 font-medium text-studio-onaccent
              transition-transform duration-150 hover:-translate-y-px"
          >
            Start free
          </Link>
        </div>
      </section>
    </main>
  );
}
