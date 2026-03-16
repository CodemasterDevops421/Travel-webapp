import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LISTING_FILTERS,
  parseListingUiState,
  serializeListingSearchParams
} from '@/features/search/lib/listing-search-params';
import type { PropertyPreview } from '@/features/search/hooks/use-property-preview';
import {
  filterListings as filterSearchResultsListings,
  getActiveFilterCount as getSearchResultsActiveFilterCount,
  sortListings as sortSearchResultsListings
} from '@/features/search/components/search-results-page';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sampleListings: PropertyPreview[] = [
  {
    hotelId: 'center',
    name: 'Center Hotel',
    city: 'Paris',
    countryCode: 'FR',
    price: 260,
    currency: 'EUR',
    starRating: 5,
    reviewScore: 9.2,
    reviewCount: 200,
    distanceFromCenterKm: 0
  },
  {
    hotelId: 'far',
    name: 'Far Hotel',
    city: 'Paris',
    countryCode: 'FR',
    price: 180,
    currency: 'EUR',
    starRating: 4,
    reviewScore: 8.9,
    reviewCount: 120,
    distanceFromCenterKm: 4.5
  },
  {
    hotelId: 'near',
    name: 'Near Hotel',
    city: 'Paris',
    countryCode: 'FR',
    price: 220,
    currency: 'EUR',
    starRating: 4,
    reviewScore: 8.4,
    reviewCount: 90,
    distanceFromCenterKm: 0.8
  },
  {
    hotelId: 'unknown',
    name: 'Unknown Hotel',
    city: 'Paris',
    countryCode: 'FR',
    price: 140,
    currency: 'EUR',
    starRating: 3,
    reviewScore: 7.4,
    reviewCount: 12,
    distanceFromCenterKm: null
  }
];

describe('search results URL state contract', () => {
  const sidebarSource = readFileSync(
    resolve(process.cwd(), 'src/features/search/components/filters-sidebar.tsx'),
    'utf8'
  );
  const liteApiSource = readFileSync(resolve(process.cwd(), 'src/server/liteapi.ts'), 'utf8');

  it('serializes discovery controls in deterministic order', () => {
    const params = serializeListingSearchParams({
      query: {
        query: 'Paris',
        mode: 'destination',
        checkin: '2026-07-10',
        checkout: '2026-07-13',
        adults: 2,
        rooms: 1,
        language: 'en',
        currency: 'EUR'
      },
      ui: {
        sort: 'distance',
        view: 'map',
        page: 3,
        filters: {
          propertyName: 'Hilton',
          minPrice: 120,
          maxPrice: 420,
          minGuestRating: 8.5,
          minReviewCount: 200,
          minStars: 4,
          amenities: ['wifi', 'parking'],
          propertyTypes: ['hotel', 'resort'],
          maxDistanceKm: 5
        }
      }
    });

    expect(params.toString()).toBe(
      'q=Paris&mode=destination&checkin=2026-07-10&checkout=2026-07-13&guests=2&rooms=1&language=en&currency=EUR&view=map&sort=distance&page=3&propertyName=Hilton&minPrice=120&maxPrice=420&minGuestRating=8.5&minReviewCount=200&minStars=4&maxDistanceKm=5&amenities=parking%2Cwifi&propertyType=hotel%2Cresort'
    );
  });

  it('restores filters and browse state from URL values', () => {
    const restored = parseListingUiState({
      sort: 'price',
      view: 'map',
      page: '4.7',
      propertyName: '  boutique   central ',
      minPrice: '180',
      maxPrice: '255',
      minGuestRating: '8',
      minReviewCount: '300',
      minStars: '3.5',
      maxDistanceKm: '7',
      amenities: 'wifi,parking,parking',
      propertyTypes: 'resort,hotel'
    });

    expect(restored).toEqual({
      sort: 'price',
      view: 'map',
      page: 4,
      filters: {
        propertyName: 'boutique central',
        minPrice: 180,
        maxPrice: 255,
        minGuestRating: 8,
        minReviewCount: 300,
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
      minPrice: '-10',
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
        minPrice: 0,
        maxPrice: 1000,
        minGuestRating: 10,
        minReviewCount: 0,
        minStars: 0,
        amenities: [],
        propertyTypes: [],
        maxDistanceKm: 100
      }
    });
  });

  it('normalizes minimum price when it exceeds the maximum', () => {
    const restored = parseListingUiState({
      minPrice: '900',
      maxPrice: '450'
    });

    expect(restored.filters.minPrice).toBe(450);
    expect(restored.filters.maxPrice).toBe(450);
  });

  it('keeps distance sorting available for legacy shared URLs', () => {
    const sortedHotelIds = sortSearchResultsListings(sampleListings, 'distance').map((hotel) => hotel.hotelId);

    expect(sortedHotelIds[0]).toBe('center');
    expect(sortedHotelIds.indexOf('near')).toBeLessThan(sortedHotelIds.indexOf('far'));
    expect(sortedHotelIds.indexOf('center')).toBeLessThan(sortedHotelIds.indexOf('near'));
  });

  it('preserves exact center-distance listings when distance filters are active', () => {
    const filters = {
      ...DEFAULT_LISTING_FILTERS,
      maxDistanceKm: 1
    };

    expect(filterSearchResultsListings(sampleListings, filters).map((hotel) => hotel.hotelId)).toEqual([
      'center',
      'near',
      'unknown'
    ]);
  });

  it('preserves minReviewCount filtering for existing search URLs', () => {
    const filters = {
      ...DEFAULT_LISTING_FILTERS,
      minReviewCount: 100
    };

    expect(filterSearchResultsListings(sampleListings, filters).map((hotel) => hotel.hotelId)).toEqual(['center', 'far']);
  });

  it('counts minReviewCount as an active filter', () => {
    const filters = {
      ...DEFAULT_LISTING_FILTERS,
      minReviewCount: 250
    };

    expect(getSearchResultsActiveFilterCount(filters)).toBe(1);
  });

  it('keeps the sidebar clear-all affordance visible for legacy minReviewCount URLs', () => {
    expect(sidebarSource).toContain('filters.minReviewCount > 0 ||');
    expect(sidebarSource).toContain('{hasActiveFilters && (');
    expect(sidebarSource).toContain('Clear all');
  });

  it('does not emit the removed hot-path LiteAPI rates request debug log', () => {
    expect(liteApiSource).not.toContain("rates_request");
    expect(liteApiSource).not.toContain("rates_response");
    expect(liteApiSource).not.toContain('apiKey: maskApiKey(runtime.apiKey)');
    expect(liteApiSource).not.toContain('guestNationality: payload.guestNationality');
    expect(liteApiSource).not.toContain('occupancies: payload.occupancies');
    expect(liteApiSource).not.toContain('cityName: payload.cityName');
    expect(liteApiSource).not.toContain('aiSearch: payload.aiSearch');
  });
});
