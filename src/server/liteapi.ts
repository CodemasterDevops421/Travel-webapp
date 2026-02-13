import 'server-only';
import LiteAPI from 'liteapi-node-sdk';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { HttpError } from '@/server/errors';

const liteApiClient = new LiteAPI({
  apiKey: env.LITEAPI_API_KEY,
  baseURL: env.LITEAPI_BASE_URL,
  timeout: env.LITEAPI_TIMEOUT_MS
} as never);

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
  starRating: number | null;
  reviewScore?: number | null;
  reviewCount?: number | null;
  imageUrl?: string;
  price: number | null;
  currency: string;
};

export type LiteApiPrebookResponse = {
  prebookId: string;
  transactionId: string;
  secretKey: string;
  price: number;
  currency: string;
};

export type HotelDetails = {
  id: string;
  name: string;
  city: string;
  countryCode?: string;
  address?: string;
  mainPhoto?: string;
  photos?: string[];
  facilities?: string[];
  description?: string;
  starRating?: number | null;
  reviewScore?: number | null;
  reviewCount?: number | null;
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    if (!response.ok) {
      logger.warn(
        {
          url,
          status: response.status,
          bodySample: text.slice(0, 180)
        },
        'LiteAPI request failed'
      );
      return null;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    logger.warn({ error, url }, 'LiteAPI request errored');
    return null;
  }
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

    return {
      hotelId: hotelId || String(hotel.id ?? `hotel-${Math.random().toString(16).slice(2, 8)}`),
      name: String(hotel.name ?? 'Hotel'),
      city: String(hotel.city ?? fallbackCity),
      countryCode: typeof hotel.countryCode === 'string' ? hotel.countryCode : undefined,
      starRating: Number.isFinite(parsedStar) ? parsedStar : null,
      reviewScore,
      reviewCount,
      imageUrl: pickImageUrl(hotel),
      price: amountInfo.amount,
      currency: amountInfo.currency ?? env.DEFAULT_CURRENCY
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

async function searchRates(payload: RatesSearchPayload, fallbackCity: string): Promise<PropertyPreview[]> {
  const response = await fetchJson<LiteApiResponse<Array<Record<string, unknown>>>>(`${env.LITEAPI_BASE_URL}/hotels/rates`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-Key': env.LITEAPI_API_KEY
    },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });

  if (!response) {
    return [];
  }
  return mapRatesResponse(response, fallbackCity);
}

export async function autocomplete(query: string): Promise<AutocompleteEntity[]> {
  if (!hasConfiguredLiteApiKey()) {
    return fallbackProperties.map((item) => ({
      id: item.hotelId,
      name: item.city,
      type: 'city' as const,
      countryCode: item.countryCode
    }));
  }

  try {
    const placesResponse = await fetchJson<LiteApiResponse<Array<Record<string, unknown>>>>(
      `${env.LITEAPI_BASE_URL}/data/places?textQuery=${encodeURIComponent(query)}&limit=8`,
      {
        headers: {
          accept: 'application/json',
          'X-API-Key': env.LITEAPI_API_KEY
        },
        cache: 'no-store'
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
    currency: 'USD'
  },
  {
    hotelId: 'fallback-bali-1',
    name: 'Ubud Forest Villa',
    city: 'Bali',
    countryCode: 'ID',
    starRating: 4,
    price: 138,
    currency: 'USD'
  },
  {
    hotelId: 'fallback-zurich-1',
    name: 'Lakeview Zürich Suites',
    city: 'Zurich',
    countryCode: 'CH',
    starRating: 4,
    price: 201,
    currency: 'USD'
  }
];

function hasConfiguredLiteApiKey(): boolean {
  return Boolean(env.LITEAPI_API_KEY && env.LITEAPI_API_KEY !== 'liteapi-placeholder-key');
}

export async function searchPropertyPreviews(query: string, currency?: string): Promise<PropertyPreview[]> {
  if (!hasConfiguredLiteApiKey()) {
    return fallbackProperties;
  }

  try {
    const placeResponse = await fetchJson<LiteApiResponse<Array<Record<string, unknown>>>>(
      `${env.LITEAPI_BASE_URL}/data/places?textQuery=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          accept: 'application/json',
          'X-API-Key': env.LITEAPI_API_KEY
        },
        cache: 'no-store'
      }
    );
    const firstPlaceId = String(placeResponse?.data?.[0]?.placeId ?? placeResponse?.data?.[0]?.id ?? '');
    const { checkin, checkout } = nextStayWindow();
    const selectedCurrency = currency ?? env.DEFAULT_CURRENCY;
    const basePayload: Omit<RatesSearchPayload, 'placeId' | 'cityName' | 'aiSearch'> = {
      checkin,
      checkout,
      occupancies: [{ adults: 2 }],
      guestNationality: env.DEFAULT_GUEST_NATIONALITY,
      currency: selectedCurrency,
      roomMapping: true,
      includeHotelData: true,
      maxRatesPerHotel: 1,
      limit: 12
    };

    if (firstPlaceId) {
      const byPlace = await searchRates({
        ...basePayload,
        placeId: firstPlaceId
      }, query);
      if (byPlace.length > 0) {
        return byPlace.slice(0, 8);
      }
    }

    const byCity = await searchRates({
      ...basePayload,
      cityName: query
    }, query);
    if (byCity.length > 0) {
      return byCity.slice(0, 8);
    }

    const byAiSearch = await searchRates({
      ...basePayload,
      aiSearch: query
    }, query);
    if (byAiSearch.length > 0) {
      return byAiSearch.slice(0, 8);
    }

    const placeRes = await fetch(`${env.LITEAPI_BASE_URL}/data/places?textQuery=${encodeURIComponent(query)}`, {
      headers: {
        accept: 'application/json',
        'X-API-Key': env.LITEAPI_API_KEY
      },
      cache: 'no-store'
    });
    if (!placeRes.ok) {
      throw new Error(`LiteAPI places request failed: ${placeRes.status}`);
    }
    const fallbackPlaceResponse = (await placeRes.json()) as { data?: Array<{ id?: string }> };
    const fallbackPlaceId = fallbackPlaceResponse?.data?.[0]?.id;
    if (!fallbackPlaceId) {
      return fallbackProperties;
    }

    const ratesRes = await fetch(`${env.LITEAPI_BASE_URL}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': env.LITEAPI_API_KEY
      },
      body: JSON.stringify({
        placeId: fallbackPlaceId,
        checkin,
        checkout,
        occupancies: [{ adults: 2 }],
        guestNationality: env.DEFAULT_GUEST_NATIONALITY,
        currency: selectedCurrency,
        limit: 8
      }),
      cache: 'no-store'
    });
    if (!ratesRes.ok) {
      throw new Error(`LiteAPI rates request failed: ${ratesRes.status}`);
    }
    const ratesResponse = (await ratesRes.json()) as LiteApiResponse<Array<Record<string, unknown>>>;
    const mapped = mapRatesResponse(ratesResponse, query).slice(0, 8);

    return mapped.length > 0 ? mapped : fallbackProperties;
  } catch (error) {
    logger.warn({ error }, 'LiteAPI property preview search failed');
    return fallbackProperties;
  }
}

export async function prebookRate(offerId: string): Promise<LiteApiPrebookResponse> {
  const response = await fetch(`${env.LITEAPI_BOOK_BASE_URL}/rates/prebook`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-Key': env.LITEAPI_API_KEY
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
  const response = await fetch(`${env.LITEAPI_BOOK_BASE_URL}/rates/book`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-API-Key': env.LITEAPI_API_KEY
    },
    body: JSON.stringify({
      prebookId: payload.prebookId,
      clientReference: payload.clientReference,
      holder: payload.holder,
      payment: {
        method: 'TRANSACTION',
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

export async function getHotelDetails(hotelId: string): Promise<HotelDetails | null> {
  try {
    const response = await fetch(`${env.LITEAPI_BASE_URL}/data/hotel?hotelId=${encodeURIComponent(hotelId)}`, {
      headers: {
        accept: 'application/json',
        'X-API-Key': env.LITEAPI_API_KEY
      },
      cache: 'no-store'
    });
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as { data?: Record<string, unknown> };
    const data = json.data ?? {};
    const photos = pickImageUrls(data);
    const mainPhoto = typeof data.main_photo === 'string' ? data.main_photo : photos[0];
    return {
      id: String(data.id ?? hotelId),
      name: String(data.name ?? 'Hotel'),
      city: String(data.city ?? ''),
      countryCode: typeof data.countryCode === 'string' ? data.countryCode : undefined,
      address: typeof data.address === 'string' ? data.address : undefined,
      mainPhoto,
      photos,
      facilities: pickFacilities(data),
      description:
        typeof data.description === 'string'
          ? data.description
          : typeof data.overview === 'string'
            ? data.overview
            : undefined,
      starRating: parseNumber(data.starRating),
      reviewScore:
        parseNumber(data.reviewScore) ??
        parseNumber(data.review_rating) ??
        parseNumber(data.guestRating) ??
        parseNumber(data.rating),
      reviewCount:
        parseNumber(data.reviewCount) ??
        parseNumber(data.reviewsCount) ??
        parseNumber(data.numReviews) ??
        parseNumber(data.totalReviews)
    };
  } catch (error) {
    logger.warn({ error, hotelId }, 'LiteAPI hotel details failed');
    return null;
  }
}

export async function getHotelRates(params: {
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  currency?: string;
}): Promise<HotelRateOption[]> {
  try {
    const response = await fetch(`${env.LITEAPI_BASE_URL}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': env.LITEAPI_API_KEY
      },
      body: JSON.stringify({
        hotelIds: [params.hotelId],
        checkin: params.checkin,
        checkout: params.checkout,
        occupancies: [{ adults: params.adults }],
        guestNationality: env.DEFAULT_GUEST_NATIONALITY,
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
