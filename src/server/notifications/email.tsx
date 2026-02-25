import 'server-only';
import { renderToStaticMarkup } from 'react-dom/server';
import { env } from '@/server/env';
import { logger } from '@/server/logger';
import { BookingCancellationEmail } from '@/emails/booking-cancellation';
import { BookingConfirmationEmail } from '@/emails/booking-confirmation';

export type LifecycleEmailPayload = {
  toEmail: string;
  bookingReference: string;
  checkIn: string | null;
  checkOut: string | null;
  totalAmount: number | null;
  currency: string | null;
  invoiceStatus: string;
};

type LifecycleTransition = 'confirmed' | 'failed' | 'refunded';

type LifecycleEmailMessage = {
  subject: string;
  html: string;
};

const RESEND_API_URL = 'https://api.resend.com/emails';

function formatDate(value: string | null): string {
  if (!value) {
    return 'TBD';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatAmount(totalAmount: number | null, currency: string | null): string {
  if (typeof totalAmount !== 'number') {
    return 'Amount unavailable';
  }

  const normalizedCurrency = (currency ?? 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2
    }).format(totalAmount);
  } catch {
    return `${normalizedCurrency} ${totalAmount.toFixed(2)}`;
  }
}

function buildLifecycleMessage(
  payload: LifecycleEmailPayload,
  transition: LifecycleTransition
): LifecycleEmailMessage {
  const checkIn = formatDate(payload.checkIn);
  const checkOut = formatDate(payload.checkOut);
  const total = formatAmount(payload.totalAmount, payload.currency);

  if (transition === 'confirmed') {
    const html = renderToStaticMarkup(
      <BookingConfirmationEmail
        bookingReference={payload.bookingReference}
        checkIn={checkIn}
        checkOut={checkOut}
        total={total}
      />
    );
    return {
      subject: `Booking confirmed: ${payload.bookingReference}`,
      html: `<!doctype html>${html}`
    };
  }

  const outcome = transition === 'refunded' ? 'Refund processed' : 'Booking canceled';
  const html = renderToStaticMarkup(
    <BookingCancellationEmail
      bookingReference={payload.bookingReference}
      checkIn={checkIn}
      checkOut={checkOut}
      total={total}
      outcome={outcome}
      invoiceStatus={payload.invoiceStatus}
    />
  );

  return {
    subject: `${outcome}: ${payload.bookingReference}`,
    html: `<!doctype html>${html}`
  };
}

export async function sendLifecycleEmail(
  payload: LifecycleEmailPayload & { transition: LifecycleTransition; bookingId: string }
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.BOOKING_FROM_EMAIL) {
    logger.warn(
      {
        bookingId: payload.bookingId,
        transition: payload.transition,
        bookingReference: payload.bookingReference
      },
      'Lifecycle email skipped because provider credentials are missing'
    );
    return;
  }

  const message = buildLifecycleMessage(payload, payload.transition);
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `booking-${payload.bookingId}-${payload.transition}`
    },
    body: JSON.stringify({
      from: env.BOOKING_FROM_EMAIL,
      to: [payload.toEmail],
      subject: message.subject,
      html: message.html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Lifecycle email send failed (${response.status}): ${body.slice(0, 240)}`);
  }

  logger.info(
    {
      bookingId: payload.bookingId,
      transition: payload.transition,
      bookingReference: payload.bookingReference,
      toEmail: payload.toEmail,
      invoiceStatus: payload.invoiceStatus
    },
    'Lifecycle email sent'
  );
}
