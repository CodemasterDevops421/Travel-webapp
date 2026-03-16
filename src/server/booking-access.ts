import type { BookingRecord } from '@/server/booking/repository';

type BookingAccessUser = {
  id: string;
  email?: string | null;
};

function readHolderEmail(metadata: Record<string, unknown> | null): string | null {
  const holder = metadata?.holder;
  if (!holder || typeof holder !== 'object') {
    return null;
  }

  const email = (holder as Record<string, unknown>).email;
  return typeof email === 'string' && email.trim().length > 0 ? email.trim().toLowerCase() : null;
}

export function canAccessBooking(user: BookingAccessUser | null | undefined, booking: BookingRecord | null | undefined): boolean {
  if (!user?.id || !booking) {
    return false;
  }

  if (booking.user_id && booking.user_id === user.id) {
    return true;
  }

  const normalizedUserEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : null;
  const holderEmail = readHolderEmail(booking.metadata);

  return Boolean(normalizedUserEmail && holderEmail && normalizedUserEmail === holderEmail);
}
