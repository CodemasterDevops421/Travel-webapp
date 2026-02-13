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
  starRating?: number | null;
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
        guestNationality: env.DEFAULT_GUEST_NATIONALITY,
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
    logger.error({ status: response.status }, 'LiteAPI prebook failed');
    throw new Error('LiteAPI prebook failed');
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
    logger.error({ status: response.status }, 'LiteAPI book failed');
    throw new Error('LiteAPI book failed');
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
    return {
      id: String(data.id ?? hotelId),
      name: String(data.name ?? 'Hotel'),
      city: String(data.city ?? ''),
      countryCode: typeof data.countryCode === 'string' ? data.countryCode : undefined,
      address: typeof data.address === 'string' ? data.address : undefined,
      mainPhoto: typeof data.main_photo === 'string' ? data.main_photo : undefined,
      starRating: typeof data.starRating === 'number' ? data.starRating : null
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
