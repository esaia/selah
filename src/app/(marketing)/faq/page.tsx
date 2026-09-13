import { FAQ } from '@/lib/marketing/faq';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const TITLE = 'Frequently Asked Questions';

const DESCRIPTION =
  'Answers to what LlamaPresenter is, what it costs, which languages it carries, and how the projector, stage '
  + 'display and livestream lower third connect to the console.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/faq' },
  openGraph: {
    type: 'website',
    siteName: 'LlamaPresenter',
    url: '/faq',
    title: `${TITLE} | LlamaPresenter`,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: `${TITLE} | LlamaPresenter`, description: DESCRIPTION },
};

export default function FaqPage() {
  return (
    <main>
      <section className="mx-auto max-w-3xl px-6 pt-14 pb-20 sm:pt-20 sm:pb-28">
        <h1 className={`${DISPLAY} text-[clamp(2.4rem,6vw,3.6rem)] leading-[1.05]`}>FAQ</h1>

        <div className="mt-14 divide-y divide-site-rule">
          {FAQ.map(item => (
            <div key={item.q} className="py-8 first:pt-0">
              <h2 className="text-xl leading-snug font-semibold text-site-ink sm:text-[22px]">{item.q}</h2>
              <p className="mt-3 max-w-[62ch] text-[17px] leading-relaxed text-site-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
