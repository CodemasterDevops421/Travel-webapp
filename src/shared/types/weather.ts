export type WeatherSnapshot = {
  temperatureC: number;
  windKph?: number | null;
  condition: string;
  code?: number | null;
  observedAt?: string | null;
  locationName?: string;
  isDay?: boolean | null;
};
