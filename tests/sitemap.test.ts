import { beforeEach, describe, expect, it } from 'vitest';

describe('sitemap', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://travelforge.example';
  });

  it('includes static and destination discovery routes', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      'https://travelforge.example/',
      'https://travelforge.example/booking',
      'https://travelforge.example/booking/return',
      'https://travelforge.example/stays/bali',
      'https://travelforge.example/stays/dubai',
      'https://travelforge.example/stays/kyoto',
      'https://travelforge.example/stays/tokyo',
      'https://travelforge.example/stays/zurich'
    ]);
  });
});
