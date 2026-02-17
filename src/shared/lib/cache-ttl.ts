export const CACHE_TTL_SECONDS = {
  autocomplete: 90,
  propertyPreview: 300,
  hotelDetails: 1800,
  hotelRates: 300
} as const;

export const CACHE_STALE_TIME_MS = {
  autocomplete: CACHE_TTL_SECONDS.autocomplete * 1_000,
  propertyPreview: CACHE_TTL_SECONDS.propertyPreview * 1_000,
  hotelDetails: CACHE_TTL_SECONDS.hotelDetails * 1_000,
  hotelRates: CACHE_TTL_SECONDS.hotelRates * 1_000
} as const;
