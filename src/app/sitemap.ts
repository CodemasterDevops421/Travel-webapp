import type { MetadataRoute } from 'next';
import { SUPPORTED_DESTINATIONS, buildDestinationPath } from '@/features/search/lib/destination-seo';
import {
  BLOG_PAGE_SIZE,
  getAllCategories,
  getAllPosts,
  getAllTags,
  slugToParam
} from '@/features/blog/lib/content';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const staticRoutes: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}> = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/blog', changeFrequency: 'daily', priority: 0.9 },
  { path: '/blog/rss.xml', changeFrequency: 'daily', priority: 0.4 },
  { path: '/booking', changeFrequency: 'daily', priority: 0.8 },
  { path: '/booking/return', changeFrequency: 'weekly', priority: 0.5 }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [blogPosts, tags, categories] = await Promise.all([getAllPosts(), getAllTags(), getAllCategories()]);
  const totalBlogPages = Math.max(1, Math.ceil(blogPosts.length / BLOG_PAGE_SIZE));
  const destinationRoutes: MetadataRoute.Sitemap = SUPPORTED_DESTINATIONS.map((destination) => ({
    url: `${appUrl}${buildDestinationPath(destination.slug)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9
  }));
  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${appUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7
  }));
  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${appUrl}/blog/tag/${slugToParam(tag)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6
  }));
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${appUrl}/blog/category/${slugToParam(category)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.65
  }));
  const paginationRoutes: MetadataRoute.Sitemap = Array.from({ length: Math.max(0, totalBlogPages - 1) }, (_, index) => ({
    url: `${appUrl}/blog/page/${index + 2}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.5
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: `${appUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority
    })),
    ...destinationRoutes,
    ...blogRoutes,
    ...tagRoutes,
    ...categoryRoutes,
    ...paginationRoutes
  ];
}
