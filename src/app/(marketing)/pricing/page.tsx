import Link from 'next/link';

import { FoundingSpots } from '@/components/marketing/FoundingSpots';
import { Monitor } from '@/components/marketing/Monitor';
import { CadenceProvider } from '@/components/marketing/cadence';
import { PricingCards } from '@/components/marketing/PricingCards';
import { savingOf, soldOut, tierNow } from '@/lib/billing/founding';
import { bothPlansFor } from '@/lib/billing/plans';
import { claimedSpots } from '@/lib/billing/seats';

export const metadata = {
  title: 'Pricing',
  description:
    'Free covers the Bible, the projector, the stage and your stream. Pro costs less the earlier you join, and '
    + 'the rate you join on is yours for as long as you stay.',
};

export const revalidate = 60;

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const foundingQuestion = (claimed: number) =>
  soldOut(claimed)
    ? {
        q: 'Why do some subscribers pay less?',
        a: 'The first fifteen signed up early, at $9 or $14, and they keep that rate. Those spots are gone.',
      }
    : {
        q: `Is the ${tierNow(claimed).monthly.price} really forever?`,
        a: 'Yes, for as long as you keep your Pro plan. Join at $9 and you pay $9 every month after that. The same '
          + 'goes for $14, and for the yearly price beside it. What changes is the price for the next subscriber, '
          + 'never yours.',
      };

const yearlyQuestion = (claimed: number) => {
  const tier = tierNow(claimed);

  return {
    q: 'What is the difference between paying monthly and yearly?',
    a: `Only what it costs. A year is ten months' worth — ${tier.annual.price} instead of `
      + `${tier.monthly.price} a month — so paying yearly saves you ${savingOf(tier)}. Everything in the plan is `
      + 'the same either way, and you can cancel either one from the console.',
  };
};

const QUESTIONS = [
  {
    q: 'Is Free really free?',
    a: 'Yes. There is no card required and no trial period. A church that only puts verses on the screen can run '
      + 'every service on Free and never pay us anything.',
  },
  {
    q: 'What actually changes when I pay?',
    a: 'The numbers, and nothing else. There is no feature Pro can do that Free cannot — Pro lifts the ceilings on '
      + 'how many songs, tracks, running orders, name cards and looks of your own you can keep.',
  },
  {
    q: 'What happens to my work if I stop paying?',
    a: 'It stays exactly where it is. A ceiling only ever refuses something new: going back to Free never deletes a '
      + 'song, a playlist or a template you made, and you can still open, reorder and remove them.',
  },
  {
    q: 'Do you carry my language?',
    a: 'We carry Georgian, English, Russian, Greek, Arabic and Latin, and every other language is a Bible you add '
      + 'yourself — the console browses public archives holding over a thousand of them and fetches the one you tick. '
      + 'A Bible you add reads exactly like ours and sits beside them on the same slide. Free covers one; Pro makes '
      + 'it unlimited.',
  },
  {
    q: 'Do I need an account for the projector machine?',
    a: 'No. Every output — the projector, the stage display and the lower third — is a link you open on that machine. '
      + 'Only the person running the console signs in.',
  },
  {
    q: 'Where do my backgrounds and music live?',
    a: 'On the machine running the console, not on our servers. That is why they cost you nothing to keep, and why '
      + 'you copy them over when you move to a different computer.',
  },
  {
    q: 'How do I cancel?',
    a: 'From the console, in the account panel, in two clicks. It runs to the end of the month you have paid for, and '
      + 'then the account is a Free one again.',
  },
];

export default async function PricingPage() {
  const claimed = await claimedSpots();
  const plans = bothPlansFor(claimed);
  const gone = soldOut(claimed);

  return (
    <CadenceProvider>
      <main className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div>
            <p className="text-sm font-medium tracking-wide text-site-faint uppercase">Pricing</p>

            <h1 className={`${DISPLAY} mt-5 text-4xl sm:text-5xl`}>
              {gone ? 'Simple pricing for your church' : 'Start early. Keep your price.'}
            </h1>

            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-site-muted">
              {gone
                ? 'Free covers the Bible, the projector, the stage and your stream. Pro lifts the ceilings.'
                : 'LlamaPresenter is $9/month for the first 10 subscribers. After those spots are gone, the price '
                  + 'moves to $14 for the next 5, then $19/month after that. Pay yearly and you get two months '
                  + 'free on any of them. The price you join at stays yours as long as you keep your Pro plan.'}
            </p>

            <FoundingSpots claimed={claimed} />
          </div>

          <Monitor
            src="/images/console-timer.webp"
            alt="The console on a desk monitor: the stage timer counting down beside the current and next slide, the
              agenda and the stage messages, with the projector carrying the live verse"
            aspect="2000/1060"
            sizes="(min-width: 1024px) 36rem, 100vw"
          />
        </div>

        <PricingCards plans={plans} />

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-site-faint">
          Three languages on a slide is the one number Pro does not make unlimited. It is how many fit before a
          slide stops being readable from the back of the room, and not something we would charge for.
        </p>

        <section className="mt-20">
          <h2 className={`${DISPLAY} text-2xl sm:text-3xl`}>Questions about pricing</h2>

          <div className="mt-10 gap-x-12 sm:columns-2 lg:columns-3">
            {[foundingQuestion(claimed), yearlyQuestion(claimed), ...QUESTIONS].map(item => (
              <div key={item.q} className="mb-8 break-inside-avoid">
                <h3 className="text-[17px] leading-snug font-medium text-site-ink">{item.q}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-site-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 flex flex-col items-start gap-6 rounded-studio-lg border border-site-rule bg-site-band px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className={`${DISPLAY} text-2xl`}>Start on Free.</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-site-muted">
              Open the console, send the projector its link, and put a verse on the wall. Move to Pro the week you run
              out of room.
            </p>
          </div>

          <Link
            href="/login"
            className="shrink-0 rounded-studio bg-site-ink px-6 py-3 text-sm font-medium text-white transition-colors
              duration-150 hover:bg-site-ink/85"
          >
            Open the console
          </Link>
        </section>
      </main>
    </CadenceProvider>
  );
}
