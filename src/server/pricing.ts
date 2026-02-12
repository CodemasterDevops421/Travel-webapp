import { createHash } from 'node:crypto';
import { env } from '@/server/env';
import { applyMarkup } from '@/shared/lib/utils';

export type PriceQuote = {
  hotelId: string;
  roomId: string;
  baseAmount: number;
  totalAmount: number;
  currency: string;
  signature: string;
};

function createQuoteHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function buildPriceQuote(payload: { hotelId: string; roomId: string; amount: number; currency: string }): PriceQuote {
  const totalAmount = applyMarkup(payload.amount, env.PRICE_MARKUP_PERCENT);
  const quote = {
    hotelId: payload.hotelId,
    roomId: payload.roomId,
    baseAmount: payload.amount,
    totalAmount,
    currency: payload.currency
  };

  return {
    ...quote,
    signature: createQuoteHash(quote)
  };
}
