import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/book/',
          '/invoice/',
        ],
        disallow: [
          '/dashboard',
          '/jobs',
          '/invoices',
          '/calendar',
          '/customers',
          '/requests',
          '/settings',
          '/onboarding',
          '/admin',
          '/billing-expired',
          '/api/',
          '/offline',
        ],
      },
    ],
    sitemap: 'https://verityflow.io/sitemap.xml',
    host: 'https://verityflow.io',
  };
}
