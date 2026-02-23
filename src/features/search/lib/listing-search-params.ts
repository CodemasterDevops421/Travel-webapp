import { parseDiscoveryQuery } from '@/features/search/lib/discovery-query';

type ListingDefaults = {
  defaultQuery?: string;
  defaultAdults?: number;
  defaultRooms?: number;
  defaultCurrency?: string;
};

export type ListingQueryParams = {
  query: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  language: string;
  currency: string;
};

export function parseListingSearchParams(
  params: Record<string, string | string[] | undefined>,
  defaults: ListingDefaults = {}
): ListingQueryParams {
  const query = parseDiscoveryQuery(params, {
    defaultDestination: defaults.defaultQuery,
    defaultGuests: defaults.defaultAdults,
    defaultRooms: defaults.defaultRooms,
    defaultCurrency: defaults.defaultCurrency
  });

  return {
    query: query.destination,
    checkin: query.checkin,
    checkout: query.checkout,
    adults: query.guests,
    rooms: query.rooms,
    language: query.language,
    currency: query.currency
  };
}
