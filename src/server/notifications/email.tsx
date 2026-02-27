import 'server-only';
import { env } from '@/server/env';
import { logger } from '@/server/logger';

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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderEmailLayout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;"><tr><td style="padding:24px;"><h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h1>${body}<p style="margin:24px 0 0 0;font-size:12px;color:#64748b;">Hostel Stays</p></td></tr></table></td></tr></table></body></html>`;
}

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
    const html = renderEmailLayout(
      'Booking confirmed',
      `<p style="margin:0 0 12px 0;">Your booking is confirmed.</p><p style="margin:0 0 8px 0;"><strong>Reference:</strong> ${escapeHtml(payload.bookingReference)}</p><p style="margin:0 0 8px 0;"><strong>Check-in:</strong> ${escapeHtml(checkIn)}</p><p style="margin:0 0 8px 0;"><strong>Check-out:</strong> ${escapeHtml(checkOut)}</p><p style="margin:0;"><strong>Total:</strong> ${escapeHtml(total)}</p>`
    );
    return {
      subject: `Booking confirmed: ${payload.bookingReference}`,
      html
    };
  }

  const outcome = transition === 'refunded' ? 'Refund processed' : 'Booking canceled';
  const html = renderEmailLayout(
    outcome,
    `<p style="margin:0 0 12px 0;">${escapeHtml(outcome)} for your stay.</p><p style="margin:0 0 8px 0;"><strong>Reference:</strong> ${escapeHtml(payload.bookingReference)}</p><p style="margin:0 0 8px 0;"><strong>Check-in:</strong> ${escapeHtml(checkIn)}</p><p style="margin:0 0 8px 0;"><strong>Check-out:</strong> ${escapeHtml(checkOut)}</p><p style="margin:0 0 8px 0;"><strong>Total:</strong> ${escapeHtml(total)}</p><p style="margin:0;"><strong>Invoice status:</strong> ${escapeHtml(payload.invoiceStatus)}</p>`
  );

  return {
    subject: `${outcome}: ${payload.bookingReference}`,
    html
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
