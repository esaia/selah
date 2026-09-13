import Link from 'next/link';

import { Art } from '@/components/marketing/Art';
import { Frame } from '@/components/marketing/Frame';
import { HeroScene } from '@/components/marketing/HeroScene';
import { FoundingSpots } from '@/components/marketing/FoundingSpots';
import { CadenceProvider } from '@/components/marketing/cadence';
import { HomePlanCards } from '@/components/marketing/HomePlanCards';
import { Marker } from '@/components/marketing/Marker';
import { ScrollZoom } from '@/components/marketing/ScrollZoom';
import { TryFreeButton } from '@/components/marketing/TryFreeButton';
import { Vignette } from '@/components/marketing/Vignette';
import { DemoVideo } from '@/components/marketing/DemoVideo';
import { bothPlansFor } from '@/lib/billing/plans';
import { claimedSpots } from '@/lib/billing/seats';
import { FAQ } from '@/lib/marketing/faq';

const TITLE = 'Web-Based Church Presentation Software';

const DESCRIPTION =
  'LlamaPresenter is browser-based church presentation software: dual language Bible verse display, worship song '
  + 'lyrics, projector, stage display, livestream lower thirds and a phone remote. Free church projection '
  + 'software with nothing to install.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/',
    title: `${TITLE} | LlamaPresenter`,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: `${TITLE} | LlamaPresenter`, description: DESCRIPTION },
};

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block rounded-full bg-site-accent/35 px-2.5 py-1 text-[13px] font-medium text-site-ink">
    {children}
  </span>
);

type FeatureLink = { label: string; href: string };

const Feature = ({
  id,
  title,
  children,
  tags,
  links,
  visual,
  flip,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  tags?: string[];
  links?: FeatureLink[];
  visual: React.ReactNode;
  flip?: boolean;
}) => (
  <section id={id} className="mx-auto max-w-7xl scroll-mt-20 px-6 py-8 sm:py-12">
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? 'lg:order-last' : undefined}>
        <h2 className={`${DISPLAY} max-w-md text-3xl leading-[1.1] sm:text-4xl`}>{title}</h2>
        <div className="mt-5 max-w-prose space-y-4 text-[17px] leading-relaxed text-site-muted">{children}</div>

        {tags?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        ) : null}

        {links?.length ? (
          <ul className="mt-5 space-y-1.5">
            {links.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[15px] text-[#065985] underline decoration-dotted decoration-[#065985]/60
                    underline-offset-4 transition-opacity hover:opacity-75"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div>{visual}</div>
    </div>
  </section>
);

export const revalidate = 60;

export default async function HomePage() {
  const claimed = await claimedSpots();
  const plans = bothPlansFor(claimed);

  return (
    <main>
      <section>
        <div
          className="mx-auto grid max-w-7xl items-center gap-14 px-6 pt-12 pb-8
            sm:pt-16 lg:grid-cols-[1fr_0.9fr] lg:gap-12"
        >
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[1.0]`}>
              Simple Church{' '}
              <Marker>Presentation</Marker>{' '}
              Software
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[54ch] text-lg leading-relaxed text-site-muted">
              Web-based worship presentation software for scripture, lyrics, announcements and media. Show verses
              in multiple languages side by side so everyone can follow along — in any language, including Bibles
              you add yourself. Ideal for multilingual congregations.
            </p>

            <TryFreeButton
              className="mt-9 flex w-full max-w-md items-center justify-center rounded-studio bg-site-accent px-6 py-4
                text-lg font-medium text-site-onaccent shadow-sm transition-colors duration-150 hover:bg-site-accent/85
                disabled:opacity-70"
            >
              Try for free in the browser
            </TryFreeButton>

            <p className="mt-4 text-sm text-site-faint">No credit card or signup required</p>
          </div>

          <HeroScene />
        </div>
      </section>

      <Vignette>
        <section id="room" className="mt-16 scroll-mt-20 border-y border-site-rule bg-site-band">
          <div className="py-16 sm:py-24">
            <ScrollZoom
              intro={
                <div className="mx-auto max-w-3xl px-6 text-center">
                  <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>
                    Everything you need for your next service
                  </h2>
                  <p className="mt-5 text-[17px] leading-relaxed text-site-muted">
                    Show Bible verses, lyrics, announcements, and media across your projector, stage display, and
                    livestream. Switch languages, control your service from your phone, and create your own look with
                    flexible templates.
                  </p>
                </div>
              }
            >
              <Frame url="llamapresenter.com/studio" paneClassName="aspect-[10000/5622]" className="shadow-site-frame">
                <DemoVideo />
              </Frame>
            </ScrollZoom>
          </div>
        </section>
      </Vignette>

      <Feature
        id="languages"
        title="One service. Every language."
        tags={['English', 'Georgian', 'Ukrainian', 'Greek', 'Add your own']}
        links={[{ label: 'Multilingual church services', href: '/use-cases/multilingual-church-services' }]}
        visual={
          <Art
            src="/images/features/languages.webp"
            alt="A slide carrying the same verse in Georgian and English, beside the panel that arms each language and picks its translation"
          />
        }
      >
        <p>
          Choose which languages appear on the projector, stage display, or livestream and turn them on or off whenever
          you need.
        </p>
      </Feature>

      <Feature
        flip
        title="Give your team the view they need"
        tags={['Current slide', 'Next slide', 'Clock', 'Agenda', 'Timer']}
        links={[
          { label: 'Stage display', href: '/use-cases/stage-display' },
          { label: 'Service timing', href: '/use-cases/service-timing' },
        ]}
        visual={
          <Art
            src="/images/features/stage-timer.webp"
            alt="The stage display: the verse on screen now, the one coming next, the clock, the agenda and a countdown"
          />
        }
      >
        <p>
          See the current slide, next slide, clock, agenda, and timer in Stage View. Show only the timer on your stage
          display when you need a clean view.
        </p>
      </Feature>

      <Feature
        title="Your content. Your style."
        tags={['Size', 'Case', 'Colour', 'Outline', 'Plate']}
        links={[{ label: 'Slide templates', href: '/use-cases/church-slide-templates' }]}
        visual={
          <Art
            src="/images/features/template-editor.webp"
            alt="The template editor: a text box selected on the canvas, with its size, case, colour, alignment, outline and plate in the panel beside it"
          />
        }
      >
        <p>
          Start with beautiful ready-made templates or create your own. Design custom looks for Bible verses and lyrics
          on your projector and livestream.
        </p>
      </Feature>

      <Feature
        flip
        title="Three screens. One service."
        tags={['Projector', 'Stage display', 'Livestream']}
        links={[
          { label: 'Livestream graphics', href: '/use-cases/church-livestream-graphics' },
          { label: 'Lower thirds', href: '/use-cases/lower-thirds' },
        ]}
        visual={
          <Art
            src="/images/features/outputs.webp"
            alt="One link feeding the stage display, the projector slide and a stream overlay on a transparent background"
          />
        }
      >
        <p>
          Control your projector, stage display, and livestream from one place. Each screen gets exactly what it needs,
          while your team stays in sync.
        </p>
      </Feature>

      <Feature
        title="Control your service from your phone"
        tags={['Remote control', 'QR code', 'No app to install']}
        links={[{ label: 'Phone remote control', href: '/use-cases/phone-remote-control' }]}
        visual={
          <Art
            src="/images/features/remote-phone.webp"
            alt="The lower-third panel open on a laptop and on a phone, the same card selected on both"
          />
        }
      >
        <p>
          Move through slides and control your presentation right from your phone. Stay close to the service instead of
          being tied to the computer.
        </p>
      </Feature>

      <CadenceProvider>
        <section className="border-y border-site-rule bg-site-band">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:py-24 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <div>
              <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Pay only when you outgrow it.</h2>
              <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-site-muted">
                Putting scripture on the screen costs nothing — the whole Bible, the projector, the stage display and
                the lower third, with no trial and no time limit. Pro is for teams that also run songs, music and their
                own templates every week.
              </p>
              <FoundingSpots claimed={claimed} className="mt-8" />

              <Link href="/pricing" className="mt-6 inline-block text-[17px] text-site-ink underline underline-offset-4">
                See what each plan includes
              </Link>
            </div>

            <HomePlanCards plans={plans} />
          </div>
        </section>
      </CadenceProvider>

      <section id="faq" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16 sm:py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Frequently asked questions</h2>

          <Link href="/faq" className="text-[15px] text-site-ink underline underline-offset-4">
            Open the full FAQ
          </Link>
        </div>

        <div className="mt-12 gap-x-14 sm:columns-2">
          {FAQ.map(item => (
            <div key={item.q} className="mb-9 break-inside-avoid">
              <h3 className="text-[19px] leading-snug font-semibold text-site-ink">{item.q}</h3>
              <p className="mt-2.5 text-[16px] leading-relaxed text-site-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-studio-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-valera text-3xl leading-[1.1] tracking-tight text-studio-text sm:text-4xl">
              Free for every church, forever.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              No credit card, no install. Open the console, send the projector its link, and put scripture on the
              wall in minutes.
            </p>
          </div>

          <Link
            href="/login"
            className="rounded-studio bg-studio-accent px-6 py-3 font-medium text-studio-onaccent
              transition-colors duration-150 hover:bg-studio-accent/85"
          >
            Start free
          </Link>
        </div>
      </section>
    </main>
  );
}
