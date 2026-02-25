import 'server-only';
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

export async function sendLifecycleEmail(
  payload: LifecycleEmailPayload & { transition: 'confirmed' | 'failed' | 'refunded'; bookingId: string }
): Promise<void> {
  logger.info(
    {
      bookingId: payload.bookingId,
      transition: payload.transition,
      bookingReference: payload.bookingReference,
      toEmail: payload.toEmail,
      invoiceStatus: payload.invoiceStatus
    },
    'Lifecycle email dispatch queued'
  );
}
