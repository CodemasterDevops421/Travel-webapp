import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  normalizeCurrency,
  normalizeLanguage
} from '@/shared/lib/preferences';

type QueryValue = string | string[] | undefined;

export type DiscoverySort = 'price' | 'rating' | 'popularity';
export type DiscoveryView = 'grid' | 'map';

export type DiscoveryQueryState = {
  destination: string;
  checkin: string;
  checkout: string;
  guests: number;
  rooms: number;
  vibe?: string;
  language: string;
  currency: string;
  view: DiscoveryView;
  sort: DiscoverySort;
  page: number;
};

type DiscoveryQueryDefaults = {
  defaultDestination?: string;
  defaultGuests?: number;
  defaultRooms?: number;
  defaultCurrency?: string;
};

const SERIALIZE_ORDER: Array<keyof DiscoveryQueryState> = [
  'destination',
  'checkin',
  'checkout',
  'guests',
  'rooms',
  'vibe',
  'language',
  'currency',
  'view',
  'sort',
  'page'
];

const VALID_SORTS: DiscoverySort[] = ['price', 'rating', 'popularity'];
const VALID_VIEWS: DiscoveryView[] = ['grid', 'map'];

function pickValue(params: Record<string, QueryValue>, key: string): string | undefined {
  const value = params[key];
  if (typeof value === 'string') return value;
  return Array.isArray(value) ? value[0] : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function isISODateString(value: string | undefined): value is string {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && toISODate(date) === value;
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

function defaultDates() {
  const checkinDate = new Date();
  checkinDate.setUTCDate(checkinDate.getUTCDate() + 14);
  const checkin = toISODate(checkinDate);
  return {
    checkin,
    checkout: addDays(checkin, 2)
  };
}

function normalizeVibe(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeSort(value: string | undefined): DiscoverySort {
  const normalized = value?.trim().toLowerCase();
  return VALID_SORTS.find((sort) => sort === normalized) ?? 'popularity';
}

function normalizeView(value: string | undefined): DiscoveryView {
  const normalized = value?.trim().toLowerCase();
  return VALID_VIEWS.find((view) => view === normalized) ?? 'grid';
}

export function parseDiscoveryQuery(
  params: Record<string, QueryValue>,
  defaults: DiscoveryQueryDefaults = {}
): DiscoveryQueryState {
  const dateDefaults = defaultDates();
  const rawCheckin = pickValue(params, 'checkin');
  const rawCheckout = pickValue(params, 'checkout');

  const checkin = isISODateString(rawCheckin) ? rawCheckin : dateDefaults.checkin;
  const checkoutCandidate = isISODateString(rawCheckout) ? rawCheckout : dateDefaults.checkout;
  const checkout = checkoutCandidate > checkin ? checkoutCandidate : addDays(checkin, 1);

  const destination = (pickValue(params, 'q') ?? defaults.defaultDestination ?? '').trim();

  return {
    destination,
    checkin,
    checkout,
    guests: parsePositiveInt(
      pickValue(params, 'guests') ?? pickValue(params, 'adults'),
      defaults.defaultGuests ?? 2,
      1,
      10
    ),
    rooms: parsePositiveInt(pickValue(params, 'rooms'), defaults.defaultRooms ?? 1, 1, 5),
    vibe: normalizeVibe(pickValue(params, 'vibe')),
    language: normalizeLanguage(pickValue(params, 'language')) ?? DEFAULT_LANGUAGE,
    currency: normalizeCurrency(pickValue(params, 'currency') ?? defaults.defaultCurrency) ?? DEFAULT_CURRENCY,
    view: normalizeView(pickValue(params, 'view')),
    sort: normalizeSort(pickValue(params, 'sort')),
    page: parsePositiveInt(pickValue(params, 'page'), 1, 1, 999)
  };
}

export function serializeDiscoveryQuery(state: DiscoveryQueryState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of SERIALIZE_ORDER) {
    const value = state[key];
    if (value === undefined || value === '') continue;
    const queryKey = key === 'destination' ? 'q' : key;
    params.set(queryKey, String(value));
  }
  return params;
}
