import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('blog provider parity', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('keeps slug set parity between mdx and cms providers', async () => {
    vi.stubEnv('BLOG_CONTENT_SOURCE', 'mdx');
    const mdxModule = await import('@/features/blog/lib/content');
    const mdxPosts = await mdxModule.getAllPosts();

    vi.resetModules();
    vi.stubEnv('BLOG_CONTENT_SOURCE', 'cms');
    const cmsModule = await import('@/features/blog/lib/content');
    const cmsPosts = await cmsModule.getAllPosts();

    const mdxSlugs = mdxPosts.map((post) => post.slug).sort();
    const cmsSlugs = cmsPosts.map((post) => post.slug).sort();
    expect(cmsSlugs).toEqual(mdxSlugs);
  });
});
