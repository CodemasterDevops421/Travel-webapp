import 'server-only';
import LiteAPI from 'liteapi-node-sdk';
import { env } from '@/server/env';
import { logger } from '@/server/logger';

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

export type PropertyPreview = {
  hotelId: string;
  name: string;
  city: string;
  countryCode?: string;
  starRating: number | null;
  price: number | null;
  currency: string;
};

export async function autocomplete(query: string): Promise<AutocompleteEntity[]> {
  try {
    const response = await liteApiClient.data.cities({ query });
    return (response?.data ?? []).slice(0, 8).map((item: Record<string, string>) => ({
      id: item.id,
      name: item.name,
      type: 'city' as const,
      countryCode: item.countryCode
    }));
  } catch (error) {
    logger.warn({ error }, 'LiteAPI autocomplete failed');
    return [];
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

export async function searchPropertyPreviews(query: string): Promise<PropertyPreview[]> {
  if (!hasConfiguredLiteApiKey()) {
    return fallbackProperties;
  }

  try {
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
    const placeResponse = (await placeRes.json()) as { data?: Array<{ id?: string }> };
    const firstPlaceId = placeResponse?.data?.[0]?.id;
    if (!firstPlaceId) {
      return fallbackProperties;
    }

    const checkin = new Date();
    checkin.setDate(checkin.getDate() + 14);
    const checkout = new Date(checkin);
    checkout.setDate(checkin.getDate() + 2);

    const ratesRes = await fetch(`${env.LITEAPI_BASE_URL}/hotels/rates`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-API-Key': env.LITEAPI_API_KEY
      },
      body: JSON.stringify({
        placeId: firstPlaceId,
        checkin: checkin.toISOString().slice(0, 10),
        checkout: checkout.toISOString().slice(0, 10),
        occupancies: [{ adults: 2 }],
        currency: env.DEFAULT_CURRENCY,
        limit: 8
      }),
      cache: 'no-store'
    });
    if (!ratesRes.ok) {
      throw new Error(`LiteAPI rates request failed: ${ratesRes.status}`);
    }
    const ratesResponse = (await ratesRes.json()) as { data?: Array<Record<string, unknown>> };

    const mapped = (ratesResponse?.data ?? []).slice(0, 6).map((entry: Record<string, unknown>) => {
      const hotel = (entry.hotel || entry.hotelData || {}) as Record<string, string | number>;
      const roomTypes = (entry.roomTypes || []) as Array<Record<string, unknown>>;
      const firstRoom = roomTypes[0] || {};
      const firstRate = ((firstRoom.rates as Array<Record<string, unknown>>) || [])[0] || {};

      return {
        hotelId: String(entry.hotelId || hotel.id || `hotel-${Math.random().toString(16).slice(2, 8)}`),
        name: String(hotel.name || 'Hotel'),
        city: String(hotel.city || query),
        countryCode: typeof hotel.countryCode === 'string' ? hotel.countryCode : undefined,
        starRating: typeof hotel.starRating === 'number' ? hotel.starRating : null,
        price: typeof firstRate.retailRate === 'number' ? firstRate.retailRate : null,
        currency: typeof firstRate.retailRateCurrency === 'string' ? firstRate.retailRateCurrency : env.DEFAULT_CURRENCY
      } satisfies PropertyPreview;
    });

    return mapped.length > 0 ? mapped : fallbackProperties;
  } catch (error) {
    logger.warn({ error }, 'LiteAPI property preview search failed');
    return fallbackProperties;
  }
}
