export const BOOKING_LIFECYCLE_STATES = [
  'draft',
  'prebooked',
  'payment_pending',
  'payment_authorized',
  'booking_requested',
  'booking_confirmed',
  'booking_failed',
  'cancelled',
  'refund_pending',
  'refunded'
] as const;

export const PAYMENT_LIFECYCLE_STATES = [
  'not_started',
  'checkout_created',
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'chargeback_review'
] as const;

export const SUPPLIER_LIFECYCLE_STATES = [
  'not_sent',
  'requesting',
  'confirmed',
  'failed',
  'cancelled'
] as const;

export type BookingLifecycleState = (typeof BOOKING_LIFECYCLE_STATES)[number];
export type PaymentLifecycleState = (typeof PAYMENT_LIFECYCLE_STATES)[number];
export type SupplierLifecycleState = (typeof SUPPLIER_LIFECYCLE_STATES)[number];

const BOOKING_TRANSITION_MAP: Record<BookingLifecycleState, readonly BookingLifecycleState[]> = {
  draft: ['prebooked', 'payment_pending', 'booking_failed', 'cancelled'],
  prebooked: ['payment_pending', 'booking_failed', 'cancelled'],
  payment_pending: ['payment_authorized', 'booking_failed', 'cancelled'],
  payment_authorized: ['booking_requested', 'booking_failed', 'refund_pending', 'cancelled'],
  booking_requested: ['booking_confirmed', 'booking_failed', 'refund_pending', 'cancelled'],
  booking_confirmed: ['refund_pending', 'refunded', 'cancelled'],
  booking_failed: ['refund_pending'],
  cancelled: ['refund_pending', 'refunded'],
  refund_pending: ['refunded'],
  refunded: []
};

const PAYMENT_TRANSITION_MAP: Record<PaymentLifecycleState, readonly PaymentLifecycleState[]> = {
  not_started: ['checkout_created', 'pending', 'failed'],
  checkout_created: ['pending', 'authorized', 'failed'],
  pending: ['authorized', 'captured', 'failed'],
  authorized: ['captured', 'failed', 'refunded', 'chargeback_review'],
  captured: ['refunded', 'chargeback_review'],
  failed: [],
  refunded: [],
  chargeback_review: []
};

const SUPPLIER_TRANSITION_MAP: Record<SupplierLifecycleState, readonly SupplierLifecycleState[]> = {
  not_sent: ['requesting', 'failed', 'cancelled'],
  requesting: ['confirmed', 'failed', 'cancelled'],
  confirmed: ['cancelled'],
  failed: [],
  cancelled: []
};

const LEGACY_BOOKING_STATE_ALIASES: Record<string, BookingLifecycleState> = {
  pending: 'payment_pending',
  confirmed: 'booking_confirmed',
  failed: 'booking_failed'
};

const LEGACY_PAYMENT_STATE_ALIASES: Record<string, PaymentLifecycleState> = {
  payment_authorized: 'authorized'
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s.-]+/g, '_');
}

function normalizeBookingLifecycleState(value: string): BookingLifecycleState | null {
  const token = normalizeToken(value);
  if (!token) {
    return null;
  }

  return (LEGACY_BOOKING_STATE_ALIASES[token] ?? token) as BookingLifecycleState;
}

function normalizePaymentLifecycleState(value: string): PaymentLifecycleState | null {
  const token = normalizeToken(value);
  if (!token) {
    return null;
  }

  return (LEGACY_PAYMENT_STATE_ALIASES[token] ?? token) as PaymentLifecycleState;
}

function normalizeSupplierLifecycleState(value: string): SupplierLifecycleState | null {
  const token = normalizeToken(value);
  if (!token) {
    return null;
  }

  return token as SupplierLifecycleState;
}

export function isBookingLifecycleState(value: string): value is BookingLifecycleState {
  return BOOKING_LIFECYCLE_STATES.includes(normalizeBookingLifecycleState(value) as BookingLifecycleState);
}

export function isPaymentLifecycleState(value: string): value is PaymentLifecycleState {
  return PAYMENT_LIFECYCLE_STATES.includes(normalizePaymentLifecycleState(value) as PaymentLifecycleState);
}

export function isSupplierLifecycleState(value: string): value is SupplierLifecycleState {
  return SUPPLIER_LIFECYCLE_STATES.includes(normalizeSupplierLifecycleState(value) as SupplierLifecycleState);
}

export function coerceBookingLifecycleState(value: string): BookingLifecycleState | null {
  const normalized = normalizeBookingLifecycleState(value);
  return normalized && BOOKING_LIFECYCLE_STATES.includes(normalized) ? normalized : null;
}

export function coercePaymentLifecycleState(value: string): PaymentLifecycleState | null {
  const normalized = normalizePaymentLifecycleState(value);
  return normalized && PAYMENT_LIFECYCLE_STATES.includes(normalized) ? normalized : null;
}

export function coerceSupplierLifecycleState(value: string): SupplierLifecycleState | null {
  const normalized = normalizeSupplierLifecycleState(value);
  return normalized && SUPPLIER_LIFECYCLE_STATES.includes(normalized) ? normalized : null;
}

export function canTransitionBookingState(from: string, to: string): boolean {
  const normalizedFrom = coerceBookingLifecycleState(from);
  const normalizedTo = coerceBookingLifecycleState(to);
  if (!normalizedFrom || !normalizedTo) {
    return false;
  }

  if (normalizedFrom === normalizedTo) {
    return true;
  }

  return BOOKING_TRANSITION_MAP[normalizedFrom].includes(normalizedTo);
}

export function canTransitionPaymentState(from: string, to: string): boolean {
  const normalizedFrom = coercePaymentLifecycleState(from);
  const normalizedTo = coercePaymentLifecycleState(to);
  if (!normalizedFrom || !normalizedTo) {
    return false;
  }

  if (normalizedFrom === normalizedTo) {
    return true;
  }

  return PAYMENT_TRANSITION_MAP[normalizedFrom].includes(normalizedTo);
}

export function canTransitionSupplierState(from: string, to: string): boolean {
  const normalizedFrom = coerceSupplierLifecycleState(from);
  const normalizedTo = coerceSupplierLifecycleState(to);
  if (!normalizedFrom || !normalizedTo) {
    return false;
  }

  if (normalizedFrom === normalizedTo) {
    return true;
  }

  return SUPPLIER_TRANSITION_MAP[normalizedFrom].includes(normalizedTo);
}

export function assertValidBookingTransition(from: string, to: string): void {
  const normalizedFrom = coerceBookingLifecycleState(from);
  const normalizedTo = coerceBookingLifecycleState(to);

  if (!normalizedFrom) {
    throw new Error(`Invalid booking lifecycle state: ${from}`);
  }

  if (!normalizedTo) {
    throw new Error(`Invalid booking lifecycle state: ${to}`);
  }

  if (!canTransitionBookingState(normalizedFrom, normalizedTo)) {
    throw new Error(`Invalid booking transition: ${normalizedFrom} -> ${normalizedTo}`);
  }
}

export function assertValidPaymentTransition(from: string, to: string): void {
  const normalizedFrom = coercePaymentLifecycleState(from);
  const normalizedTo = coercePaymentLifecycleState(to);

  if (!normalizedFrom) {
    throw new Error(`Invalid payment lifecycle state: ${from}`);
  }

  if (!normalizedTo) {
    throw new Error(`Invalid payment lifecycle state: ${to}`);
  }

  if (!canTransitionPaymentState(normalizedFrom, normalizedTo)) {
    throw new Error(`Invalid payment transition: ${normalizedFrom} -> ${normalizedTo}`);
  }
}

export function assertValidSupplierTransition(from: string, to: string): void {
  const normalizedFrom = coerceSupplierLifecycleState(from);
  const normalizedTo = coerceSupplierLifecycleState(to);

  if (!normalizedFrom) {
    throw new Error(`Invalid supplier lifecycle state: ${from}`);
  }

  if (!normalizedTo) {
    throw new Error(`Invalid supplier lifecycle state: ${to}`);
  }

  if (!canTransitionSupplierState(normalizedFrom, normalizedTo)) {
    throw new Error(`Invalid supplier transition: ${normalizedFrom} -> ${normalizedTo}`);
  }
}

export function getAllowedBookingTransitions(from: string): readonly BookingLifecycleState[] {
  const normalizedFrom = coerceBookingLifecycleState(from);
  if (!normalizedFrom) {
    return [];
  }

  return BOOKING_TRANSITION_MAP[normalizedFrom];
}

export function getAllowedPaymentTransitions(from: string): readonly PaymentLifecycleState[] {
  const normalizedFrom = coercePaymentLifecycleState(from);
  if (!normalizedFrom) {
    return [];
  }

  return PAYMENT_TRANSITION_MAP[normalizedFrom];
}

export function getAllowedSupplierTransitions(from: string): readonly SupplierLifecycleState[] {
  const normalizedFrom = coerceSupplierLifecycleState(from);
  if (!normalizedFrom) {
    return [];
  }

  return SUPPLIER_TRANSITION_MAP[normalizedFrom];
}

export function normalizeSupplierBookingState(input: string): BookingLifecycleState | null {
  const token = normalizeToken(input);
  if (!token) {
    return null;
  }

  if (token.includes('refund') || token.includes('cancel') || token.includes('void')) {
    return 'refund_pending';
  }

  if (token.includes('confirmed') || token.includes('booked') || token.includes('success')) {
    return 'booking_confirmed';
  }

  if (token.includes('failed') || token.includes('declined') || token.includes('rejected') || token.includes('error')) {
    return 'booking_failed';
  }

  if (token.includes('pending') || token.includes('processing') || token.includes('received') || token.includes('request')) {
    return 'booking_requested';
  }

  return null;
}
