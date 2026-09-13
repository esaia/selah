import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Art } from '@/components/marketing/Art';
import { ConsoleDemo } from '@/components/marketing/ConsoleDemo';
import { Marker } from '@/components/marketing/Marker';
import { Tick } from '@/components/marketing/Tick';
import { LinkCard } from '@/components/marketing/LinkCard';
import { USE_CASES, findUseCase } from '@/lib/marketing/useCases';

const TRANSLATIONS_DEMO = findUseCase('multilingual-church-services')!.video!;

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const OURS = 'LlamaPresenter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

export const generateStaticParams = () => USE_CASES.map(useCase => ({ slug: useCase.slug }));

export const generateMetadata = async ({ params }: PageProps<'/use-cases/[slug]'>) => {
  const { slug } = await params;
  const useCase = findUseCase(slug);

  if (!useCase) return {};

  return {
    title: useCase.title,
    description: useCase.description,
    alternates: { canonical: `/use-cases/${useCase.slug}` },
    openGraph: {
      type: 'article',
      siteName: OURS,
      url: `/use-cases/${useCase.slug}`,
      title: useCase.title,
      description: useCase.description,
    },
    twitter: { card: 'summary_large_image', title: useCase.title, description: useCase.description },
  };
};

export default async function UseCasePage({ params }: PageProps<'/use-cases/[slug]'>) {
  const { slug } = await params;
  const useCase = findUseCase(slug);

  if (!useCase) notFound();

  const related = useCase.related.map(findUseCase).filter(item => item !== undefined);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: useCase.faq.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Use cases', item: `${SITE_URL}/use-cases` },
          { '@type': 'ListItem', position: 2, name: useCase.name, item: `${SITE_URL}/use-cases/${useCase.slug}` },
        ],
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">
          <Link href="/use-cases" className="transition-colors hover:text-site-muted">
            Use cases
          </Link>
        </p>

        <div className="mt-5 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
              {useCase.headline[0]}{' '}
              <Marker>{useCase.headline[1]}</Marker>
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-site-muted">{useCase.lede}</p>

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

          <Art src={useCase.art.src} alt={useCase.art.alt} />
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>What you get</h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {useCase.points.map(point => (
              <div key={point.title} className="rounded-studio-lg border border-site-rule bg-site-bg p-6">
                <h3 className={`${DISPLAY} text-xl`}>{point.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConsoleDemo video={TRANSLATIONS_DEMO} />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>How a Sunday runs</h2>

          <ol className="space-y-5">
            {useCase.steps.map(step => (
              <li key={step} className="flex gap-3 text-[17px] leading-relaxed text-site-ink">
                <Tick className="mt-[7px] size-3.5 shrink-0 text-site-ink" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Questions</h2>

          <div className="mt-10 gap-x-14 sm:columns-2">
            {useCase.faq.map(item => (
              <div key={item.q} className="mb-8 break-inside-avoid">
                <h3 className="text-[19px] leading-snug font-medium text-site-ink">{item.q}</h3>
                <p className="mt-2.5 text-[16px] leading-relaxed text-site-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Nearby</h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {related.map(item => (
            <LinkCard
              key={item.slug}
              href={`/use-cases/${item.slug}`}
              name={item.name}
              blurb={item.card}
              icon={item.icon}
            />
          ))}
        </div>

        <p className="mt-10 max-w-[62ch] text-[16px] leading-relaxed text-site-muted">
          Every use case is on the{' '}
          <Link href="/use-cases" className="text-site-ink underline underline-offset-4">
            use cases
          </Link>{' '}
          page, and the{' '}
          <Link href="/compare" className="text-site-ink underline underline-offset-4">
            comparison
          </Link>{' '}
          puts {OURS} beside ProPresenter, EasyWorship, FreeShow and Proclaim.
        </p>
      </section>

      <section className="bg-studio-bg">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-valera text-3xl leading-[1.1] tracking-tight text-studio-text sm:text-4xl">
              Try it on this Sunday
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-studio-muted">
              Nothing to install, a free plan that is not a countdown, and every screen a link.
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
    </main>
  );
}
