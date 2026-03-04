import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/server/env';
import { getQuoteSigningSecret } from '@/server/secrets';
import { applyMarkup } from '@/shared/lib/utils';

export type PriceQuote = {
  hotelId: string;
  roomId: string;
  baseAmount: number;
  totalAmount: number;
  currency: string;
  signature: string;
};

type QuotePayload = {
  hotelId: string;
  roomId: string;
  baseAmount: number;
  totalAmount: number;
  currency: string;
};

function createQuoteSignature(payload: QuotePayload): string {
  return createHmac('sha256', getQuoteSigningSecret()).update(JSON.stringify(payload)).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function buildPriceQuote(payload: { hotelId: string; roomId: string; amount: number; currency: string }): PriceQuote {
  return buildPriceQuoteWithMarkup(payload, env.PRICE_MARKUP_PERCENT);
}

export function buildPriceQuoteWithMarkup(
  payload: { hotelId: string; roomId: string; amount: number; currency: string },
  commissionPercent: number
): PriceQuote {
  const normalizedPercent = Number.isFinite(commissionPercent)
    ? Math.min(40, Math.max(0, commissionPercent))
    : env.PRICE_MARKUP_PERCENT;
  const totalAmount = applyMarkup(payload.amount, normalizedPercent);
  const quote: QuotePayload = {
    hotelId: payload.hotelId,
    roomId: payload.roomId,
    baseAmount: payload.amount,
    totalAmount,
    currency: payload.currency
  };

  return {
    ...quote,
    signature: createQuoteSignature(quote)
  };
}

export function buildPriceQuoteExact(payload: { hotelId: string; roomId: string; amount: number; currency: string }): PriceQuote {
  const quote: QuotePayload = {
    hotelId: payload.hotelId,
    roomId: payload.roomId,
    baseAmount: payload.amount,
    totalAmount: payload.amount,
    currency: payload.currency
  };

  return {
    ...quote,
    signature: createQuoteSignature(quote)
  };
}

export function verifyPriceQuoteSignature(quote: PriceQuote): boolean {
  const expected = createQuoteSignature({
    hotelId: quote.hotelId,
    roomId: quote.roomId,
    baseAmount: quote.baseAmount,
    totalAmount: quote.totalAmount,
    currency: quote.currency
  });

  return safeCompare(expected, quote.signature);
}

export function applyPromoDiscount(quote: PriceQuote, discountPercent: number): PriceQuote {
  if (discountPercent <= 0 || discountPercent >= 100) return quote;

  const discountMultiplier = 1 - (discountPercent / 100);
  const newTotalAmount = Math.max(0, Math.floor(quote.totalAmount * discountMultiplier));

  const newQuotePayload: QuotePayload = {
    hotelId: quote.hotelId,
    roomId: quote.roomId,
    baseAmount: quote.baseAmount,
    totalAmount: newTotalAmount,
    currency: quote.currency
  };

  return {
    ...newQuotePayload,
    signature: createQuoteSignature(newQuotePayload)
  };
}
