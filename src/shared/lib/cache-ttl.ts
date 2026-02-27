export const DISCOVERY_SUPPLIER_TTL_SECONDS = {
  min: 300,
  standard: 600,
  max: 900
} as const;

export const CACHE_TTL_SECONDS = {
  autocomplete: 90,
  propertyPreview: DISCOVERY_SUPPLIER_TTL_SECONDS.standard,
  hotelDetails: 1800,
  hotelRates: DISCOVERY_SUPPLIER_TTL_SECONDS.standard
} as const;

export const CACHE_STALE_TIME_MS = {
  autocomplete: CACHE_TTL_SECONDS.autocomplete * 1_000,
  propertyPreview: CACHE_TTL_SECONDS.propertyPreview * 1_000,
  hotelDetails: CACHE_TTL_SECONDS.hotelDetails * 1_000,
  hotelRates: CACHE_TTL_SECONDS.hotelRates * 1_000
} as const;
