import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NOT_FOUND');
});

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock('next/navigation', () => ({
  notFound,
  redirect
}));

describe('stays destination SSR routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns destination-specific metadata with canonical URL', async () => {
    const { generateMetadata } = await import('@/app/stays/[destination]/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ destination: 'bali' })
    });

    expect(metadata.title).toBe('Stays in Bali | Hostel Stays');
    expect(metadata.alternates?.canonical).toBe('/stays/bali');
  });

  it('returns noindex metadata for unsupported destinations', async () => {
    const { generateMetadata } = await import('@/app/stays/[destination]/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ destination: 'invalid-destination' })
    });

    expect(metadata.robots).toEqual({
      index: false,
      follow: false
    });
  });

  it('calls notFound for invalid destination slug values', async () => {
    const { default: DestinationPage } = await import('@/app/stays/[destination]/page');

    await expect(
      DestinationPage({
        params: Promise.resolve({ destination: 'invalid!!' }),
        searchParams: Promise.resolve({})
      })
    ).rejects.toThrow('NOT_FOUND');

    expect(notFound).toHaveBeenCalledOnce();
  });

  it('redirects legacy /search route to canonical destination URL', async () => {
    const { default: SearchPage } = await import('@/app/search/page');

    await expect(
      SearchPage({
        searchParams: Promise.resolve({
          q: 'Bali',
          checkin: '2026-05-01',
          checkout: '2026-05-03',
          guests: '3',
          rooms: '2',
          language: 'en',
          currency: 'USD',
          view: 'map',
          sort: 'price',
          page: '2'
        })
      })
    ).rejects.toThrow(
      'REDIRECT:/stays/bali?checkin=2026-05-01&checkout=2026-05-03&guests=3&rooms=2&language=en&currency=USD&view=map&sort=price&page=2'
    );

    expect(redirect).toHaveBeenCalledOnce();
  });

  it('keeps destination route as server-rendered code without client hooks', () => {
    const routeSource = readFileSync(resolve(process.cwd(), 'src/app/stays/[destination]/page.tsx'), 'utf8');

    expect(routeSource).not.toContain("'use client'");
    expect(routeSource).not.toContain('useSearchParams(');
    expect(routeSource).not.toContain('useRouter(');
  });
});
