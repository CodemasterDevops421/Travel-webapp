import { beforeAll, describe, expect, it } from 'vitest';
import { applyMarkup } from '@/shared/lib/utils';

let buildPriceQuote: typeof import('@/server/pricing').buildPriceQuote;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  process.env.LITEAPI_API_KEY = 'test';
  process.env.QUOTE_SIGNING_SECRET = '1234567890abcdef';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  buildPriceQuote = (await import('@/server/pricing')).buildPriceQuote;
});

describe('pricing utilities', () => {
  it('applies markup exactly once with rounding', () => {
    expect(applyMarkup(1000, 12)).toBe(1120);
  });

  it('creates stable quote signature', () => {
    const payload = { hotelId: 'h1', roomId: 'r1', amount: 1000, currency: 'USD' };
    expect(buildPriceQuote(payload).signature).toBe(buildPriceQuote(payload).signature);
  });

  it('detects tampered quote signature', async () => {
    const { verifyPriceQuoteSignature } = await import('@/server/pricing');
    const payload = { hotelId: 'h1', roomId: 'r1', amount: 1000, currency: 'USD' };
    const quote = buildPriceQuote(payload);

    expect(verifyPriceQuoteSignature(quote)).toBe(true);
    expect(
      verifyPriceQuoteSignature({
        ...quote,
        totalAmount: quote.totalAmount + 1
      })
    ).toBe(false);
  });
});
