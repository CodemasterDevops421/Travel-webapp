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

export type ListingSort = 'popularity' | 'price' | 'rating';
export type ListingView = 'grid' | 'map';

export type ListingFilters = {
  propertyName: string;
  maxPrice: number;
  minGuestRating: number;
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

const VALID_SORTS: ListingSort[] = ['popularity', 'price', 'rating'];
const VALID_VIEWS: ListingView[] = ['grid', 'map'];

const SERIALIZE_ORDER = [
  'q',
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
  'maxPrice',
  'minGuestRating',
  'minStars',
  'maxDistanceKm',
  'amenities',
  'propertyType'
] as const;

type ListingUiInput = Record<string, string | string[] | undefined>;

export const DEFAULT_LISTING_FILTERS: ListingFilters = {
  propertyName: '',
  maxPrice: DEFAULT_MAX_PRICE,
  minGuestRating: 0,
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
  const propertyName = (typeof params.propertyName === 'string' ? params.propertyName : '').trim();
  const amenities = parseTokenList(typeof params.amenities === 'string' ? params.amenities : undefined);
  const propertyTypes = parseTokenList(typeof params.propertyType === 'string' ? params.propertyType : undefined);

  return {
    sort: normalizeSort(typeof params.sort === 'string' ? params.sort : undefined),
    view: normalizeView(typeof params.view === 'string' ? params.view : undefined),
    page: parseBoundedNumber(typeof params.page === 'string' ? params.page : undefined, 1, 1, 999),
    filters: {
      propertyName,
      maxPrice: parseBoundedNumber(typeof params.maxPrice === 'string' ? params.maxPrice : undefined, DEFAULT_MAX_PRICE, 50, 5000),
      minGuestRating: parseBoundedNumber(
        typeof params.minGuestRating === 'string' ? params.minGuestRating : undefined,
        0,
        0,
        10
      ),
      minStars: parseBoundedNumber(typeof params.minStars === 'string' ? params.minStars : undefined, 0, 0, 5),
      amenities,
      propertyTypes,
      maxDistanceKm: parseBoundedNumber(
        typeof params.maxDistanceKm === 'string' ? params.maxDistanceKm : undefined,
        DEFAULT_MAX_DISTANCE_KM,
        1,
        100
      )
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
  if (ui.filters.maxPrice < DEFAULT_MAX_PRICE) {
    entries.set('maxPrice', String(ui.filters.maxPrice));
  }
  if (ui.filters.minGuestRating > 0) {
    entries.set('minGuestRating', String(ui.filters.minGuestRating));
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
