export const BOOKING_LIFECYCLE_STATES = [
  'pending',
  'payment_authorized',
  'confirmed',
  'failed',
  'refunded'
] as const;

export type BookingLifecycleState = (typeof BOOKING_LIFECYCLE_STATES)[number];

const BOOKING_TRANSITION_MAP: Record<BookingLifecycleState, readonly BookingLifecycleState[]> = {
  pending: ['payment_authorized', 'failed'],
  payment_authorized: ['confirmed', 'failed', 'refunded'],
  confirmed: ['refunded'],
  failed: [],
  refunded: []
};

function isBookingLifecycleState(value: string): value is BookingLifecycleState {
  return BOOKING_LIFECYCLE_STATES.includes(value as BookingLifecycleState);
}

export function canTransitionBookingState(from: string, to: string): boolean {
  if (!isBookingLifecycleState(from) || !isBookingLifecycleState(to)) {
    return false;
  }

  if (from === to) {
    return true;
  }

  return BOOKING_TRANSITION_MAP[from].includes(to);
}

export function assertValidBookingTransition(from: string, to: string): void {
  if (!isBookingLifecycleState(from)) {
    throw new Error(`Invalid booking lifecycle state: ${from}`);
  }

  if (!isBookingLifecycleState(to)) {
    throw new Error(`Invalid booking lifecycle state: ${to}`);
  }

  if (!canTransitionBookingState(from, to)) {
    throw new Error(`Invalid booking transition: ${from} -> ${to}`);
  }
}

export function getAllowedBookingTransitions(from: string): readonly BookingLifecycleState[] {
  if (!isBookingLifecycleState(from)) {
    return [];
  }

  return BOOKING_TRANSITION_MAP[from];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s.-]+/g, '_');
}

export function normalizeSupplierBookingState(input: string): BookingLifecycleState | null {
  const token = normalizeToken(input);
  if (!token) {
    return null;
  }

  if (
    token.includes('refund')
    || token.includes('cancel')
    || token.includes('void')
  ) {
    return 'refunded';
  }

  if (
    token.includes('authorized')
    || token.includes('authorised')
    || token.includes('payment_authorized')
    || token.includes('payment_authorised')
  ) {
    return 'payment_authorized';
  }

  if (
    token.includes('confirm')
    || token.includes('booked')
    || token.includes('booking_book')
    || token.includes('success')
  ) {
    return 'confirmed';
  }

  if (
    token.includes('failed')
    || token.includes('declined')
    || token.includes('rejected')
    || token.includes('error')
  ) {
    return 'failed';
  }

  if (
    token.includes('pending')
    || token.includes('processing')
    || token === 'received'
  ) {
    return 'pending';
  }

  return null;
}
