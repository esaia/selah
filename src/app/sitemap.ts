import type { MetadataRoute } from 'next';

import { SOLUTIONS } from '@/lib/marketing/solutions';
import { USE_CASES } from '@/lib/marketing/useCases';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

const STATIC_PATHS = [
  '',
  '/pricing',
  '/use-cases',
  '/solutions',
  '/compare',
  '/propresenter-alternative',
  '/easyworship-alternative',
  '/freeshow-alternative',
  '/proclaim-alternative',
  '/stagetimer-alternative',
  '/propresenter-vs-easyworship',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    ...STATIC_PATHS.map(path => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    })),
    ...USE_CASES.map(useCase => ({
      url: `${SITE_URL}/use-cases/${useCase.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...SOLUTIONS.map(solution => ({
      url: `${SITE_URL}/solutions/${solution.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
