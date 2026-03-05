import { describe, expect, it } from 'vitest';
import { resolveCtaPolicy } from '@/features/blog/lib/cta-policy';

describe('cta policy', () => {
  it('assigns deterministic variant by slug/category/position', () => {
    const a = resolveCtaPolicy({
      slug: 'best-time-to-book-hostels',
      category: 'Booking Tips',
      position: 1
    });
    const b = resolveCtaPolicy({
      slug: 'best-time-to-book-hostels',
      category: 'Booking Tips',
      position: 1
    });
    expect(a).toEqual(b);
  });

  it('changes assignment with position while keeping matrix shape', () => {
    const primary = resolveCtaPolicy({
      slug: 'best-time-to-book-hostels',
      category: 'Booking Tips',
      position: 1
    });
    const secondary = resolveCtaPolicy({
      slug: 'best-time-to-book-hostels',
      category: 'Booking Tips',
      position: 2
    });

    expect(primary.intent).toBe('book_now');
    expect(secondary.intent).toBe('book_now');
    expect(primary.variant).not.toBeUndefined();
    expect(secondary.variant).not.toBeUndefined();
    expect(primary.matrixKey.startsWith('book_now:')).toBe(true);
  });
});
