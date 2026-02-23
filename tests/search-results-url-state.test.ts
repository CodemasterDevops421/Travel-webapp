import { describe, expect, it } from 'vitest';
import {
  parseListingUiState,
  serializeListingSearchParams
} from '@/features/search/lib/listing-search-params';

describe('search results URL state contract', () => {
  it('serializes discovery controls in deterministic order', () => {
    const params = serializeListingSearchParams({
      query: {
        query: 'Paris',
        checkin: '2026-07-10',
        checkout: '2026-07-13',
        adults: 2,
        rooms: 1,
        language: 'en',
        currency: 'EUR'
      },
      ui: {
        sort: 'rating',
        view: 'map',
        page: 3,
        filters: {
          propertyName: 'Hilton',
          maxPrice: 420,
          minGuestRating: 8.5,
          minStars: 4,
          amenities: ['wifi', 'parking'],
          propertyTypes: ['hotel', 'resort'],
          maxDistanceKm: 5
        }
      }
    });

    expect(params.toString()).toBe(
      'q=Paris&checkin=2026-07-10&checkout=2026-07-13&guests=2&rooms=1&language=en&currency=EUR&view=map&sort=rating&page=3&propertyName=Hilton&maxPrice=420&minGuestRating=8.5&minStars=4&maxDistanceKm=5&amenities=parking%2Cwifi&propertyType=hotel%2Cresort'
    );
  });

  it('restores filters and browse state from URL values', () => {
    const restored = parseListingUiState({
      sort: 'price',
      view: 'map',
      page: '4',
      propertyName: ' boutique  ',
      maxPrice: '255',
      minGuestRating: '8',
      minStars: '3.5',
      maxDistanceKm: '7',
      amenities: 'wifi,parking,parking',
      propertyType: 'resort,hotel'
    });

    expect(restored).toEqual({
      sort: 'price',
      view: 'map',
      page: 4,
      filters: {
        propertyName: 'boutique',
        maxPrice: 255,
        minGuestRating: 8,
        minStars: 3.5,
        maxDistanceKm: 7,
        amenities: ['parking', 'wifi'],
        propertyTypes: ['hotel', 'resort']
      }
    });
  });

  it('applies safe defaults for invalid URL values', () => {
    const restored = parseListingUiState({
      sort: 'unsupported',
      view: 'split',
      page: '-8',
      maxPrice: 'abc',
      minGuestRating: '100',
      minStars: '-2',
      maxDistanceKm: '999'
    });

    expect(restored).toEqual({
      sort: 'popularity',
      view: 'grid',
      page: 1,
      filters: {
        propertyName: '',
        maxPrice: 1000,
        minGuestRating: 10,
        minStars: 0,
        amenities: [],
        propertyTypes: [],
        maxDistanceKm: 100
      }
    });
  });
});
