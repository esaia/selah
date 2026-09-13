import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llamapresenter.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/studio', '/upgrade', '/auth/', '/api/', '/show/', '/stage/', '/lower3rd/', '/timer/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
