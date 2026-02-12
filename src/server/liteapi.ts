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
