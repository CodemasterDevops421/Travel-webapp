import 'server-only';
import LiteAPI from 'liteapi-node-sdk';
import { env, getLiteApiRuntimeConfig, getLiteApiRuntimeConfigForMode } from '@/server/env';
import { logger } from '@/server/logger';
import { HttpError } from '@/server/errors';
import { getAppSettings } from '@/server/settings/repository';

const RUNTIME_MODE_CACHE_TTL_MS = 5_000;

let cachedRuntimeConfig: {
  value: ReturnType<typeof getLiteApiRuntimeConfig>;
  expiresAt: number;
} | null = null;

async function resolveLiteApiRuntimeConfig() {
  const now = Date.now();
  if (cachedRuntimeConfig && cachedRuntimeConfig.expiresAt > now) {
    return cachedRuntimeConfig.value;
  }

  const envRuntime = getLiteApiRuntimeConfig();

  try {
    const settings = await getAppSettings();
    const runtime = getLiteApiRuntimeConfigForMode(settings.environmentMode);
    cachedRuntimeConfig = {
      value: runtime,
      expiresAt: now + RUNTIME_MODE_CACHE_TTL_MS
    };
    return runtime;
  } catch (error) {
    logger.warn({ error }, 'Failed to resolve app settings environment mode. Using env runtime mode.');
    cachedRuntimeConfig = {
      value: envRuntime,
      expiresAt: now + RUNTIME_MODE_CACHE_TTL_MS
    };
    return envRuntime;
  }
}

type AutocompleteEntity = {
  id: string;
  name: string;
  type: 'city' | 'hotel' | 'landmark';
  countryCode?: string;
};

type LiteApiResponse<T> = {
  data?: T;
  hotels?: Array<Record<string, unknown>>;
};

export type PropertyPreview = {
  hotelId: string;
  name: string;
  city: string;
  countryCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  starRating: number | null;
  reviewScore?: number | null;
  reviewCount?: number | null;
  imageUrl?: string;
  price: number | null;
  currency: string;
  amenities: string[];
};

export type SupplierDegradedReason = 'timeout' | 'partial' | 'unavailable';

export type PropertyPreviewSearchResult = {
  properties: PropertyPreview[];
  degraded: boolean;
  degradedReason: SupplierDegradedReason | null;
  asOf: string;
  freshness: 'fresh' | 'stale';
};

export type SemanticHotelMatch = {
  hotelId: string;
  name: string;
  city: string;
  countryCode: string | null;
  address: string | null;
  imageUrl: string | null;
  score: number | null;
  tags: string[];
  story: string | null;
};

export type RoomSearchMatch = {
  hotelId: string;
  hotelName: string;
  city: string | null;
  countryCode: string | null;
  rating: number | null;
  rooms: Array<{
    name: string;
    imageUrl: string | null;
    score: number | null;
  }>;
};

export type LiteApiPrebookResponse = {
  prebookId: string;
  transactionId: string;
  secretKey: string;
  price: number;
  currency: string;
};

export type HotelGuestReview = {
  author: string | null;
  travelerType: string | null;
  comment: string;
  score: number | null;
  createdAt: string | null;
  pros: string | null;
  cons: string | null;
};

export type HotelPolicyDetails = {
  checkInFrom: string | null;
  checkInUntil: string | null;
  checkOutFrom: string | null;
  checkOutUntil: string | null;
  cancellation: string[];
  payment: string[];
  pets: string[];
  children: string[];
  extra: string[];
};

export type HotelLocationContext = {
  addressLine: string | null;
  city: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  transit: string[];
  nearbyLandmarks: string[];
};

export type HotelProsAndCons = {
  pros: string[];
  cons: string[];
};

export type HotelFacilityCategory = {
  category: string;
  items: string[];
};

export type HotelAreaInfoItem = {
  label: string;
  value: string;
};

export type HotelRestaurantInfo = {
  name: string;
  cuisine: string | null;
  description: string | null;
};

export type HotelHouseRuleItem = {
  title: string;
  detail: string;
};

export type HotelSmartHighlight = {
  title: string;
  detail: string;
  source: 'reviews' | 'location' | 'amenities' | 'policies';
};

export type HotelReviewTopic = {
  label: string;
  mentions: number;
};

export type HotelReviewHighlights = {
  positiveTopics: HotelReviewTopic[];
  tradeoffTopics: HotelReviewTopic[];
  lowSignal: boolean;
  message: string;
};

export type HotelDescriptionSection = {
  title: string;
  body: string;
  source: 'supplier' | 'synthesized';
};

export type HotelDescriptionNarrative = {
  mode: 'supplier' | 'synthesized' | 'unavailable';
  sections: HotelDescriptionSection[];
  message: string;
};

export type HotelDetailCompleteness = {
  isPartial: boolean;
  missingSections: string[];
  message: string;
};

export type HotelDetails = {
  id: string;
  name: string;
  city: string;
  countryCode: string | null;
  address: string | null;
  mainPhoto: string | null;
  photos: string[];
  facilities: string[];
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  starRating: number | null;
  reviewScore: number | null;
  reviewCount: number | null;
  reviewBreakdown: Array<{ label: string; score: number }>;
  reviews: HotelGuestReview[];
  policies: HotelPolicyDetails;
  locationContext: HotelLocationContext;
  prosAndCons: HotelProsAndCons;
  facilityCategories?: HotelFacilityCategory[];
  areaInfo?: HotelAreaInfoItem[];
  nearbyRestaurants?: HotelRestaurantInfo[];
  houseRulesDetailed?: HotelHouseRuleItem[];
  smartHighlights: HotelSmartHighlight[];
  reviewHighlights: HotelReviewHighlights;
  descriptionNarrative: HotelDescriptionNarrative;
  completeness: HotelDetailCompleteness;
};

export type HotelRateOption = {
  offerId: string;
  roomId: string;
  roomName: string;
  imageUrl?: string | null;
  boardName: string;
  refundableTag: string;
  cancelTime?: string | null;
  amount: number;
  currency: string;
};

type RatesSearchPayload = {
  checkin: string;
  checkout: string;
  occupancies: Array<{ adults: number }>;
  guestNationality: string;
  currency: string;
  roomMapping: boolean;
  includeHotelData: boolean;
  maxRatesPerHotel: number;
  limit: number;
  timeout?: number;
  minRating?: number;
  starRating?: number[];
  minReviewsCount?: number;
  facilities?: number[];
  strictFacilityFiltering?: boolean;
  placeId?: string;
  cityName?: string;
  aiSearch?: string;
  offset?: number;
};

function nextStayWindow(): { checkin: string; checkout: string } {
  const checkinDate = new Date();
  checkinDate.setDate(checkinDate.getDate() + 14);
  const checkoutDate = new Date(checkinDate);
  checkoutDate.setDate(checkoutDate.getDate() + 2);
  return {
    checkin: checkinDate.toISOString().slice(0, 10),
    checkout: checkoutDate.toISOString().slice(0, 10)
  };
}

import { Redis } from '@upstash/redis';

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

type DetailedFetchResult<T> = {
  data: T | null;
  degradedReason: Exclude<SupplierDegradedReason, 'partial'> | null;
  status: number | null;
  statusText: string | null;
  bodySnippet: string | null;
};

function isTimeoutLikeError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || /timeout|aborted/i.test(error.message));
}

function maskApiKey(value?: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function safeSnippet(value: unknown, maxLength = 1200): string {
  try {
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    if (!raw) return '';
    return raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw;
  } catch {
    return '[unserializable]';
  }
}

function logLiteApiDebug(event: string, payload: Record<string, unknown>) {
  logger.info({ liteapiEvent: event, ...payload }, 'LiteAPI debug');
}

async function fetchJsonWithBackoffDetailed<T>(
  url: string,
  init?: RequestInit,
  retries = 3,
  delay = 500
): Promise<DetailedFetchResult<T>> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutMs = Math.max(1_000, env.LITEAPI_TIMEOUT_MS);
    const controller = new AbortController();
    timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        logger.warn({ url, retriesLeft: retries }, 'LiteAPI rate limited. Retrying...');
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchJsonWithBackoffDetailed<T>(url, init, retries - 1, delay * 2);
      }
      logger.warn(
        {
          url,
          status: response.status,
          bodySample: text.slice(0, 180)
        },
        'LiteAPI request failed'
      );
      return {
        data: null,
        degradedReason: 'unavailable',
        status: response.status,
        statusText: response.statusText,
        bodySnippet: safeSnippet(text)
      };
    }
    return {
      data: JSON.parse(text) as T,
      degradedReason: null,
      status: response.status,
      statusText: response.statusText,
      bodySnippet: null
    };
  } catch (error) {
    if (retries > 0) {
      logger.warn({ error, url, retriesLeft: retries }, 'LiteAPI request errored. Retrying...');
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchJsonWithBackoffDetailed<T>(url, init, retries - 1, delay * 2);
    }
    logger.warn({ error, url }, 'LiteAPI request errored');
    return {
      data: null,
      degradedReason: isTimeoutLikeError(error) ? 'timeout' : 'unavailable',
      status: null,
      statusText: null,
      bodySnippet: safeSnippet(error instanceof Error ? error.message : error)
    };
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const result = await fetchJsonWithBackoffDetailed<T>(url, init);
  return result.data;
}

function parseRateAmount(rate: Record<string, unknown>): { amount: number | null; currency: string | null } {
  if (typeof rate.retailRate === 'number') {
    return {
      amount: rate.retailRate,
      currency: typeof rate.retailRateCurrency === 'string' ? rate.retailRateCurrency : null
    };
  }

  const retailRate = (rate.retailRate as Record<string, unknown> | undefined) ?? {};
  const totals = (retailRate.total as Array<Record<string, unknown>> | undefined) ?? [];
  const first = totals[0] ?? {};
  const rawAmount = first.amount;
  const parsedAmount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
  return {
    amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
    currency: typeof first.currency === 'string' ? first.currency : null
  };
}

function parseNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickStringValue(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanString(data[key]);
    if (value) return value;
  }
  return null;
}

function pickStringList(data: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const candidate = data[key];
    if (!Array.isArray(candidate)) continue;
    const list = candidate
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (!item || typeof item !== 'object') return '';
        const row = item as Record<string, unknown>;
        return (
          cleanString(row.text) ??
          cleanString(row.label) ??
          cleanString(row.name) ??
          cleanString(row.value) ??
          ''
        );
      })
      .filter(Boolean);
    if (list.length > 0) {
      return list;
    }
  }
  return [];
}

function pickImageUrl(hotel: Record<string, unknown>): string | undefined {
  const directKeys = [
    hotel.main_photo,
    hotel.mainPhoto,
    hotel.thumbnail,
    hotel.image,
    hotel.imageUrl,
    hotel.photo
  ];
  for (const key of directKeys) {
    if (typeof key === 'string' && key.length > 0) {
      return key;
    }
  }

  const collectionKeys = [hotel.images, hotel.photos, hotel.gallery];
  for (const collection of collectionKeys) {
    if (!Array.isArray(collection) || collection.length === 0) continue;
    const first = collection[0];
    if (typeof first === 'string' && first.length > 0) return first;
    if (first && typeof first === 'object') {
      const obj = first as Record<string, unknown>;
      const nested = [obj.url, obj.image, obj.imageUrl, obj.src];
      for (const candidate of nested) {
        if (typeof candidate === 'string' && candidate.length > 0) {
          return candidate;
        }
      }
    }
  }

  return undefined;
}

function pickImageUrls(hotel: Record<string, unknown>): string[] {
  const picked = new Set<string>();
  const first = pickImageUrl(hotel);
  if (first) picked.add(first);

  const collectionKeys = [hotel.images, hotel.photos, hotel.gallery];
  for (const collection of collectionKeys) {
    if (!Array.isArray(collection)) continue;
    for (const item of collection) {
      if (typeof item === 'string' && item.length > 0) {
        picked.add(item);
        continue;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const values = [obj.url, obj.image, obj.imageUrl, obj.src];
        for (const value of values) {
          if (typeof value === 'string' && value.length > 0) {
            picked.add(value);
            break;
          }
        }
      }
      if (picked.size >= 24) break;
    }
    if (picked.size >= 24) break;
  }

  return Array.from(picked);
}

function pickImageUrlsFromUnknown(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const picked = new Set<string>(pickImageUrls(record));
  const extraArrayKeys = ['roomImages', 'photoUrls', 'media', 'assets'];
  for (const key of extraArrayKeys) {
    const candidate = record[key];
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const item of candidate) {
      if (typeof item === 'string' && item.trim().length > 0) {
        picked.add(item.trim());
        continue;
      }
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const url = cleanString(row.url) ?? cleanString(row.image) ?? cleanString(row.imageUrl) ?? cleanString(row.src);
        if (url) {
          picked.add(url);
        }
      }
    }
  }

  return Array.from(picked);
}

function pickFacilities(data: Record<string, unknown>): string[] {
  const options = [data.facilities, data.amenities, data.popularFacilities, data.propertyFacilities];
  for (const option of options) {
    if (!Array.isArray(option)) continue;
    const names = option
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          if (typeof obj.name === 'string') return obj.name.trim();
          if (typeof obj.label === 'string') return obj.label.trim();
          if (typeof obj.title === 'string') return obj.title.trim();
        }
        return '';
      })
      .filter(Boolean);
    if (names.length > 0) {
      return names.slice(0, 80);
    }
  }
  return [];
}

function pickCoordinates(data: Record<string, unknown>): { latitude: number | null; longitude: number | null } {
  const latitude =
    parseNumber(data.latitude) ??
    parseNumber((data.coordinates as Record<string, unknown> | undefined)?.lat) ??
    parseNumber((data.geo as Record<string, unknown> | undefined)?.latitude);
  const longitude =
    parseNumber(data.longitude) ??
    parseNumber((data.coordinates as Record<string, unknown> | undefined)?.lng) ??
    parseNumber((data.geo as Record<string, unknown> | undefined)?.longitude);
  return { latitude, longitude };
}

function pickReviewBreakdown(data: Record<string, unknown>): Array<{ label: string; score: number }> {
  const candidates = [
    data.reviewBreakdown,
    data.reviewCategories,
    (data.reviews as Record<string, unknown> | undefined)?.categories
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const mapped = candidate
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const label =
          typeof row.label === 'string'
            ? row.label
            : typeof row.name === 'string'
              ? row.name
              : typeof row.category === 'string'
                ? row.category
                : null;
        const score = parseNumber(row.score) ?? parseNumber(row.rating) ?? parseNumber(row.value);
        if (!label || score === null) return null;
        return { label, score };
      })
      .filter((item): item is { label: string; score: number } => Boolean(item));
    if (mapped.length > 0) return mapped.slice(0, 12);
  }
  return [];
}

function pickGuestReviews(data: Record<string, unknown>): HotelGuestReview[] {
  const candidates = [
    data.reviews,
    (data.reviewData as Record<string, unknown> | undefined)?.reviews,
    (data.guestReviews as Record<string, unknown> | undefined)?.items
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const mapped = candidate
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const comment =
          typeof row.comment === 'string'
            ? row.comment
            : typeof row.reviewText === 'string'
              ? row.reviewText
              : typeof row.text === 'string'
                ? row.text
                : '';
        if (!comment.trim()) return null;
        const pros = cleanString(row.pros) ?? cleanString(row.positive);
        const cons = cleanString(row.cons) ?? cleanString(row.negative);

        return {
          author: cleanString(row.author) ?? cleanString(row.userName) ?? cleanString(row.guest),
          travelerType: cleanString(row.travelerType) ?? cleanString(row.tripType),
          comment: comment.trim(),
          score: parseNumber(row.score) ?? parseNumber(row.rating),
          createdAt: cleanString(row.createdAt) ?? cleanString(row.date),
          pros,
          cons
        } satisfies HotelGuestReview;
      })
      .filter((item) => item !== null);
    if (mapped.length > 0) return mapped.slice(0, 20);
  }
  return [];
}

function pickPolicies(data: Record<string, unknown>): HotelPolicyDetails {
  const policyRoot =
    (data.policies as Record<string, unknown> | undefined) ??
    (data.policy as Record<string, unknown> | undefined) ??
    {};

  const checkIn =
    (policyRoot.checkIn as Record<string, unknown> | undefined) ??
    (data.checkIn as Record<string, unknown> | undefined) ??
    {};
  const checkOut =
    (policyRoot.checkOut as Record<string, unknown> | undefined) ??
    (data.checkOut as Record<string, unknown> | undefined) ??
    {};

  return {
    checkInFrom:
      cleanString(checkIn.from) ??
      cleanString(checkIn.start) ??
      pickStringValue(policyRoot, ['checkInFrom', 'checkinFrom', 'checkInStart']),
    checkInUntil:
      cleanString(checkIn.until) ??
      cleanString(checkIn.end) ??
      pickStringValue(policyRoot, ['checkInUntil', 'checkinUntil', 'checkInEnd']),
    checkOutFrom:
      cleanString(checkOut.from) ??
      cleanString(checkOut.start) ??
      pickStringValue(policyRoot, ['checkOutFrom', 'checkoutFrom', 'checkOutStart']),
    checkOutUntil:
      cleanString(checkOut.until) ??
      cleanString(checkOut.end) ??
      pickStringValue(policyRoot, ['checkOutUntil', 'checkoutUntil', 'checkOutEnd']),
    cancellation: pickStringList(policyRoot, ['cancellation', 'cancellationPolicies', 'cancellationPolicy'])
      .concat(pickStringList(data, ['cancellationPolicy']))
      .slice(0, 20),
    payment: pickStringList(policyRoot, ['payment', 'paymentTerms']).slice(0, 20),
    pets: pickStringList(policyRoot, ['pets', 'petPolicy']).slice(0, 20),
    children: pickStringList(policyRoot, ['children', 'childPolicy', 'childrenPolicy']).slice(0, 20),
    extra: pickStringList(policyRoot, ['other', 'extra', 'importantNotes']).slice(0, 20)
  };
}

function pickLocationContext(data: Record<string, unknown>, city: string, countryCode: string | null): HotelLocationContext {
  const { latitude, longitude } = pickCoordinates(data);
  const locationRoot =
    (data.location as Record<string, unknown> | undefined) ??
    (data.area as Record<string, unknown> | undefined) ??
    {};

  return {
    addressLine: cleanString(data.address),
    city: cleanString(data.city) ?? city,
    countryCode,
    latitude,
    longitude,
    neighborhood: pickStringValue(locationRoot, ['neighborhood', 'district', 'areaName']),
    transit: pickStringList(locationRoot, ['transit', 'transport', 'publicTransport', 'metro', 'bus', 'airport']).slice(0, 20),
    nearbyLandmarks: pickStringList(locationRoot, ['nearby', 'landmarks', 'pointsOfInterest', 'attractions', 'poi']).slice(0, 20)
  };
}

function pickFacilityCategories(data: Record<string, unknown>, facilities: string[]): HotelFacilityCategory[] {
  const directGroups = data.facilitiesByCategory ?? data.facilityGroups ?? data.hotelFacilities;
  if (Array.isArray(directGroups)) {
    const mapped = directGroups
      .map((group) => {
        if (!group || typeof group !== 'object') return null;
        const row = group as Record<string, unknown>;
        const category = cleanString(row.category) ?? cleanString(row.name) ?? cleanString(row.title);
        const items = pickStringList(row, ['items', 'facilities', 'amenities']);
        if (!category || items.length === 0) return null;
        return { category, items: items.slice(0, 18) } satisfies HotelFacilityCategory;
      })
      .filter((item): item is HotelFacilityCategory => Boolean(item));
    if (mapped.length > 0) return mapped.slice(0, 8);
  }

  if (facilities.length === 0) {
    return [];
  }

  const buckets: Record<string, string[]> = {
    'Most popular facilities': [],
    Services: [],
    'Room amenities': [],
    'Food & drink': [],
    'Safety & security': []
  };

  for (const facility of facilities) {
    const text = facility.toLowerCase();
    if (/(wifi|internet|desk|tv|air|bath|shower|linen|wardrobe|socket)/.test(text)) {
      buckets['Room amenities'].push(facility);
    } else if (/(restaurant|bar|breakfast|coffee|kitchen|dining)/.test(text)) {
      buckets['Food & drink'].push(facility);
    } else if (/(security|cctv|alarm|safe|fire|smoke)/.test(text)) {
      buckets['Safety & security'].push(facility);
    } else if (/(concierge|front desk|housekeeping|laundry|parking|shuttle|car hire|luggage)/.test(text)) {
      buckets.Services.push(facility);
    } else {
      buckets['Most popular facilities'].push(facility);
    }
  }

  return Object.entries(buckets)
    .map(([category, items]) => ({ category, items: Array.from(new Set(items)).slice(0, 18) }))
    .filter((group) => group.items.length > 0);
}

function pickAreaInfo(data: Record<string, unknown>, location: HotelLocationContext): HotelAreaInfoItem[] {
  const area: HotelAreaInfoItem[] = [];
  if (location.addressLine) {
    area.push({ label: 'Address', value: location.addressLine });
  }
  if (location.neighborhood) {
    area.push({ label: 'Neighborhood', value: location.neighborhood });
  }
  if (location.transit.length > 0) {
    area.push({ label: 'Transit', value: location.transit.slice(0, 3).join(', ') });
  }
  if (location.nearbyLandmarks.length > 0) {
    area.push({ label: 'Nearby places', value: location.nearbyLandmarks.slice(0, 4).join(', ') });
  }
  if (location.city) {
    area.push({ label: 'City', value: location.city });
  }
  if (location.countryCode) {
    area.push({ label: 'Country', value: location.countryCode });
  }
  if (location.latitude !== null && location.longitude !== null) {
    area.push({ label: 'Coordinates', value: `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` });
  }

  const distances = (data.distances as Array<Record<string, unknown>> | undefined) ?? [];
  for (const distance of distances.slice(0, 4)) {
    const name = cleanString(distance.name) ?? cleanString(distance.place) ?? null;
    const value = cleanString(distance.distance) ?? cleanString(distance.value) ?? null;
    if (name && value) {
      area.push({ label: name, value });
    }
  }

  return area.slice(0, 8);
}

function pickNearbyRestaurants(data: Record<string, unknown>): HotelRestaurantInfo[] {
  const candidates = [data.restaurants, data.dining, data.nearbyRestaurants];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const mapped = candidate
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const name = cleanString(row.name) ?? cleanString(row.title);
        if (!name) return null;
        return {
          name,
          cuisine: cleanString(row.cuisine) ?? cleanString(row.type),
          description: cleanString(row.description) ?? cleanString(row.summary)
        } satisfies HotelRestaurantInfo;
      })
      .filter((item): item is HotelRestaurantInfo => Boolean(item));
    if (mapped.length > 0) {
      return mapped.slice(0, 6);
    }
  }
  return [];
}

function pickHouseRulesDetailed(data: Record<string, unknown>, policies: HotelPolicyDetails): HotelHouseRuleItem[] {
  const rulesRoot = (data.houseRules as Array<Record<string, unknown>> | undefined) ?? [];
  const mapped = rulesRoot
    .map((item) => {
      const title = cleanString(item.title) ?? cleanString(item.name);
      const detail = cleanString(item.detail) ?? cleanString(item.value) ?? cleanString(item.description);
      if (!title || !detail) return null;
      return { title, detail } satisfies HotelHouseRuleItem;
    })
    .filter((item): item is HotelHouseRuleItem => Boolean(item));

  if (mapped.length > 0) {
    return mapped.slice(0, 10);
  }

  const fallback: HotelHouseRuleItem[] = [];
  if (policies.children.length > 0) {
    fallback.push({ title: 'Children policy', detail: policies.children.join(' ') });
  }
  if (policies.pets.length > 0) {
    fallback.push({ title: 'Pet policy', detail: policies.pets.join(' ') });
  }
  if (policies.cancellation.length > 0) {
    fallback.push({ title: 'Cancellation', detail: policies.cancellation[0] });
  }
  if (policies.payment.length > 0) {
    fallback.push({ title: 'Payment', detail: policies.payment[0] });
  }

  return fallback;
}

function pickProsAndCons(reviews: HotelGuestReview[]): HotelProsAndCons {
  const pros = new Set<string>();
  const cons = new Set<string>();

  for (const review of reviews) {
    if (review.pros) pros.add(review.pros);
    if (review.cons) cons.add(review.cons);
    if (pros.size >= 6 && cons.size >= 6) break;
  }

  return {
    pros: Array.from(pros).slice(0, 6),
    cons: Array.from(cons).slice(0, 6)
  };
}

function composeSmartHighlights(input: {
  city: string;
  reviewScore: number | null;
  reviewCount: number | null;
  locationContext: HotelLocationContext;
  facilities: string[];
  policies: HotelPolicyDetails;
}): HotelSmartHighlight[] {
  const highlights: HotelSmartHighlight[] = [];

  if (typeof input.reviewScore === 'number') {
    const scoreLabel = input.reviewScore >= 9 ? 'Excellent' : input.reviewScore >= 8 ? 'Very good' : 'Good';
    const reviewCountCopy =
      typeof input.reviewCount === 'number'
        ? `based on ${Math.round(input.reviewCount).toLocaleString()} reviews`
        : 'based on available supplier reviews';
    highlights.push({
      title: 'Guest sentiment',
      detail: `${scoreLabel} rating of ${input.reviewScore.toFixed(1)} / 10, ${reviewCountCopy}.`,
      source: 'reviews'
    });
  }

  if (input.locationContext.nearbyLandmarks.length > 0) {
    highlights.push({
      title: 'Area context',
      detail: `Close to ${input.locationContext.nearbyLandmarks.slice(0, 3).join(', ')}.`,
      source: 'location'
    });
  } else if (input.locationContext.addressLine || input.locationContext.neighborhood) {
    const locationLabel =
      input.locationContext.neighborhood ??
      input.locationContext.addressLine ??
      `central ${input.city}`;
    highlights.push({
      title: 'Area context',
      detail: `Located around ${locationLabel}.`,
      source: 'location'
    });
  }

  if (input.facilities.length > 0) {
    highlights.push({
      title: 'Popular amenities',
      detail: `Top amenities include ${input.facilities.slice(0, 4).join(', ')}.`,
      source: 'amenities'
    });
  }

  if (
    input.policies.cancellation.length > 0 ||
    input.policies.checkInFrom !== null ||
    input.policies.checkOutUntil !== null
  ) {
    const checkIn = input.policies.checkInFrom ?? 'not provided';
    const checkOut = input.policies.checkOutUntil ?? 'not provided';
    const cancellation = input.policies.cancellation[0] ?? 'Cancellation terms depend on selected room and rate.';
    highlights.push({
      title: 'Arrival and cancellation',
      detail: `Check-in from ${checkIn}, check-out until ${checkOut}. ${cancellation}`,
      source: 'policies'
    });
  }

  return highlights.slice(0, 5);
}

const REVIEW_TOPIC_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Location', pattern: /\blocation|area|neighbou?rhood|nearby|walkable|transport\b/i },
  { label: 'Cleanliness', pattern: /\bclean|tidy|hygiene|spotless\b/i },
  { label: 'Service', pattern: /\bstaff|service|friendly|helpful|host\b/i },
  { label: 'Room comfort', pattern: /\broom|bed|comfort|spacious|quiet\b/i },
  { label: 'Breakfast and food', pattern: /\bbreakfast|food|restaurant|meal|buffet\b/i },
  { label: 'Value for money', pattern: /\bvalue|price|expensive|affordable|worth\b/i },
  { label: 'Wi-Fi', pattern: /\bwi[ -]?fi|internet\b/i },
  { label: 'Bathroom', pattern: /\bbathroom|shower|toilet|water pressure\b/i }
];

function rankReviewTopics(counter: Map<string, number>, minMentions: number): HotelReviewTopic[] {
  return Array.from(counter.entries())
    .filter(([, mentions]) => mentions >= minMentions)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([label, mentions]) => ({ label, mentions }));
}

function buildReviewHighlights(reviews: HotelGuestReview[]): HotelReviewHighlights {
  if (reviews.length < 3) {
    return {
      positiveTopics: [],
      tradeoffTopics: [],
      lowSignal: true,
      message: 'Not enough verified review volume to generate stable topic highlights yet.'
    };
  }

  const positiveCounts = new Map<string, number>();
  const tradeoffCounts = new Map<string, number>();

  const increment = (counter: Map<string, number>, label: string) => {
    counter.set(label, (counter.get(label) ?? 0) + 1);
  };

  for (const review of reviews) {
    // Use explicit polarity fields only; neutral comment text should not be counted as both positive and trade-off.
    const positiveText = typeof review.pros === 'string' ? review.pros.trim() : '';
    const tradeoffText = typeof review.cons === 'string' ? review.cons.trim() : '';

    for (const topic of REVIEW_TOPIC_PATTERNS) {
      if (positiveText && topic.pattern.test(positiveText)) {
        increment(positiveCounts, topic.label);
      }
      if (tradeoffText && topic.pattern.test(tradeoffText)) {
        increment(tradeoffCounts, topic.label);
      }
    }
  }

  const minimumMentions = reviews.length >= 10 ? 3 : 2;
  const positiveTopics = rankReviewTopics(positiveCounts, minimumMentions);
  const tradeoffTopics = rankReviewTopics(tradeoffCounts, minimumMentions);

  if (positiveTopics.length === 0 && tradeoffTopics.length === 0) {
    return {
      positiveTopics: [],
      tradeoffTopics: [],
      lowSignal: true,
      message: 'Review comments are available, but recurring topics are too sparse for a reliable summary.'
    };
  }

  return {
    positiveTopics,
    tradeoffTopics,
    lowSignal: false,
    message: 'Topic highlights summarize recurring review themes from supplier comments.'
  };
}

function composeDescriptionNarrative(input: {
  description: string | null;
  city: string;
  locationContext: HotelLocationContext;
  facilities: string[];
  policies: HotelPolicyDetails;
  reviewScore: number | null;
}): HotelDescriptionNarrative {
  const supplierDescription = input.description?.trim() ?? null;
  if (supplierDescription && supplierDescription.length > 0) {
    return {
      mode: 'supplier',
      message: 'Description sourced directly from supplier content.',
      sections: [
        {
          title: 'About this property',
          body: supplierDescription,
          source: 'supplier'
        }
      ]
    };
  }

  const sections: HotelDescriptionSection[] = [];

  if (input.locationContext.nearbyLandmarks.length > 0 || input.locationContext.neighborhood) {
    const nearby = input.locationContext.nearbyLandmarks.slice(0, 3).join(', ');
    const locationLine = nearby
      ? `Guests often use this stay as a base for ${nearby}.`
      : `The property is located around ${input.locationContext.neighborhood ?? `central ${input.city}`}.`;
    sections.push({
      title: 'Location fit',
      body: locationLine,
      source: 'synthesized'
    });
  }

  if (input.facilities.length > 0) {
    sections.push({
      title: 'Stay essentials',
      body: `Supplier-listed amenities include ${input.facilities.slice(0, 5).join(', ')}.`,
      source: 'synthesized'
    });
  }

  if (typeof input.reviewScore === 'number') {
    sections.push({
      title: 'Guest sentiment',
      body: `Current supplier rating is ${input.reviewScore.toFixed(1)} / 10 based on available review data.`,
      source: 'synthesized'
    });
  }

  if (input.policies.checkInFrom || input.policies.checkOutUntil || input.policies.cancellation.length > 0) {
    sections.push({
      title: 'Booking notes',
      body: `Check-in from ${input.policies.checkInFrom ?? 'not provided'}, check-out until ${input.policies.checkOutUntil ?? 'not provided'}. ${input.policies.cancellation[0] ?? 'Cancellation terms depend on selected room and fare.'}`,
      source: 'synthesized'
    });
  }

  if (sections.length > 0) {
    return {
      mode: 'synthesized',
      sections,
      message: 'Description is synthesized from available supplier fields because narrative text is unavailable.'
    };
  }

  return {
    mode: 'unavailable',
    sections: [],
    message: 'Property description is currently unavailable.'
  };
}

function buildCompleteness(details: {
  photos: string[];
  facilities: string[];
  policies: HotelPolicyDetails;
  locationContext: HotelLocationContext;
  reviews: HotelGuestReview[];
  prosAndCons: HotelProsAndCons;
}): HotelDetailCompleteness {
  const missingSections: string[] = [];
  if (details.photos.length === 0) missingSections.push('gallery');
  if (details.facilities.length === 0) missingSections.push('amenities');
  if (
    details.policies.cancellation.length === 0 &&
    details.policies.checkInFrom === null &&
    details.policies.checkOutUntil === null
  ) {
    missingSections.push('policies');
  }
  if (
    details.locationContext.addressLine === null &&
    details.locationContext.latitude === null &&
    details.locationContext.nearbyLandmarks.length === 0
  ) {
    missingSections.push('location');
  }
  if (details.reviews.length === 0) missingSections.push('reviews');
  if (details.prosAndCons.pros.length === 0 && details.prosAndCons.cons.length === 0) {
    missingSections.push('pros-cons');
  }

  return {
    isPartial: missingSections.length > 0,
    missingSections,
    message:
      missingSections.length > 0
        ? `Some supplier details are currently unavailable: ${missingSections.join(', ')}.`
        : 'Supplier content for key hotel sections is available.'
  };
}

function pickReviewScore(data: Record<string, unknown>): number | null {
  return (
    parseNumber(data.reviewScore) ??
    parseNumber(data.review_rating) ??
    parseNumber(data.guestRating) ??
    parseNumber(data.rating)
  );
}

function pickReviewCount(data: Record<string, unknown>): number | null {
  return (
    parseNumber(data.reviewCount) ??
    parseNumber(data.reviewsCount) ??
    parseNumber(data.numReviews) ??
    parseNumber(data.totalReviews)
  );
}

function shouldEnrichReviews(
  reviewScore: number | null,
  reviewCount: number | null,
  reviewBreakdown: Array<{ label: string; score: number }>,
  reviews: HotelGuestReview[]
): boolean {
  return reviewScore === null || reviewCount === null || reviewBreakdown.length === 0 || reviews.length === 0;
}

async function fetchReviewEnrichmentFromRates(
  hotelId: string,
  runtime: Awaited<ReturnType<typeof resolveLiteApiRuntimeConfig>>,
  currency?: string
): Promise<{
  reviewScore: number | null;
  reviewCount: number | null;
  reviewBreakdown: Array<{ label: string; score: number }>;
  reviews: HotelGuestReview[];
} | null> {
  try {
    const stayWindow = nextStayWindow();
    const response = await fetch(`${runtime.baseUrl}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': runtime.apiKey
      },
      body: JSON.stringify({
        hotelIds: [hotelId],
        checkin: stayWindow.checkin,
        checkout: stayWindow.checkout,
        occupancies: [{ adults: 2 }],
        guestNationality: env.DEFAULT_GUEST_NATIONALITY,
        currency: currency ?? env.DEFAULT_CURRENCY,
        includeHotelData: true,
        roomMapping: true,
        maxRatesPerHotel: 1
      }),
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      logger.warn({ hotelId, status: response.status }, 'LiteAPI review enrichment request failed');
      return null;
    }

    const payload = (await response.json()) as LiteApiResponse<Array<Record<string, unknown>>>;
    const hotelLookup = new Map<string, Record<string, unknown>>();
    for (const item of payload.hotels ?? []) {
      const id = String(item.id ?? item.hotelId ?? '');
      if (id) hotelLookup.set(id, item);
    }

    const firstResult = payload.data?.[0] ?? {};
    const embeddedHotel = (firstResult.hotel || firstResult.hotelData || {}) as Record<string, unknown>;
    const lookupHotel = hotelLookup.get(hotelId) ?? hotelLookup.get(String(embeddedHotel.id ?? embeddedHotel.hotelId ?? '')) ?? {};
    const mergedHotel = { ...lookupHotel, ...embeddedHotel };

    if (Object.keys(mergedHotel).length === 0) {
      return null;
    }

    return {
      reviewScore: pickReviewScore(mergedHotel),
      reviewCount: pickReviewCount(mergedHotel),
      reviewBreakdown: pickReviewBreakdown(mergedHotel),
      reviews: pickGuestReviews(mergedHotel)
    };
  } catch (error) {
    logger.warn({ error, hotelId }, 'LiteAPI review enrichment failed');
    return null;
  }
}

function mapRatesResponse(
  response: LiteApiResponse<Array<Record<string, unknown>>>,
  fallbackCity: string
): PropertyPreview[] {
  const hotelLookup = new Map<string, Record<string, unknown>>();
  for (const item of response.hotels ?? []) {
    const id = String(item.id ?? item.hotelId ?? '');
    if (id) {
      hotelLookup.set(id, item);
    }
  }

  const previews = (response.data ?? []).map((entry: Record<string, unknown>) => {
    const hotelId = String(entry.hotelId ?? '');
    const hotelFromRates = (entry.hotel || entry.hotelData || {}) as Record<string, unknown>;
    const hotelFromLookup = hotelLookup.get(hotelId) ?? {};
    const hotel = { ...hotelFromLookup, ...hotelFromRates };

    const roomTypes = (entry.roomTypes as Array<Record<string, unknown>> | undefined) ?? [];
    const firstRate = roomTypes
      .flatMap((roomType) => ((roomType.rates as Array<Record<string, unknown>> | undefined) ?? []))
      .find(Boolean) ?? {};
    const amountInfo = parseRateAmount(firstRate);

    const starRaw = hotel.starRating;
    const parsedStar = typeof starRaw === 'number' ? starRaw : Number(starRaw);
    const reviewScore =
      parseNumber(hotel.reviewScore) ??
      parseNumber(hotel.review_rating) ??
      parseNumber(hotel.guestRating) ??
      parseNumber(hotel.rating);
    const reviewCount =
      parseNumber(hotel.reviewCount) ??
      parseNumber(hotel.reviewsCount) ??
      parseNumber(hotel.numReviews) ??
      parseNumber(hotel.totalReviews);
    const { latitude, longitude } = pickCoordinates(hotel);

    return {
      hotelId: hotelId || String(hotel.id ?? `hotel-${Math.random().toString(16).slice(2, 8)}`),
      name: String(hotel.name ?? 'Hotel'),
      city: String(hotel.city ?? fallbackCity),
      countryCode: typeof hotel.countryCode === 'string' ? hotel.countryCode : undefined,
      latitude,
      longitude,
      starRating: Number.isFinite(parsedStar) ? parsedStar : null,
      reviewScore,
      reviewCount,
      imageUrl: pickImageUrl(hotel),
      price: amountInfo.amount,
      currency: amountInfo.currency ?? env.DEFAULT_CURRENCY,
      amenities: pickFacilities(hotel)
    } satisfies PropertyPreview;
  });

  const deduped = new Map<string, PropertyPreview>();
  for (const item of previews) {
    if (!item.hotelId || !item.name) {
      continue;
    }
    if (!deduped.has(item.hotelId)) {
      deduped.set(item.hotelId, item);
    }
  }
  return Array.from(deduped.values());
}

type SearchRatesResult = {
  items: PropertyPreview[];
  degradedReason: Exclude<SupplierDegradedReason, 'partial'> | null;
};

async function searchRates(
  payload: RatesSearchPayload,
  fallbackCity: string,
  runtime: Awaited<ReturnType<typeof resolveLiteApiRuntimeConfig>>
): Promise<SearchRatesResult> {
  let cacheKey: string | null = null;
  if (redis) {
    try {
      cacheKey = `liteapi:rates:${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
      const cached = await redis.get<PropertyPreview[]>(cacheKey);
      if (cached) {
        return {
          items: cached,
          degradedReason: null
        };
      }
    } catch {
      // ignore cache errors
    }
  }

  logLiteApiDebug('rates_request', {
    liteApiEnv: runtime.mode,
    url: `${runtime.baseUrl}/hotels/rates`,
    hasApiKey: Boolean(runtime.apiKey),
    apiKey: maskApiKey(runtime.apiKey),
    timeoutMs: env.LITEAPI_TIMEOUT_MS,
    payload: {
      checkin: payload.checkin,
      checkout: payload.checkout,
      currency: payload.currency,
      guestNationality: payload.guestNationality,
      occupancies: payload.occupancies,
      placeId: payload.placeId,
      cityName: payload.cityName,
      aiSearch: payload.aiSearch,
      timeoutSeconds: payload.timeout,
      minRating: payload.minRating,
      starRating: payload.starRating,
      limit: payload.limit
    }
  });

  const response = await fetchJsonWithBackoffDetailed<LiteApiResponse<Array<Record<string, unknown>>>>(`${runtime.baseUrl}/hotels/rates`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-Key': runtime.apiKey
    },
    body: JSON.stringify(payload),
    next: { revalidate: 300 }
  });

  logLiteApiDebug('rates_response', {
    status: response.status,
    statusText: response.statusText,
    ok: Boolean(response.data),
    degradedReason: response.degradedReason,
    bodySnippet: response.bodySnippet
  });

  if (!response.data) {
    return {
      items: [],
      degradedReason: response.degradedReason
    };
  }

  const mapped = mapRatesResponse(response.data, fallbackCity);
  logLiteApiDebug('rates_response_summary', {
    upstreamHotelsCount: Array.isArray(response.data.hotels) ? response.data.hotels.length : 0,
    upstreamDataCount: Array.isArray(response.data.data) ? response.data.data.length : 0,
    mappedCount: mapped.length
  });
  if (redis && cacheKey && mapped.length > 0) {
    try {
      await redis.set(cacheKey, mapped, { ex: 300 });
    } catch {
      // ignore
    }
  }
  return {
    items: mapped,
    degradedReason: null
  };
}

async function fetchPhotoEnrichmentFromRates(
  hotelId: string,
  runtime: Awaited<ReturnType<typeof resolveLiteApiRuntimeConfig>>,
  currency?: string
): Promise<string[]> {
  try {
    const stayWindow = nextStayWindow();
    const response = await fetch(`${runtime.baseUrl}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': runtime.apiKey
      },
      body: JSON.stringify({
        hotelIds: [hotelId],
        checkin: stayWindow.checkin,
        checkout: stayWindow.checkout,
        occupancies: [{ adults: 2 }],
        guestNationality: env.DEFAULT_GUEST_NATIONALITY,
        currency: currency ?? env.DEFAULT_CURRENCY,
        includeHotelData: true,
        roomMapping: true,
        maxRatesPerHotel: 6
      }),
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as LiteApiResponse<Array<Record<string, unknown>>>;
    const photos = new Set<string>();

    for (const hotel of payload.hotels ?? []) {
      for (const image of pickImageUrlsFromUnknown(hotel)) {
        photos.add(image);
      }
    }

    for (const entry of payload.data ?? []) {
      const hotelData = (entry.hotel as Record<string, unknown> | undefined) ?? (entry.hotelData as Record<string, unknown> | undefined) ?? {};
      for (const image of pickImageUrlsFromUnknown(hotelData)) {
        photos.add(image);
      }

      const roomTypes = (entry.roomTypes as Array<Record<string, unknown>> | undefined) ?? [];
      for (const roomType of roomTypes) {
        for (const image of pickImageUrlsFromUnknown(roomType)) {
          photos.add(image);
        }
        const rates = (roomType.rates as Array<Record<string, unknown>> | undefined) ?? [];
        for (const rate of rates) {
          for (const image of pickImageUrlsFromUnknown(rate)) {
            photos.add(image);
          }
        }
      }
    }

    return Array.from(photos).slice(0, 40);
  } catch (error) {
    logger.warn({ error, hotelId }, 'LiteAPI photo enrichment failed');
    return [];
  }
}

export async function autocomplete(query: string, language?: string): Promise<AutocompleteEntity[]> {
  const runtime = await resolveLiteApiRuntimeConfig();

  if (!hasConfiguredLiteApiKey(runtime.apiKey)) {
    return fallbackProperties.map((item) => ({
      id: item.hotelId,
      name: item.city,
      type: 'city' as const,
      countryCode: item.countryCode
    }));
  }

  try {
    const placesResponse = await fetchJson<LiteApiResponse<Array<Record<string, unknown>>>>(
      `${runtime.baseUrl}/data/places?textQuery=${encodeURIComponent(query)}&limit=8${language ? `&language=${encodeURIComponent(language)}` : ''}`,
      {
        headers: {
          accept: 'application/json',
          'X-API-Key': runtime.apiKey
        },
        next: { revalidate: 3600 }
      }
    );

    const places = (placesResponse?.data ?? []).map((item) => {
      const label = String(item.name ?? item.displayName ?? item.formattedAddress ?? query);
      const typeRaw = String(item.type ?? item.placeType ?? '').toLowerCase();
      const mappedType = typeRaw.includes('hotel')
        ? 'hotel'
        : typeRaw.includes('landmark') || typeRaw.includes('point_of_interest')
          ? 'landmark'
          : 'city';

      return {
        id: String(item.placeId ?? item.id ?? label),
        name: label,
        type: mappedType as 'city' | 'hotel' | 'landmark',
        countryCode: typeof item.countryCode === 'string' ? item.countryCode : undefined
      } satisfies AutocompleteEntity;
    });
    if (places.length > 0) {
      return places.slice(0, 8);
    }

    const liteApiClient = new LiteAPI({
      apiKey: runtime.apiKey,
      baseURL: runtime.baseUrl,
      timeout: env.LITEAPI_TIMEOUT_MS
    } as never);
    const response = await liteApiClient.data.cities({ query });
    const cities = (response?.data ?? []).slice(0, 8).map((item: Record<string, string>) => ({
      id: item.id,
      name: item.name,
      type: 'city' as const,
      countryCode: item.countryCode
    }));
    return cities;
  } catch (error) {
    logger.warn({ error }, 'LiteAPI autocomplete failed');
    return fallbackProperties.map((item) => ({
      id: item.hotelId,
      name: item.city,
      type: 'city' as const,
      countryCode: item.countryCode
    }));
  }
}

const fallbackProperties: PropertyPreview[] = [
  {
    hotelId: 'fallback-dubai-1',
    name: 'Palm Horizon Resort',
    city: 'Dubai',
    countryCode: 'AE',
    starRating: 5,
    price: 249,
    currency: 'USD',
    amenities: []
  },
  {
    hotelId: 'fallback-bali-1',
    name: 'Ubud Forest Villa',
    city: 'Bali',
    countryCode: 'ID',
    starRating: 4,
    price: 138,
    currency: 'USD',
    amenities: []
  },
  {
    hotelId: 'fallback-zurich-1',
    name: 'Lakeview Zürich Suites',
    city: 'Zurich',
    countryCode: 'CH',
    starRating: 4,
    price: 201,
    currency: 'USD',
    amenities: []
  }
];

const fallbackHotelContent: Record<string, {
  address: string;
  photos: string[];
  facilities: string[];
  reviewScore: number;
  reviewCount: number;
  description: string;
}> = {
  'fallback-dubai-1': {
    address: 'Palm Jumeirah, Dubai, United Arab Emirates',
    photos: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
    ],
    facilities: ['Beachfront access', 'Infinity pool', 'Breakfast included', 'Spa', 'Airport transfer', 'Family rooms'],
    reviewScore: 8.9,
    reviewCount: 1248,
    description: 'A resort-style stay on Palm Jumeirah with sea-view rooms, generous leisure facilities, and strong guest sentiment around service and breakfast.'
  },
  'fallback-bali-1': {
    address: 'Ubud, Bali, Indonesia',
    photos: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'
    ],
    facilities: ['Private villas', 'Outdoor pool', 'Breakfast included', 'Wellness center', 'Free WiFi'],
    reviewScore: 9.1,
    reviewCount: 684,
    description: 'A quiet villa retreat in Ubud with wellness-led amenities, lush landscaping, and spacious rooms for slower stays.'
  },
  'fallback-zurich-1': {
    address: 'Seefeld District, Zurich, Switzerland',
    photos: [
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1200&q=80'
    ],
    facilities: ['Lake access', 'Breakfast included', 'Fitness studio', 'Business lounge', 'Free WiFi'],
    reviewScore: 8.7,
    reviewCount: 532,
    description: 'A polished Zurich city stay with lake proximity, efficient business-friendly service, and strong comfort scores.'
  }
};

function buildFallbackHotelDetails(hotelId: string): HotelDetails | null {
  const property = fallbackProperties.find((item) => item.hotelId === hotelId);
  const content = fallbackHotelContent[hotelId];
  if (!property || !content) {
    return null;
  }

  const reviewHighlights: HotelReviewHighlights = {
    positiveTopics: [
      { label: 'service', mentions: 18 },
      { label: 'breakfast', mentions: 14 },
      { label: 'pool', mentions: 11 }
    ],
    tradeoffTopics: [
      { label: 'distance', mentions: 6 },
      { label: 'price', mentions: 5 }
    ],
    lowSignal: false,
    message: 'Fallback property review summary.'
  };

  return {
    id: hotelId,
    name: property.name,
    city: property.city,
    countryCode: property.countryCode ?? null,
    address: content.address,
    mainPhoto: content.photos[0] ?? null,
    photos: content.photos,
    facilities: content.facilities,
    description: content.description,
    latitude: null,
    longitude: null,
    starRating: property.starRating,
    reviewScore: content.reviewScore,
    reviewCount: content.reviewCount,
    reviewBreakdown: [
      { label: 'Cleanliness', score: 9.0 },
      { label: 'Service', score: 9.2 },
      { label: 'Location', score: 8.4 },
      { label: 'Comfort', score: 8.9 }
    ],
    reviews: [
      { author: 'Maya', travelerType: 'Couple', comment: 'Beautiful common areas, polished service, and an easy stay overall.', score: 9.2, createdAt: '2026-02-18', pros: 'Service and breakfast', cons: 'Long walk to some nearby spots' },
      { author: 'Rohan', travelerType: 'Family', comment: 'Rooms felt spacious and the pool area was the highlight for our group.', score: 8.8, createdAt: '2026-02-05', pros: 'Pool and family rooms', cons: 'Peak-hour elevator waits' },
      { author: 'Lena', travelerType: 'Solo', comment: 'Smooth check-in, clean room, and good value for a resort-style property.', score: 8.6, createdAt: '2026-01-28', pros: 'Clean and easy', cons: 'Location depends on your plans' },
      { author: 'Haruto', travelerType: 'Couple', comment: 'Breakfast was strong and the room felt calm despite the large property size.', score: 9.0, createdAt: '2026-01-11', pros: 'Breakfast and room comfort', cons: 'Busy lobby at times' }
    ],
    policies: {
      checkInFrom: '15:00',
      checkInUntil: '00:00',
      checkOutFrom: '06:00',
      checkOutUntil: '12:00',
      cancellation: ['Cancellation policy depends on the selected room and rate.'],
      payment: ['A valid payment method is required to confirm the selected room.'],
      pets: ['Pets are not allowed.'],
      children: ['Children are welcome.'],
      extra: ['Property is rendered from local fallback content while live supplier detail is unavailable.']
    },
    locationContext: {
      addressLine: content.address,
      city: property.city,
      countryCode: property.countryCode ?? null,
      latitude: null,
      longitude: null,
      neighborhood: null,
      transit: ['Taxi access available', 'Airport transfer on request'],
      nearbyLandmarks: ['City center access', 'Dining nearby', 'Shopping districts']
    },
    prosAndCons: {
      pros: ['Strong guest service scores', 'Clear leisure amenities', 'Good room comfort'],
      cons: ['Live supplier detail currently unavailable', 'Some location specifics are generalized']
    },
    facilityCategories: [
      { category: 'Popular facilities', items: content.facilities }
    ],
    areaInfo: [
      { label: 'Best for', value: 'Premium city stays with leisure amenities' },
      { label: 'Stay rhythm', value: 'Short breaks, couples, and upgraded family trips' }
    ],
    nearbyRestaurants: [
      { name: 'Signature Grill', cuisine: 'International', description: 'Upscale dinner option within a short drive.' },
      { name: 'Harbor Kitchen', cuisine: 'Casual dining', description: 'All-day dining with breakfast and late lunch options.' }
    ],
    houseRulesDetailed: [
      { title: 'Late arrival', detail: 'Arrival after midnight should be confirmed with the property when possible.' }
    ],
    smartHighlights: [
      { title: 'Strong guest sentiment', detail: 'Review volume and score indicate a consistently positive stay experience.', source: 'reviews' },
      { title: 'Amenity-led stay', detail: content.facilities.slice(0, 3).join(', '), source: 'amenities' },
      { title: 'Policy clarity', detail: 'Room-level cancellation copy remains visible during selection and checkout.', source: 'policies' }
    ],
    reviewHighlights,
    descriptionNarrative: {
      mode: 'synthesized',
      sections: [
        { title: 'Stay overview', body: content.description, source: 'synthesized' }
      ],
      message: 'Fallback hotel description rendered from local content because supplier detail is unavailable.'
    },
    completeness: {
      isPartial: true,
      missingSections: ['live-supplier-detail'],
      message: 'Some supplier details are currently unavailable for this property.'
    }
  };
}

function buildFallbackHotelRates(params: {
  hotelId: string;
  currency?: string;
}): HotelRateOption[] {
  const property = fallbackProperties.find((item) => item.hotelId === params.hotelId);
  if (!property) {
    return [];
  }

  const currency = params.currency ?? property.currency;
  const base = property.price ?? 180;
  return [
    { offerId: params.hotelId + '-offer-1', roomId: params.hotelId + '-room-deluxe', roomName: 'Deluxe Room', imageUrl: fallbackHotelContent[params.hotelId]?.photos[1] ?? fallbackHotelContent[params.hotelId]?.photos[0], boardName: 'Breakfast included', refundableTag: 'Free cancellation', cancelTime: '2026-03-18 18:00:00', amount: base, currency },
    { offerId: params.hotelId + '-offer-2', roomId: params.hotelId + '-room-deluxe', roomName: 'Deluxe Room', imageUrl: fallbackHotelContent[params.hotelId]?.photos[1] ?? fallbackHotelContent[params.hotelId]?.photos[0], boardName: 'Room only', refundableTag: 'Non-refundable', cancelTime: null, amount: base - 24, currency },
    { offerId: params.hotelId + '-offer-3', roomId: params.hotelId + '-room-suite', roomName: 'Sea View Suite', imageUrl: fallbackHotelContent[params.hotelId]?.photos[2] ?? fallbackHotelContent[params.hotelId]?.photos[0], boardName: 'Breakfast included', refundableTag: 'Free cancellation', cancelTime: '2026-03-18 18:00:00', amount: base + 68, currency }
  ];
}

function hasConfiguredLiteApiKey(apiKey: string): boolean {
  return Boolean(apiKey && apiKey !== 'liteapi-placeholder-key');
}

export async function askHotelQuestionWithLiteApi(
  hotelId: string,
  question: string,
  allowWebSearch = false
): Promise<string | null> {
  try {
    const runtime = await resolveLiteApiRuntimeConfig();
    const url = new URL(`${runtime.baseUrl}/data/hotel/ask`);
    url.searchParams.set('hotelId', hotelId);
    url.searchParams.set('question', question);
    if (allowWebSearch) {
      url.searchParams.set('allowWebSearch', 'true');
    }

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'X-API-Key': runtime.apiKey
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as Record<string, unknown>;
    const directAnswer = typeof json.answer === 'string' ? json.answer : null;
    const dataAnswer = typeof (json.data as Record<string, unknown> | undefined)?.answer === 'string'
      ? String((json.data as Record<string, unknown>).answer)
      : null;
    const text = (directAnswer ?? dataAnswer)?.trim();
    return text && text.length > 0 ? text : null;
  } catch (error) {
    logger.warn({ error, hotelId }, 'LiteAPI hotel ask failed');
    return null;
  }
}

function mapSemanticMatch(entry: Record<string, unknown>): SemanticHotelMatch | null {
  const hotelId = cleanString(entry.hotelId) ?? cleanString(entry.id);
  const name = cleanString(entry.name);
  if (!hotelId || !name) {
    return null;
  }

  const tagsRaw = entry.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((item) => String(item).trim()).filter((item) => item.length > 0)
    : [];

  return {
    hotelId,
    name,
    city: cleanString(entry.city) ?? '',
    countryCode: cleanString(entry.countryCode),
    address: cleanString(entry.address),
    imageUrl: cleanString(entry.mainPhoto) ?? cleanString(entry.image) ?? cleanString(entry.photo),
    score: parseNumber(entry.score) ?? parseNumber(entry.relevanceScore),
    tags,
    story: cleanString(entry.story) ?? cleanString(entry.description)
  };
}

export async function searchHotelsBySemanticQuery(
  query: string,
  language?: string,
  limit = 8
): Promise<SemanticHotelMatch[]> {
  try {
    const runtime = await resolveLiteApiRuntimeConfig();
    const url = new URL(`${runtime.baseUrl}/data/hotels/semantic-search`);
    url.searchParams.set('query', query);
    url.searchParams.set('limit', String(Math.max(1, Math.min(12, limit))));
    if (language) {
      url.searchParams.set('language', language);
    }

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'X-API-Key': runtime.apiKey
      },
      next: { revalidate: 600 }
    });

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
    return (json.data ?? []).map(mapSemanticMatch).filter((item): item is SemanticHotelMatch => item !== null);
  } catch (error) {
    logger.warn({ error, query }, 'LiteAPI semantic hotel search failed');
    return [];
  }
}

export async function searchHotelRoomsByText(
  query: string,
  options?: {
    language?: string;
    city?: string;
    countryCode?: string;
    limit?: number;
  }
): Promise<RoomSearchMatch[]> {
  try {
    const runtime = await resolveLiteApiRuntimeConfig();
    const url = new URL(`${runtime.baseUrl}/data/hotels/room-search`);
    url.searchParams.set('query', query);
    url.searchParams.set('limit', String(Math.max(1, Math.min(10, options?.limit ?? 6))));
    if (options?.language) {
      url.searchParams.set('language', options.language);
    }
    if (options?.city) {
      url.searchParams.set('city', options.city);
    }
    if (options?.countryCode) {
      url.searchParams.set('country', options.countryCode);
    }

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'X-API-Key': runtime.apiKey
      },
      next: { revalidate: 600 }
    });

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
    return (json.data ?? []).map((hotel) => {
      const hotelId = cleanString(hotel.hotelId) ?? cleanString(hotel.id) ?? '';
      const hotelName = cleanString(hotel.name) ?? 'Hotel';
      const roomCandidates = (hotel.rooms as Array<Record<string, unknown>> | undefined) ?? [];
      const rooms = roomCandidates.map((room) => ({
        name: cleanString(room.name) ?? 'Room',
        imageUrl: cleanString(room.imageUrl) ?? cleanString(room.image),
        score: parseNumber(room.score)
      }));

      return {
        hotelId,
        hotelName,
        city: cleanString(hotel.city),
        countryCode: cleanString(hotel.countryCode),
        rating: parseNumber(hotel.rating) ?? parseNumber(hotel.starRating),
        rooms
      } satisfies RoomSearchMatch;
    }).filter((item) => item.hotelId.length > 0);
  } catch (error) {
    logger.warn({ error, query }, 'LiteAPI room search failed');
    return [];
  }
}

export async function searchPropertyPreviews(
  query: string,
  language?: string,
  currency?: string,
  checkin?: string,
  checkout?: string,
  adults?: number,
  rooms?: number,
  filters?: {
    searchMode?: 'destination' | 'vibe';
    brief?: string;
    minPrice?: number;
    minStars?: number;
    minGuestRating?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }
): Promise<PropertyPreviewSearchResult> {
  const runtime = await resolveLiteApiRuntimeConfig();
  const asOf = new Date().toISOString();
  const toResult = (
    properties: PropertyPreview[],
    degradedReason: SupplierDegradedReason | null
  ): PropertyPreviewSearchResult => ({
    properties,
    degraded: degradedReason !== null,
    degradedReason,
    asOf,
    freshness: degradedReason ? 'stale' : 'fresh'
  });
  const logDegradedFallback = (reason: SupplierDegradedReason, context: Record<string, unknown> = {}) => {
    logLiteApiDebug('property_preview_degraded', {
      degradedReason: reason,
      fallbackCount: fallbackProperties.length,
      query,
      language,
      currency,
      checkin,
      checkout,
      adults,
      rooms,
      ...context
    });
  };

  if (!hasConfiguredLiteApiKey(runtime.apiKey)) {
    logDegradedFallback('unavailable', { reasonSource: 'missing_api_key' });
    return toResult(fallbackProperties, 'unavailable');
  }

  try {
    const placeResponse = await fetchJson<LiteApiResponse<Array<Record<string, unknown>>>>(
      `${runtime.baseUrl}/data/places?textQuery=${encodeURIComponent(query)}&limit=5${language ? `&language=${encodeURIComponent(language)}` : ''}`,
      {
        headers: {
          accept: 'application/json',
          'X-API-Key': runtime.apiKey
        },
        next: { revalidate: 3600 }
      }
    );
    const firstPlaceId = String(placeResponse?.data?.[0]?.placeId ?? placeResponse?.data?.[0]?.id ?? '');
    const defaults = nextStayWindow();
    const activeCheckin = checkin ?? defaults.checkin;
    const activeCheckout = checkout ?? defaults.checkout;
    const activeAdults = adults ?? 2;
    const activeRooms = rooms ?? 1;
    const occupancies = Array.from({ length: activeRooms }, () => ({ adults: activeAdults }));
    const selectedCurrency = currency ?? env.DEFAULT_CURRENCY;
    const trimmedBrief = filters?.brief?.trim();
    const searchMode = filters?.searchMode ?? 'destination';
    const aiSearchQuery = trimmedBrief ? `${query} ${trimmedBrief}` : query;
    const page = typeof filters?.page === 'number' ? Math.max(1, Math.floor(filters.page)) : 1;
    const limit = typeof filters?.limit === 'number' ? Math.max(1, Math.min(50, Math.floor(filters.limit))) : 8;
    const supplierLimit = Math.min(200, page * limit);
    const timeoutSeconds = Math.max(1, Math.round(env.LITEAPI_TIMEOUT_MS / 1000));
    const normalizedMinStars = typeof filters?.minStars === 'number' ? Math.min(5, Math.max(0, filters.minStars)) : undefined;
    const normalizedMinRating = typeof filters?.minGuestRating === 'number'
      ? Math.min(5, Math.max(0, filters.minGuestRating / 2))
      : undefined;
    const starRating = typeof normalizedMinStars === 'number'
      ? Array.from({ length: Math.max(0, Math.round((5 - normalizedMinStars) * 2) + 1) }, (_, idx) =>
        Number((normalizedMinStars + idx * 0.5).toFixed(1))
      )
      : undefined;

    const basePayload: Omit<RatesSearchPayload, 'placeId' | 'cityName' | 'aiSearch'> = {
      checkin: activeCheckin,
      checkout: activeCheckout,
      occupancies,
      guestNationality: env.DEFAULT_GUEST_NATIONALITY,
      currency: selectedCurrency,
      roomMapping: true,
      includeHotelData: true,
      maxRatesPerHotel: 1,
      limit: supplierLimit,
      timeout: timeoutSeconds,
      minRating: normalizedMinRating,
      starRating
    };

    const applyFilters = (items: PropertyPreview[]) => {
      const minPrice = typeof filters?.minPrice === 'number' ? filters.minPrice : undefined;
      const minStars = typeof filters?.minStars === 'number' ? filters.minStars : undefined;
      const minGuestRating = typeof filters?.minGuestRating === 'number' ? filters.minGuestRating : undefined;
      const maxPrice = typeof filters?.maxPrice === 'number' ? filters.maxPrice : undefined;

      return items.filter((hotel) => {
        if (typeof minPrice === 'number' && (hotel.price ?? 0) < minPrice) return false;
        if (typeof minStars === 'number' && (hotel.starRating ?? 0) < minStars) return false;
        if (typeof minGuestRating === 'number' && (hotel.reviewScore ?? 0) < minGuestRating) return false;
        if (typeof maxPrice === 'number' && (hotel.price ?? Number.MAX_SAFE_INTEGER) > maxPrice) return false;
        return true;
      });
    };

    const paginate = (items: PropertyPreview[]) => {
      const offset = (page - 1) * limit;
      return items.slice(offset, offset + limit);
    };

    let degradedReason: SupplierDegradedReason | null = null;

    if (searchMode === 'vibe') {
      const byAiSearch = await searchRates(
        {
          ...basePayload,
          aiSearch: aiSearchQuery
        },
        query,
        runtime
      );
      if (byAiSearch.degradedReason) {
        degradedReason = byAiSearch.degradedReason;
      }
      const filteredByAiSearch = applyFilters(byAiSearch.items);
      if (filteredByAiSearch.length > 0) {
        return toResult(paginate(filteredByAiSearch), degradedReason === null ? null : 'partial');
      }

      const semanticMatches = await searchHotelsBySemanticQuery(aiSearchQuery, language, 8);
      if (semanticMatches.length > 0) {
        const semanticMapped = applyFilters(
          semanticMatches.map((match) => ({
            hotelId: match.hotelId,
            name: match.name,
            city: match.city || query,
            countryCode: match.countryCode ?? undefined,
            starRating: null,
            reviewScore: match.score,
            reviewCount: null,
            imageUrl: match.imageUrl ?? undefined,
            price: null,
            currency: selectedCurrency,
            amenities: match.tags
          }))
        );
        if (semanticMapped.length > 0) {
          return toResult(paginate(semanticMapped), degradedReason === null ? null : 'partial');
        }
      }

      const fallbackReason = degradedReason ?? 'unavailable';
      logDegradedFallback(fallbackReason, { searchMode, reasonSource: 'vibe_fallback' });
      return toResult(paginate(fallbackProperties), fallbackReason);
    }

    if (trimmedBrief) {
      const byAiSearch = await searchRates(
        {
          ...basePayload,
          aiSearch: aiSearchQuery
        },
        query,
        runtime
      );
      if (byAiSearch.degradedReason) {
        degradedReason = byAiSearch.degradedReason;
      }
      const filtered = applyFilters(byAiSearch.items);
      if (filtered.length > 0) {
        return toResult(paginate(filtered), degradedReason === null ? null : 'partial');
      }
    }

    if (firstPlaceId) {
      const byPlace = await searchRates(
        {
          ...basePayload,
          placeId: firstPlaceId
        },
        query,
        runtime
      );
      if (byPlace.degradedReason) {
        degradedReason = byPlace.degradedReason;
      }
      const filtered = applyFilters(byPlace.items);
      if (filtered.length > 0) {
        return toResult(paginate(filtered), degradedReason === null ? null : 'partial');
      }
    }

    const byCity = await searchRates(
      {
        ...basePayload,
        cityName: query
      },
      query,
      runtime
    );
    if (byCity.degradedReason) {
      degradedReason = byCity.degradedReason;
    }
    const filteredByCity = applyFilters(byCity.items);
    if (filteredByCity.length > 0) {
      return toResult(paginate(filteredByCity), degradedReason === null ? null : 'partial');
    }

    const byAiSearch = await searchRates(
      {
        ...basePayload,
        aiSearch: aiSearchQuery
      },
      query,
      runtime
    );
    if (byAiSearch.degradedReason) {
      degradedReason = byAiSearch.degradedReason;
    }
    const filteredByAiSearch = applyFilters(byAiSearch.items);
    if (filteredByAiSearch.length > 0) {
      return toResult(paginate(filteredByAiSearch), degradedReason === null ? null : 'partial');
    }

    const semanticMatches = await searchHotelsBySemanticQuery(aiSearchQuery, language, 8);
    if (semanticMatches.length > 0) {
      const semanticMapped = applyFilters(
        semanticMatches.map((match) => ({
          hotelId: match.hotelId,
          name: match.name,
          city: match.city || query,
          countryCode: match.countryCode ?? undefined,
          starRating: null,
          reviewScore: match.score,
          reviewCount: null,
          imageUrl: match.imageUrl ?? undefined,
          price: null,
          currency: selectedCurrency,
          amenities: match.tags
        }))
      );
      if (semanticMapped.length > 0) {
        return toResult(paginate(semanticMapped), degradedReason === null ? null : 'partial');
      }
    }

    const placeRes = await fetch(
      `${runtime.baseUrl}/data/places?textQuery=${encodeURIComponent(query)}${language ? `&language=${encodeURIComponent(language)}` : ''}`,
      {
        headers: {
          accept: 'application/json',
          'X-API-Key': runtime.apiKey
        },
        next: { revalidate: 3600 }
      }
    );
    if (!placeRes.ok) {
      throw new Error(`LiteAPI places request failed: ${placeRes.status}`);
    }
    const fallbackPlaceResponse = (await placeRes.json()) as { data?: Array<{ id?: string }> };
    const fallbackPlaceId = fallbackPlaceResponse?.data?.[0]?.id;
    if (!fallbackPlaceId) {
      const fallbackReason = degradedReason ?? 'unavailable';
      logDegradedFallback(fallbackReason, { reasonSource: 'missing_fallback_place_id' });
      return toResult(paginate(fallbackProperties), fallbackReason);
    }

    const ratesRes = await fetch(`${runtime.baseUrl}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': runtime.apiKey
      },
      body: JSON.stringify({
        placeId: fallbackPlaceId,
        checkin: activeCheckin,
        checkout: activeCheckout,
        occupancies,
        guestNationality: env.DEFAULT_GUEST_NATIONALITY,
        currency: selectedCurrency,
        timeout: timeoutSeconds,
        minRating: normalizedMinRating,
        starRating,
        limit: supplierLimit
      }),
      next: { revalidate: 300 }
    });
    if (!ratesRes.ok) {
      throw new Error(`LiteAPI rates request failed: ${ratesRes.status}`);
    }
    const ratesResponse = (await ratesRes.json()) as LiteApiResponse<Array<Record<string, unknown>>>;
    const mapped = applyFilters(mapRatesResponse(ratesResponse, query));

    if (mapped.length > 0) {
      return toResult(paginate(mapped), degradedReason === null ? null : 'partial');
    }

    const fallbackReason = degradedReason ?? 'unavailable';
    logDegradedFallback(fallbackReason, { reasonSource: 'empty_fallback_rates_result' });
    return toResult(paginate(fallbackProperties), fallbackReason);
  } catch (error) {
    logger.warn({ error }, 'LiteAPI property preview search failed');
    const fallbackReason = isTimeoutLikeError(error) ? 'timeout' : 'unavailable';
    logDegradedFallback(fallbackReason, {
      reasonSource: 'search_exception',
      error: safeSnippet(error instanceof Error ? error.message : error)
    });
    return toResult(fallbackProperties, fallbackReason);
  }
}

export async function prebookRate(offerId: string): Promise<LiteApiPrebookResponse> {
  const runtime = await resolveLiteApiRuntimeConfig();
  const response = await fetch(`${runtime.bookBaseUrl}/rates/prebook`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-Key': runtime.apiKey
    },
    body: JSON.stringify({
      offerId,
      usePaymentSdk: true
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, bodySample: body.slice(0, 180) }, 'LiteAPI prebook failed');
    throw new HttpError(
      response.status >= 400 && response.status < 500 ? 400 : 502,
      'Unable to prebook this rate right now. Please choose another rate.'
    );
  }

  const data = (await response.json()) as { data?: LiteApiPrebookResponse };
  if (!data.data?.prebookId || !data.data?.transactionId || !data.data?.secretKey) {
    throw new Error('Invalid prebook response');
  }

  return data.data;
}

type BookPayload = {
  prebookId: string;
  transactionId: string;
  clientReference: string;
  holder: {
    firstName: string;
    lastName: string;
    email: string;
  };
  guests: Array<{
    occupancyNumber: number;
    firstName: string;
    lastName: string;
  }>;
};

export async function bookRate(payload: BookPayload) {
  const runtime = await resolveLiteApiRuntimeConfig();
  const response = await fetch(`${runtime.bookBaseUrl}/rates/book`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-Key': runtime.apiKey
    },
    body: JSON.stringify({
      prebookId: payload.prebookId,
      clientReference: payload.clientReference,
      holder: payload.holder,
      payment: {
        method: 'TRANSACTION_ID',
        transactionId: payload.transactionId
      },
      guests: payload.guests
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, bodySample: body.slice(0, 180) }, 'LiteAPI book failed');
    throw new HttpError(
      response.status >= 400 && response.status < 500 ? 400 : 502,
      'Payment is not confirmed or booking session is invalid. Please retry checkout.'
    );
  }

  return response.json();
}

export async function listBookings(params: { clientReference: string; timeoutSeconds?: number }) {
  const runtime = await resolveLiteApiRuntimeConfig();
  const url = new URL(`${runtime.bookBaseUrl}/bookings`);
  url.searchParams.set('clientReference', params.clientReference);
  if (typeof params.timeoutSeconds === 'number' && Number.isFinite(params.timeoutSeconds)) {
    url.searchParams.set('timeout', String(params.timeoutSeconds));
  }

  const response = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'X-API-Key': runtime.apiKey
    },
    cache: 'no-store'
  });

  if (response.status === 204) {
    return { data: [] };
  }

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, bodySample: body.slice(0, 180) }, 'LiteAPI list bookings failed');
    throw new HttpError(
      response.status >= 400 && response.status < 500 ? 400 : 502,
      'Unable to fetch bookings right now.'
    );
  }

  return response.json();
}

export async function getBooking(params: { bookingId: string; timeoutSeconds?: number }) {
  const runtime = await resolveLiteApiRuntimeConfig();
  const url = new URL(`${runtime.bookBaseUrl}/bookings/${encodeURIComponent(params.bookingId)}`);
  if (typeof params.timeoutSeconds === 'number' && Number.isFinite(params.timeoutSeconds)) {
    url.searchParams.set('timeout', String(params.timeoutSeconds));
  }

  const response = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'X-API-Key': runtime.apiKey
    },
    cache: 'no-store'
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, bodySample: body.slice(0, 180) }, 'LiteAPI retrieve booking failed');
    throw new HttpError(
      response.status >= 400 && response.status < 500 ? 400 : 502,
      'Unable to fetch this booking right now.'
    );
  }

  return response.json();
}

export async function cancelBooking(params: { bookingId: string; timeoutSeconds?: number }) {
  const runtime = await resolveLiteApiRuntimeConfig();
  const url = new URL(`${runtime.bookBaseUrl}/bookings/${encodeURIComponent(params.bookingId)}`);
  if (typeof params.timeoutSeconds === 'number' && Number.isFinite(params.timeoutSeconds)) {
    url.searchParams.set('timeout', String(params.timeoutSeconds));
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'X-API-Key': runtime.apiKey
    },
    cache: 'no-store'
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    logger.error({ status: response.status, bodySample: body.slice(0, 180) }, 'LiteAPI cancel booking failed');
    throw new HttpError(
      response.status >= 400 && response.status < 500 ? 400 : 502,
      'Unable to cancel this booking right now.'
    );
  }

  return response.json();
}

export async function getHotelDetails(hotelId: string, language?: string, currency?: string): Promise<HotelDetails | null> {
  const fallbackHotel = buildFallbackHotelDetails(hotelId);
  if (fallbackHotel) {
    return fallbackHotel;
  }

  try {
    const runtime = await resolveLiteApiRuntimeConfig();
    const response = await fetch(`${runtime.baseUrl}/data/hotel?hotelId=${encodeURIComponent(hotelId)}${language ? `&language=${encodeURIComponent(language)}` : ''}`, {
      headers: {
        accept: 'application/json',
        'X-API-Key': runtime.apiKey
      },
      cache: 'no-store'
    });
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as { data?: Record<string, unknown> };
    const data = json.data ?? {};
    const city = String(data.city ?? '');
    const countryCode = cleanString(data.countryCode);
    const basePhotos = pickImageUrls(data);
    const enrichedPhotos = basePhotos.length >= 8
      ? []
      : await fetchPhotoEnrichmentFromRates(hotelId, runtime, currency);
    const photos = Array.from(new Set([...basePhotos, ...enrichedPhotos])).slice(0, 40);
    const mainPhoto = cleanString(data.main_photo) ?? photos[0] ?? null;
    const { latitude, longitude } = pickCoordinates(data);
    const reviewBreakdown = pickReviewBreakdown(data);
    const reviews = (await getGuestReviews(hotelId, 50, runtime)) ?? [];
    const reviewScore = pickReviewScore(data);
    const reviewCount = pickReviewCount(data);

    // If we have no reviews from /data/hotel or /data/reviews, try enrichment as a last resort
    // but prefer the dedicated reviews endpoint data if available
    const enrichment = shouldEnrichReviews(reviewScore, reviewCount, reviewBreakdown, reviews)
      ? await fetchReviewEnrichmentFromRates(hotelId, runtime, currency)
      : null;

    const resolvedReviews = reviews.length > 0 ? reviews : (enrichment?.reviews ?? []);
    const policies = pickPolicies(data);
    const locationContext = pickLocationContext(data, city, countryCode);
    const prosAndCons = pickProsAndCons(resolvedReviews);
    const facilities = pickFacilities(data);
    const facilityCategories = pickFacilityCategories(data, facilities);
    const areaInfo = pickAreaInfo(data, locationContext);
    const nearbyRestaurants = pickNearbyRestaurants(data);
    const houseRulesDetailed = pickHouseRulesDetailed(data, policies);
    const smartHighlights = composeSmartHighlights({
      city,
      reviewScore: reviewScore ?? enrichment?.reviewScore ?? null,
      reviewCount: reviewCount ?? enrichment?.reviewCount ?? null,
      locationContext,
      facilities,
      policies
    });
    const reviewHighlights = buildReviewHighlights(resolvedReviews);
    const description =
      cleanString(data.description) ??
      cleanString(data.overview);
    const descriptionNarrative = composeDescriptionNarrative({
      description,
      city,
      locationContext,
      facilities,
      policies,
      reviewScore: reviewScore ?? enrichment?.reviewScore ?? null
    });
    const completeness = buildCompleteness({
      photos,
      facilities,
      policies,
      locationContext,
      reviews: resolvedReviews,
      prosAndCons
    });

    return {
      id: String(data.id ?? hotelId),
      name: String(data.name ?? 'Hotel'),
      city,
      countryCode,
      address: cleanString(data.address),
      mainPhoto,
      photos,
      facilities,
      description,
      latitude,
      longitude,
      starRating: parseNumber(data.starRating),
      reviewScore: reviewScore ?? enrichment?.reviewScore ?? null,
      reviewCount: reviewCount ?? enrichment?.reviewCount ?? null,
      reviewBreakdown: reviewBreakdown.length > 0 ? reviewBreakdown : (enrichment?.reviewBreakdown ?? []),
      reviews: resolvedReviews,
      policies,
      locationContext,
      prosAndCons,
      facilityCategories,
      areaInfo,
      nearbyRestaurants,
      houseRulesDetailed,
      smartHighlights,
      reviewHighlights,
      descriptionNarrative,
      completeness
    };
  } catch (error) {
    logger.warn({ error, hotelId }, 'LiteAPI hotel details failed');
    return null;
  }
}

export async function getGuestReviews(
  hotelId: string,
  limit: number = 50,
  runtime?: Awaited<ReturnType<typeof resolveLiteApiRuntimeConfig>>
): Promise<HotelDetails['reviews'] | null> {
  try {
    const activeRuntime = runtime ?? await resolveLiteApiRuntimeConfig();
    const hardCap = 300;
    const chunkSize = Math.max(10, Math.min(50, limit));
    const collected: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    for (let offset = 0; offset < hardCap; offset += chunkSize) {
      const response = await fetch(
        `${activeRuntime.baseUrl}/data/reviews?hotelId=${encodeURIComponent(hotelId)}&limit=${chunkSize}&offset=${offset}`,
        {
          headers: {
            accept: 'application/json',
            'X-API-Key': activeRuntime.apiKey
          },
          next: { revalidate: 3600 }
        }
      );

      if (!response.ok) {
        if (offset === 0) {
          return null;
        }
        break;
      }

      const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
      const pageItems = json.data ?? [];
      if (pageItems.length === 0) {
        break;
      }

      let added = 0;
      for (const item of pageItems) {
        const key = `${String(item.name ?? '')}|${String(item.date ?? '')}|${String(item.pros ?? '')}|${String(item.cons ?? '')}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        collected.push(item);
        added += 1;
      }

      if (pageItems.length < chunkSize || added === 0 || collected.length >= hardCap) {
        break;
      }
    }

    return collected.map((item) => {
      const pros = String(item.pros ?? '').trim();
      const cons = String(item.cons ?? '').trim();
      const headline = String(item.headline ?? '').trim();

      const parts = [
        pros ? `Pros: ${pros}` : null,
        cons ? `Cons: ${cons}` : null
      ].filter(Boolean);

      const comment = parts.length > 0
        ? parts.join('\n\n')
        : headline;

      return {
        author: cleanString(item.name) ?? 'Guest',
        travelerType: cleanString(item.type) ?? 'Traveler',
        comment,
        score: parseNumber(item.averageScore),
        createdAt: cleanString(item.date),
        pros: pros || null,
        cons: cons || null
      };
    }).filter(r => r.comment.length > 0);
  } catch (error) {
    logger.warn({ error, hotelId }, 'LiteAPI guest reviews failed');
    return null;
  }
}

export async function getHotelRates(params: {
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms?: number;
  currency?: string;
  guestNationality?: string;
  margin?: number;
  additionalMarkup?: number;
}): Promise<HotelRateOption[]> {
  const fallbackRates = buildFallbackHotelRates(params);
  if (fallbackRates.length > 0) {
    return fallbackRates;
  }

  try {
    const runtime = await resolveLiteApiRuntimeConfig();
    const numRooms = params.rooms ?? 1;
    const occupancies = Array.from({ length: numRooms }, () => ({ adults: params.adults }));

    const ratePayload: Record<string, unknown> = {
      hotelIds: [params.hotelId],
      checkin: params.checkin,
      checkout: params.checkout,
      occupancies,
      guestNationality: params.guestNationality ?? env.DEFAULT_GUEST_NATIONALITY,
      currency: params.currency ?? env.DEFAULT_CURRENCY,
      includeHotelData: true,
      roomMapping: true
    };

    if (typeof params.margin === 'number' && Number.isFinite(params.margin)) {
      ratePayload.margin = params.margin;
    }
    if (typeof params.additionalMarkup === 'number' && Number.isFinite(params.additionalMarkup)) {
      ratePayload.additionalMarkup = params.additionalMarkup;
    }

    const response = await fetch(`${runtime.baseUrl}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': runtime.apiKey
      },
      body: JSON.stringify(ratePayload),
      cache: 'no-store'
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, 'LiteAPI hotel rates failed');
      return [];
    }

    const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const firstHotel = json.data?.[0];
    const roomTypes = (firstHotel?.roomTypes as Array<Record<string, unknown>> | undefined) ?? [];

    const mapped = roomTypes.flatMap((roomType) => {
      const offerId = String(roomType.offerId ?? '');
      const rates = (roomType.rates as Array<Record<string, unknown>> | undefined) ?? [];
      return rates.map((rate, idx) => {
        const total = (rate.retailRate as Record<string, unknown> | undefined)?.total as Array<Record<string, unknown>> | undefined;
        const firstTotal = total?.[0] ?? {};
        const policies = rate.cancellationPolicies as Record<string, unknown> | undefined;
        const infos = policies?.cancelPolicyInfos as Array<Record<string, unknown>> | undefined;

        return {
          offerId: offerId || `offer-${idx}`,
          roomId: String(rate.mappedRoomId ?? rate.roomId ?? `room-${idx}`),
          roomName: String(rate.name ?? 'Room'),
          imageUrl:
            cleanString(rate.imageUrl) ??
            cleanString(rate.image) ??
            cleanString((rate.room as Record<string, unknown> | undefined)?.imageUrl) ??
            cleanString((rate.room as Record<string, unknown> | undefined)?.image) ??
            cleanString((roomType as Record<string, unknown>).imageUrl) ??
            cleanString((roomType as Record<string, unknown>).image),
          boardName: String(rate.boardName ?? 'N/A'),
          refundableTag: String(policies?.refundableTag ?? 'N/A'),
          cancelTime: typeof infos?.[0]?.cancelTime === 'string' ? String(infos[0].cancelTime) : null,
          amount: Number(firstTotal.amount ?? 0),
          currency: String(firstTotal.currency ?? params.currency ?? env.DEFAULT_CURRENCY)
        } satisfies HotelRateOption;
      });
    });

    return mapped.filter((rate) => rate.offerId && Number.isFinite(rate.amount) && rate.amount > 0);
  } catch (error) {
    logger.warn({ error, hotelId: params.hotelId }, 'LiteAPI hotel rates failed');
    return [];
  }
}
