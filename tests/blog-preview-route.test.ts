import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('blog preview route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('BLOG_PREVIEW_TOKEN', 'preview-secret');
  });

  it('rejects invalid preview token', async () => {
    vi.doMock('@/features/blog/lib/content', () => ({
      getPostBySlug: vi.fn().mockResolvedValue({ slug: 'best-time-to-book-hostels' })
    }));
    const { GET } = await import('@/app/api/blog/preview/route');
    const req = {
      nextUrl: new URL('https://example.com/api/blog/preview?token=bad&slug=best-time-to-book-hostels'),
      url: 'https://example.com/api/blog/preview?token=bad&slug=best-time-to-book-hostels'
    } as never;

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('redirects to preview url when token and slug are valid', async () => {
    vi.doMock('@/features/blog/lib/content', () => ({
      getPostBySlug: vi.fn().mockResolvedValue({ slug: 'best-time-to-book-hostels' })
    }));
    const { GET } = await import('@/app/api/blog/preview/route');
    const req = {
      nextUrl: new URL('https://example.com/api/blog/preview?token=preview-secret&slug=best-time-to-book-hostels'),
      url: 'https://example.com/api/blog/preview?token=preview-secret&slug=best-time-to-book-hostels'
    } as never;

    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/blog/best-time-to-book-hostels?preview=1&previewToken=preview-secret');
  });
});
