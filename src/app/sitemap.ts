import type { MetadataRoute } from 'next';
import { SUPPORTED_DESTINATIONS, buildDestinationPath } from '@/features/search/lib/destination-seo';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const staticRoutes: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}> = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/booking', changeFrequency: 'daily', priority: 0.8 },
  { path: '/booking/return', changeFrequency: 'weekly', priority: 0.5 }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const destinationRoutes: MetadataRoute.Sitemap = SUPPORTED_DESTINATIONS.map((destination) => ({
    url: `${appUrl}${buildDestinationPath(destination.slug)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: `${appUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority
    })),
    ...destinationRoutes
  ];
}
