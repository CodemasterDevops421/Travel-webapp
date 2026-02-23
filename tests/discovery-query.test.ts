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

  it('normalizes invalid date ranges to safe defaults', () => {
    const parsed = parseDiscoveryQuery({
      checkin: 'bad-date',
      checkout: '2026-01-01'
    });

    expect(parsed.checkin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.checkout).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.checkout > parsed.checkin).toBe(true);
  });

  it('clamps out-of-range guests and rooms', () => {
    expect(parseDiscoveryQuery({ guests: '0', rooms: '0' })).toMatchObject({ guests: 1, rooms: 1 });
    expect(parseDiscoveryQuery({ guests: '25', rooms: '12' })).toMatchObject({ guests: 10, rooms: 5 });
  });

  it('handles empty destination and trims vibe', () => {
    const parsed = parseDiscoveryQuery({ q: '   ', vibe: '  Near nightlife  ' });
    expect(parsed.destination).toBe('');
    expect(parsed.vibe).toBe('Near nightlife');
  });

  it('emits the same URL for equivalent input variants', () => {
    const withAdults = serializeDiscoveryQuery(
      parseDiscoveryQuery({
        q: 'Rome',
        checkin: '2026-08-10',
        checkout: '2026-08-14',
        adults: '2',
        rooms: '1',
        vibe: 'Quiet',
        language: 'EN',
        currency: 'usd',
        view: 'GRID',
        sort: 'POPULARITY',
        page: '1'
      })
    ).toString();

    const withGuests = serializeDiscoveryQuery(
      parseDiscoveryQuery({
        q: '  Rome  ',
        checkin: '2026-08-10',
        checkout: '2026-08-14',
        guests: '2',
        rooms: '1',
        vibe: '  Quiet ',
        language: 'en',
        currency: 'USD',
        view: 'grid',
        sort: 'popularity',
        page: '1'
      })
    ).toString();

    expect(withAdults).toBe(withGuests);
    expect(withAdults).toBe(
      'q=Rome&checkin=2026-08-10&checkout=2026-08-14&guests=2&rooms=1&vibe=Quiet&language=en&currency=USD&view=grid&sort=popularity&page=1'
    );
  });
});
