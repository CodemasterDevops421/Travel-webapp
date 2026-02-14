import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  normalizeCurrency,
  normalizeLanguage
} from '@/shared/lib/preferences';

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

function pickParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  if (typeof value === 'string') return value;
  return Array.isArray(value) ? value[0] : undefined;
}

function defaultDates() {
  const checkinDate = new Date();
  checkinDate.setDate(checkinDate.getDate() + 14);
  const checkoutDate = new Date(checkinDate);
  checkoutDate.setDate(checkoutDate.getDate() + 2);
  return {
    checkin: checkinDate.toISOString().slice(0, 10),
    checkout: checkoutDate.toISOString().slice(0, 10)
  };
}

export function parseListingSearchParams(
  params: Record<string, string | string[] | undefined>,
  defaults: ListingDefaults = {}
): ListingQueryParams {
  const dateDefaults = defaultDates();
  return {
    query: (pickParam(params, 'q') ?? defaults.defaultQuery ?? '').trim(),
    checkin: pickParam(params, 'checkin') ?? dateDefaults.checkin,
    checkout: pickParam(params, 'checkout') ?? dateDefaults.checkout,
    adults: Number(pickParam(params, 'adults') ?? String(defaults.defaultAdults ?? 2)) || (defaults.defaultAdults ?? 2),
    rooms: Number(pickParam(params, 'rooms') ?? String(defaults.defaultRooms ?? 1)) || (defaults.defaultRooms ?? 1),
    language: normalizeLanguage(pickParam(params, 'language')) ?? DEFAULT_LANGUAGE,
    currency: normalizeCurrency(pickParam(params, 'currency') ?? defaults.defaultCurrency) ?? DEFAULT_CURRENCY
  };
}
