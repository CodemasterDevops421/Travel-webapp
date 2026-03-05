import { describe, expect, it } from 'vitest';

describe('blog seo surfaces', () => {
  it('includes blog routes in sitemap', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const entries = await sitemap();

    expect(entries.some((entry) => entry.url.endsWith('/blog'))).toBe(true);
    expect(entries.some((entry) => entry.url.includes('/blog/tag/'))).toBe(true);
    expect(entries.some((entry) => entry.url.includes('/blog/category/'))).toBe(true);
    expect(entries.some((entry) => entry.url.includes('/blog/best-time-to-book-hostels'))).toBe(true);
  });

  it('builds metadata for blog article pages', async () => {
    const module = await import('@/app/blog/[slug]/page');
    const metadata = await module.generateMetadata({
      params: Promise.resolve({ slug: 'best-time-to-book-hostels' })
    });

    expect(metadata.title).toContain('Best Time to Book Hostels');
    const openGraph = metadata.openGraph as { type?: string } | undefined;
    expect(openGraph?.type).toBe('article');
    expect(metadata.alternates?.canonical).toBe('/blog/best-time-to-book-hostels');
  });

  it('emits rss xml with known post links', async () => {
    const { GET } = await import('@/app/blog/rss.xml/route');
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/rss+xml');
    expect(body).toContain('<rss');
    expect(body).toContain('/blog/best-time-to-book-hostels');
  });
});
