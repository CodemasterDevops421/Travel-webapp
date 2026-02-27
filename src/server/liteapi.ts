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
  completeness: HotelDetailCompleteness;
};

export type HotelRateOption = {
  offerId: string;
  roomId: string;
  roomName: string;
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
};

function isTimeoutLikeError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || /timeout|aborted/i.test(error.message));
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
        degradedReason: 'unavailable'
      };
    }
    return {
      data: JSON.parse(text) as T,
      degradedReason: null
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
      degradedReason: isTimeoutLikeError(error) ? 'timeout' : 'unavailable'
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
      if (picked.size >= 6) break;
    }
    if (picked.size >= 6) break;
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
      return names.slice(0, 20);
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
      .slice(0, 8),
    payment: pickStringList(policyRoot, ['payment', 'paymentTerms']).slice(0, 8),
    pets: pickStringList(policyRoot, ['pets', 'petPolicy']).slice(0, 8),
    children: pickStringList(policyRoot, ['children', 'childPolicy', 'childrenPolicy']).slice(0, 8),
    extra: pickStringList(policyRoot, ['other', 'extra', 'importantNotes']).slice(0, 8)
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
    transit: pickStringList(locationRoot, ['transit', 'transport', 'publicTransport']).slice(0, 8),
    nearbyLandmarks: pickStringList(locationRoot, ['nearby', 'landmarks', 'pointsOfInterest']).slice(0, 8)
  };
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

  if (!response.data) {
    return {
      items: [],
      degradedReason: response.degradedReason
    };
  }

  const mapped = mapRatesResponse(response.data, fallbackCity);
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

function hasConfiguredLiteApiKey(apiKey: string): boolean {
  return Boolean(apiKey && apiKey !== 'liteapi-placeholder-key');
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
    brief?: string;
    minStars?: number;
    minGuestRating?: number;
    maxPrice?: number;
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

  if (!hasConfiguredLiteApiKey(runtime.apiKey)) {
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
    const aiSearchQuery = trimmedBrief ? `${query} ${trimmedBrief}` : query;
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
      limit: 12,
      timeout: timeoutSeconds,
      minRating: normalizedMinRating,
      starRating
    };

    const applyFilters = (items: PropertyPreview[]) => {
      const minStars = typeof filters?.minStars === 'number' ? filters.minStars : undefined;
      const minGuestRating = typeof filters?.minGuestRating === 'number' ? filters.minGuestRating : undefined;
      const maxPrice = typeof filters?.maxPrice === 'number' ? filters.maxPrice : undefined;

      return items.filter((hotel) => {
        if (typeof minStars === 'number' && (hotel.starRating ?? 0) < minStars) return false;
        if (typeof minGuestRating === 'number' && (hotel.reviewScore ?? 0) < minGuestRating) return false;
        if (typeof maxPrice === 'number' && (hotel.price ?? Number.MAX_SAFE_INTEGER) > maxPrice) return false;
        return true;
      });
    };

    let degradedReason: SupplierDegradedReason | null = null;

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
        return toResult(filtered.slice(0, 8), degradedReason === null ? null : 'partial');
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
        return toResult(filtered.slice(0, 8), degradedReason === null ? null : 'partial');
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
      return toResult(filteredByCity.slice(0, 8), degradedReason === null ? null : 'partial');
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
      return toResult(filteredByAiSearch.slice(0, 8), degradedReason === null ? null : 'partial');
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
      return toResult(fallbackProperties, degradedReason ?? 'unavailable');
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
        limit: 8
      }),
      next: { revalidate: 300 }
    });
    if (!ratesRes.ok) {
      throw new Error(`LiteAPI rates request failed: ${ratesRes.status}`);
    }
    const ratesResponse = (await ratesRes.json()) as LiteApiResponse<Array<Record<string, unknown>>>;
    const mapped = applyFilters(mapRatesResponse(ratesResponse, query)).slice(0, 8);

    if (mapped.length > 0) {
      return toResult(mapped, degradedReason === null ? null : 'partial');
    }

    return toResult(fallbackProperties, degradedReason ?? 'unavailable');
  } catch (error) {
    logger.warn({ error }, 'LiteAPI property preview search failed');
    return toResult(fallbackProperties, isTimeoutLikeError(error) ? 'timeout' : 'unavailable');
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
    const photos = pickImageUrls(data);
    const mainPhoto = cleanString(data.main_photo) ?? photos[0] ?? null;
    const { latitude, longitude } = pickCoordinates(data);
    const reviewBreakdown = pickReviewBreakdown(data);
    const reviews = (await getGuestReviews(hotelId, 10, runtime)) ?? [];
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
    const completeness = buildCompleteness({
      photos,
      facilities: pickFacilities(data),
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
      facilities: pickFacilities(data),
      description:
        cleanString(data.description) ??
        cleanString(data.overview),
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
      completeness
    };
  } catch (error) {
    logger.warn({ error, hotelId }, 'LiteAPI hotel details failed');
    return null;
  }
}

export async function getGuestReviews(
  hotelId: string,
  limit: number = 10,
  runtime?: Awaited<ReturnType<typeof resolveLiteApiRuntimeConfig>>
): Promise<HotelDetails['reviews'] | null> {
  try {
    const activeRuntime = runtime ?? await resolveLiteApiRuntimeConfig();
    const response = await fetch(`${activeRuntime.baseUrl}/data/reviews?hotelId=${encodeURIComponent(hotelId)}&limit=${limit}`, {
      headers: {
        accept: 'application/json',
        'X-API-Key': activeRuntime.apiKey
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      // If 404 or other error, return null so caller can fallback
      return null;
    }

    const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
    return (json.data ?? []).map((item) => {
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
}): Promise<HotelRateOption[]> {
  try {
    const runtime = await resolveLiteApiRuntimeConfig();
    const numRooms = params.rooms ?? 1;
    const occupancies = Array.from({ length: numRooms }, () => ({ adults: params.adults }));

    const response = await fetch(`${runtime.baseUrl}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': runtime.apiKey
      },
      body: JSON.stringify({
        hotelIds: [params.hotelId],
        checkin: params.checkin,
        checkout: params.checkout,
        occupancies,
        guestNationality: params.guestNationality ?? env.DEFAULT_GUEST_NATIONALITY,
        currency: params.currency ?? env.DEFAULT_CURRENCY,
        includeHotelData: true,
        roomMapping: true
      }),
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
