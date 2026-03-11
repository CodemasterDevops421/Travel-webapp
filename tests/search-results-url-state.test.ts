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

const sampleListings: PropertyPreview[] = [
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
    expect(sortSearchResultsListings(sampleListings, 'distance').map((hotel) => hotel.hotelId)).toEqual(['near', 'far', 'unknown']);
  });

  it('preserves minReviewCount filtering for existing search URLs', () => {
    const filters = {
      ...DEFAULT_LISTING_FILTERS,
      minReviewCount: 100
    };

    expect(filterSearchResultsListings(sampleListings, filters).map((hotel) => hotel.hotelId)).toEqual(['far']);
  });

  it('counts minReviewCount as an active filter', () => {
    const filters = {
      ...DEFAULT_LISTING_FILTERS,
      minReviewCount: 250
    };

    expect(getSearchResultsActiveFilterCount(filters)).toBe(1);
  });
});
