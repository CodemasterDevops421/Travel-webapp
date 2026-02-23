import { describe, expect, it } from 'vitest';
import { parseDiscoveryQuery, serializeDiscoveryQuery } from '@/features/search/lib/discovery-query';

describe('discovery query contract', () => {
  it('parses canonical fields with sensible defaults', () => {
    const parsed = parseDiscoveryQuery({
      q: ' Lisbon ',
      checkin: '2026-06-10',
      checkout: '2026-06-14',
      adults: '3',
      rooms: '2',
      vibe: ' Scenic ',
      language: 'en',
      currency: 'eur',
      sort: 'price',
      view: 'map',
      page: '4'
    });

    expect(parsed).toMatchObject({
      destination: 'Lisbon',
      checkin: '2026-06-10',
      checkout: '2026-06-14',
      guests: 3,
      rooms: 2,
      vibe: 'Scenic',
      language: 'en',
      currency: 'EUR',
      sort: 'price',
      view: 'map',
      page: 4
    });
  });

  it('serializes in deterministic key order', () => {
    const params = serializeDiscoveryQuery({
      destination: 'Tokyo',
      checkin: '2026-07-01',
      checkout: '2026-07-03',
      guests: 2,
      rooms: 1,
      vibe: 'Quiet',
      language: 'en',
      currency: 'USD',
      view: 'grid',
      sort: 'popularity',
      page: 1
    });

    expect(params.toString()).toBe(
      'q=Tokyo&checkin=2026-07-01&checkout=2026-07-03&guests=2&rooms=1&vibe=Quiet&language=en&currency=USD&view=grid&sort=popularity&page=1'
    );
  });
});
