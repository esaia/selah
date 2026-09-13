import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Art } from '@/components/marketing/Art';
import { LinkCard } from '@/components/marketing/LinkCard';
import { Marker } from '@/components/marketing/Marker';
import { Tick } from '@/components/marketing/Tick';
import { findSolution, SOLUTIONS } from '@/lib/marketing/solutions';
import { findUseCase } from '@/lib/marketing/useCases';

const DISPLAY = 'font-valera tracking-tight text-site-ink';

const OURS = 'LlamaPresenter';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

export const generateStaticParams = () => SOLUTIONS.map(solution => ({ slug: solution.slug }));

export const generateMetadata = async ({ params }: PageProps<'/solutions/[slug]'>) => {
  const { slug } = await params;
  const solution = findSolution(slug);

  if (!solution) return {};

  return {
    title: solution.title,
    description: solution.description,
    alternates: { canonical: `/solutions/${solution.slug}` },
    openGraph: {
      type: 'article',
      siteName: OURS,
      url: `/solutions/${solution.slug}`,
      title: solution.title,
      description: solution.description,
    },
    twitter: { card: 'summary_large_image', title: solution.title, description: solution.description },
  };
};

export default async function SolutionPage({ params }: PageProps<'/solutions/[slug]'>) {
  const { slug } = await params;
  const solution = findSolution(slug);

  if (!solution) notFound();

  const jobs = solution.useCases.map(findUseCase).filter(item => item !== undefined);
  const nearby = solution.related.map(findSolution).filter(item => item !== undefined);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: solution.faq.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Solutions', item: `${SITE_URL}/solutions` },
          { '@type': 'ListItem', position: 2, name: solution.name, item: `${SITE_URL}/solutions/${solution.slug}` },
        ],
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:pt-14">
        <p className="text-sm font-medium tracking-wide text-site-faint uppercase">
          <Link href="/solutions" className="transition-colors hover:text-site-muted">
            Solutions
          </Link>
        </p>

        <div className="mt-5 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <h1 className={`${DISPLAY} text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.05]`}>
              {solution.headline[0]}{' '}
              <Marker>{solution.headline[1]}</Marker>
            </h1>

            <div className="mt-7 h-1 w-16 rounded-full bg-site-accent" />

            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-site-muted">{solution.lede}</p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="rounded-studio bg-site-accent px-6 py-3.5 text-[17px] font-medium text-site-onaccent
                  shadow-sm transition-colors duration-150 hover:bg-site-accent/85"
              >
                Try {OURS} free
              </Link>

              <Link
                href="/compare"
                className="rounded-studio border border-site-rule px-6 py-3.5 text-[17px] text-site-ink
                  transition-colors duration-150 hover:bg-site-band"
              >
                Compare it with yours
              </Link>
            </div>
          </div>

          <Art src={solution.art.src} alt={solution.art.alt} />
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-2xl leading-[1.1] sm:text-3xl`}>What usually goes wrong</h2>

          <ul className="space-y-3">
            {solution.problem.map(item => (
              <li key={item} className="flex gap-3 text-[17px] leading-relaxed text-site-muted">
                <span aria-hidden className="mt-[11px] size-1.5 shrink-0 rounded-full bg-site-faint" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>What answers it</h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {solution.points.map(point => (
            <div key={point.title} className="rounded-studio-lg border border-site-rule bg-site-surface p-6">
              <h3 className={`${DISPLAY} text-xl`}>{point.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-site-muted">{point.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>How a Sunday runs</h2>

          <ol className="space-y-5">
            {solution.steps.map(step => (
              <li key={step} className="flex gap-3 text-[17px] leading-relaxed text-site-ink">
                <Tick className="mt-[7px] size-3.5 shrink-0 text-site-ink" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>What a church like this uses</h2>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-site-muted">
          The jobs behind the sections above, each with a page of its own.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map(job => (
            <LinkCard
              key={job.slug}
              href={`/use-cases/${job.slug}`}
              name={job.name}
              blurb={job.card}
              icon={job.icon}
            />
          ))}
        </div>
      </section>

      <section className="border-y border-site-rule bg-site-band">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Questions</h2>

          <div className="mt-10 gap-x-14 sm:columns-2">
            {solution.faq.map(item => (
              <div key={item.q} className="mb-8 break-inside-avoid">
                <h3 className="text-[19px] leading-snug font-medium text-site-ink">{item.q}</h3>
                <p className="mt-2.5 text-[16px] leading-relaxed text-site-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <h2 className={`${DISPLAY} text-3xl leading-[1.1] sm:text-4xl`}>Churches like yours</h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {nearby.map(item => (
            <LinkCard
              key={item.slug}
              href={`/solutions/${item.slug}`}
              name={item.name}
              blurb={item.card}
              icon={item.icon}
            />
          ))}
        </div>

        <p className="mt-10 max-w-[62ch] text-[16px] leading-relaxed text-site-muted">
          Every kind of church is on the{' '}
          <Link href="/solutions" className="text-site-ink underline underline-offset-4">
            solutions
          </Link>{' '}
          page, and the{' '}
          <Link href="/pricing" className="text-site-ink underline underline-offset-4">
            pricing
          </Link>{' '}
          page has what the free plan holds before Pro is worth it.
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
