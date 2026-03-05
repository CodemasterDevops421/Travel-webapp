import { describe, expect, it } from 'vitest';
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  getPostsByCategory,
  getPostsByTag,
  searchPosts,
  slugToParam,
  validateBlogFrontmatter
} from '@/features/blog/lib/content';

describe('blog content', () => {
  it('validates frontmatter and rejects invalid input', () => {
    const valid = validateBlogFrontmatter({
      slug: 'sample-post',
      title: 'Sample title long enough',
      description: 'This is a long enough description for metadata and validation constraints.',
      publishedAt: '2026-01-01',
      updatedAt: '2026-01-02',
      author: 'travelapp-editorial',
      category: 'Planning',
      tags: ['Travel'],
      coverImage: 'https://images.unsplash.com/photo-1',
      featured: true
    });

    expect(valid.slug).toBe('sample-post');
    expect(() =>
      validateBlogFrontmatter({
        slug: 'x',
        title: 'bad',
        description: 'short',
        tags: []
      })
    ).toThrowError();
  });

  it('returns posts sorted by updated date descending', async () => {
    const posts = await getAllPosts();
    expect(posts.length).toBeGreaterThan(0);

    for (let index = 1; index < posts.length; index += 1) {
      const prev = new Date(posts[index - 1].updatedAt).getTime();
      const current = new Date(posts[index].updatedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(current);
    }
  });

  it('finds posts by slug, tag, and category', async () => {
    const post = await getPostBySlug('best-time-to-book-hostels');
    expect(post?.slug).toBe('best-time-to-book-hostels');

    const tagPosts = await getPostsByTag('hostels');
    expect(tagPosts.some((entry) => entry.slug === 'best-time-to-book-hostels')).toBe(true);

    const categoryPosts = await getPostsByCategory('itineraries');
    expect(categoryPosts.length).toBeGreaterThan(0);
  });

  it('returns related posts and supports search behavior', async () => {
    const related = await getRelatedPosts('best-time-to-book-hostels', 3);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((entry) => entry.slug !== 'best-time-to-book-hostels')).toBe(true);

    const searchResults = await searchPosts('Goa');
    expect(searchResults.some((entry) => entry.slug === 'weekend-itinerary-goa')).toBe(true);

    const empty = await searchPosts('   ');
    expect(empty).toEqual([]);
  });

  it('normalizes slug parameters for route-safe values', () => {
    expect(slugToParam('Weekend Trips')).toBe('weekend-trips');
    expect(slugToParam('City Guides')).toBe('city-guides');
  });
});

