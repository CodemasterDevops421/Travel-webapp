import { parseDiscoveryQuery } from '@/features/search/lib/discovery-query';

type ListingDefaults = {
  defaultQuery?: string;
  defaultAdults?: number;
  defaultRooms?: number;
  defaultCurrency?: string;
};

export type ListingQueryParams = {
  query: string;
  mode: 'destination' | 'vibe';
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  language: string;
  currency: string;
};

export type ListingSort = 'popularity' | 'price' | 'rating' | 'distance';
export type ListingView = 'grid' | 'map';

export type ListingFilters = {
  propertyName: string;
  minPrice: number;
  maxPrice: number;
  minGuestRating: number;
  minReviewCount: number;
  minStars: number;
  amenities: string[];
  propertyTypes: string[];
  maxDistanceKm: number;
};

export type ListingUiState = {
  sort: ListingSort;
  view: ListingView;
  page: number;
  filters: ListingFilters;
};

const DEFAULT_MAX_PRICE = 1000;
const DEFAULT_MAX_DISTANCE_KM = 30;

const VALID_SORTS: ListingSort[] = ['popularity', 'price', 'rating', 'distance'];
const VALID_VIEWS: ListingView[] = ['grid', 'map'];

const SERIALIZE_ORDER = [
  'q',
  'mode',
  'checkin',
  'checkout',
  'guests',
  'rooms',
  'language',
  'currency',
  'view',
  'sort',
  'page',
  'propertyName',
  'minPrice',
  'maxPrice',
  'minGuestRating',
  'minReviewCount',
  'minStars',
  'maxDistanceKm',
  'amenities',
  'propertyType'
] as const;

type ListingUiInput = Record<string, string | string[] | undefined>;

export const DEFAULT_LISTING_FILTERS: ListingFilters = {
  propertyName: '',
  minPrice: 0,
  maxPrice: DEFAULT_MAX_PRICE,
  minGuestRating: 0,
  minReviewCount: 0,
  minStars: 0,
  amenities: [],
  propertyTypes: [],
  maxDistanceKm: DEFAULT_MAX_DISTANCE_KM
};

export const DEFAULT_LISTING_UI_STATE: ListingUiState = {
  sort: 'popularity',
  view: 'grid',
  page: 1,
  filters: DEFAULT_LISTING_FILTERS
};

function parseBoundedNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const bounded = parseBoundedNumber(value, fallback, min, max);
  return Math.trunc(bounded);
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function readParamValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}

function parseTokenList(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
}

function normalizeSort(value: string | undefined): ListingSort {
  const normalized = value?.trim().toLowerCase();
  return VALID_SORTS.find((item) => item === normalized) ?? DEFAULT_LISTING_UI_STATE.sort;
}

function normalizeView(value: string | undefined): ListingView {
  const normalized = value?.trim().toLowerCase();
  return VALID_VIEWS.find((item) => item === normalized) ?? DEFAULT_LISTING_UI_STATE.view;
}

export function parseListingUiState(params: ListingUiInput): ListingUiState {
  const propertyName = normalizeText(readParamValue(params.propertyName) ?? '');
  const amenities = parseTokenList(readParamValue(params.amenities));
  const propertyTypes = parseTokenList(readParamValue(params.propertyType) ?? readParamValue(params.propertyTypes));
  const minPrice = parseBoundedNumber(readParamValue(params.minPrice), 0, 0, 5000);
  const maxPrice = parseBoundedNumber(readParamValue(params.maxPrice), DEFAULT_MAX_PRICE, 50, 5000);
  const normalizedMinPrice = Math.min(minPrice, maxPrice);

  return {
    sort: normalizeSort(readParamValue(params.sort)),
    view: normalizeView(readParamValue(params.view)),
    page: parseBoundedInteger(readParamValue(params.page), 1, 1, 999),
    filters: {
      propertyName,
      minPrice: normalizedMinPrice,
      maxPrice,
      minGuestRating: parseBoundedNumber(readParamValue(params.minGuestRating), 0, 0, 10),
      minReviewCount: parseBoundedInteger(readParamValue(params.minReviewCount), 0, 0, 5000),
      minStars: parseBoundedNumber(readParamValue(params.minStars), 0, 0, 5),
      amenities,
      propertyTypes,
      maxDistanceKm: parseBoundedNumber(readParamValue(params.maxDistanceKm), DEFAULT_MAX_DISTANCE_KM, 1, 100)
    }
  };
}

type SerializeListingInput = {
  query: ListingQueryParams;
  ui: ListingUiState;
};

export function serializeListingSearchParams({ query, ui }: SerializeListingInput): URLSearchParams {
  const entries = new Map<string, string>();

  entries.set('q', query.query);
  entries.set('mode', query.mode);
  entries.set('checkin', query.checkin);
  entries.set('checkout', query.checkout);
  entries.set('guests', String(query.adults));
  entries.set('rooms', String(query.rooms));
  entries.set('language', query.language);
  entries.set('currency', query.currency);
  entries.set('view', ui.view);
  entries.set('sort', ui.sort);
  entries.set('page', String(ui.page));

  if (ui.filters.propertyName) {
    entries.set('propertyName', ui.filters.propertyName);
  }
  if (ui.filters.minPrice > 0) {
    entries.set('minPrice', String(ui.filters.minPrice));
  }
  if (ui.filters.maxPrice < DEFAULT_MAX_PRICE) {
    entries.set('maxPrice', String(ui.filters.maxPrice));
  }
  if (ui.filters.minGuestRating > 0) {
    entries.set('minGuestRating', String(ui.filters.minGuestRating));
  }
  if (ui.filters.minReviewCount > 0) {
    entries.set('minReviewCount', String(ui.filters.minReviewCount));
  }
  if (ui.filters.minStars > 0) {
    entries.set('minStars', String(ui.filters.minStars));
  }
  if (ui.filters.maxDistanceKm < DEFAULT_MAX_DISTANCE_KM) {
    entries.set('maxDistanceKm', String(ui.filters.maxDistanceKm));
  }
  if (ui.filters.amenities.length > 0) {
    entries.set('amenities', [...ui.filters.amenities].sort().join(','));
  }
  if (ui.filters.propertyTypes.length > 0) {
    entries.set('propertyType', [...ui.filters.propertyTypes].sort().join(','));
  }

  const params = new URLSearchParams();
  for (const key of SERIALIZE_ORDER) {
    const value = entries.get(key);
    if (!value) continue;
    params.set(key, value);
  }

  return params;
}

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

  const rawMode = readParamValue(params.mode)?.trim().toLowerCase();
  const mode: 'destination' | 'vibe' = rawMode === 'vibe' ? 'vibe' : 'destination';

  return {
    query: query.destination,
    mode,
    checkin: query.checkin,
    checkout: query.checkout,
    adults: query.guests,
    rooms: query.rooms,
    language: query.language,
    currency: query.currency
  };
}
