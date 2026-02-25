import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { env } from '@/server/env';

type StripeCheckoutIntentInput = {
  transactionId: string;
  prebookId: string;
  quoteId: string | null;
  clientReference: string;
  totalAmount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  bookingLabel: string;
};

type StripeCheckoutIntentResult = {
  sessionId: string;
  sessionUrl: string | null;
  paymentIntentId: string | null;
  customerId: string | null;
  idempotencyKey: string;
};

type StripeRefundInput = {
  paymentIntentId: string;
  metadata?: Record<string, string>;
};

type StripeRefundResult = {
  refundId: string;
  status: string;
  paymentIntentId: string;
};

let client: Stripe | null = null;

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF'
]);

function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key is not configured');
  }

  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return client;
}

function toStripeAmount(totalAmount: number, currency: string): number {
  const normalizedCurrency = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return Math.round(totalAmount);
  }

  return Math.round(totalAmount * 100);
}

export function createStripeIdempotencyKey(parts: Array<string | null | undefined>): string {
  const hash = createHash('sha256');
  hash.update(parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join('|'));
  return `checkout-${hash.digest('hex').slice(0, 48)}`;
}

export async function createStripeCheckoutIntent(
  input: StripeCheckoutIntentInput
): Promise<StripeCheckoutIntentResult> {
  const stripe = getStripeClient();
  const currency = input.currency.toLowerCase();
  const amount = toStripeAmount(input.totalAmount, input.currency);
  const idempotencyKey = createStripeIdempotencyKey([
    input.transactionId,
    input.prebookId,
    input.quoteId,
    input.clientReference,
    `${amount}`,
    currency
  ]);

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.transactionId,
      metadata: {
        transactionId: input.transactionId,
        prebookId: input.prebookId,
        quoteId: input.quoteId ?? '',
        clientReference: input.clientReference
      },
      payment_intent_data: {
        metadata: {
          transactionId: input.transactionId,
          prebookId: input.prebookId,
          quoteId: input.quoteId ?? '',
          clientReference: input.clientReference
        }
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: input.bookingLabel
            }
          }
        }
      ]
    },
    {
      idempotencyKey
    }
  );

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null;

  return {
    sessionId: session.id,
    sessionUrl: session.url ?? null,
    paymentIntentId,
    customerId,
    idempotencyKey
  };
}

export function constructStripeEvent(rawBody: string, signature: string): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured');
  }

  return getStripeClient().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}

export async function createStripeRefund(input: StripeRefundInput): Promise<StripeRefundResult> {
  const stripe = getStripeClient();
  const idempotencyKey = createStripeIdempotencyKey(['refund', input.paymentIntentId]);

  const refund = await stripe.refunds.create(
    {
      payment_intent: input.paymentIntentId,
      reason: 'requested_by_customer',
      metadata: input.metadata
    },
    {
      idempotencyKey
    }
  );

  return {
    refundId: refund.id,
    status: refund.status ?? 'pending',
    paymentIntentId: input.paymentIntentId
  };
}
