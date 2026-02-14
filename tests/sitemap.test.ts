import { beforeEach, describe, expect, it } from 'vitest';

describe('sitemap', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://travelforge.example';
  });

  it('includes all known static routes', async () => {
    const sitemap = (await import('@/app/sitemap')).default;
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      'https://travelforge.example/',
      'https://travelforge.example/booking',
      'https://travelforge.example/booking/return'
    ]);
  });
});
