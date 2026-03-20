import { describe, expect, it } from 'vitest';
import {
  BOOKING_LIFECYCLE_STATES,
  PAYMENT_LIFECYCLE_STATES,
  SUPPLIER_LIFECYCLE_STATES,
  assertValidBookingTransition,
  assertValidPaymentTransition,
  assertValidSupplierTransition,
  canTransitionBookingState,
  canTransitionPaymentState,
  canTransitionSupplierState,
  getAllowedBookingTransitions
} from '@/server/booking/lifecycle';

describe('booking lifecycle guards', () => {
  it('accepts legal booking transitions', () => {
    expect(canTransitionBookingState('draft', 'prebooked')).toBe(true);
    expect(canTransitionBookingState('payment_authorized', 'booking_requested')).toBe(true);
    expect(canTransitionBookingState('booking_requested', 'booking_confirmed')).toBe(true);
    expect(canTransitionBookingState('booking_confirmed', 'refund_pending')).toBe(true);
    expect(canTransitionBookingState('refund_pending', 'refunded')).toBe(true);
  });

  it('rejects illegal booking jumps', () => {
    expect(canTransitionBookingState('draft', 'booking_confirmed')).toBe(false);
    expect(canTransitionBookingState('payment_pending', 'refunded')).toBe(false);
    expect(canTransitionBookingState('booking_confirmed', 'payment_authorized')).toBe(false);
    expect(canTransitionBookingState('booking_failed', 'draft')).toBe(false);
    expect(canTransitionBookingState('refunded', 'booking_confirmed')).toBe(false);
  });

  it('treats refunded as terminal', () => {
    expect(getAllowedBookingTransitions('refunded')).toEqual([]);
    expect(canTransitionBookingState('refunded', 'refund_pending')).toBe(false);
  });

  it('allows idempotent writes for same booking status', () => {
    for (const state of BOOKING_LIFECYCLE_STATES) {
      expect(canTransitionBookingState(state, state)).toBe(true);
    }
  });

  it('supports idempotent writes for payment and supplier states', () => {
    for (const state of PAYMENT_LIFECYCLE_STATES) {
      expect(canTransitionPaymentState(state, state)).toBe(true);
    }

    for (const state of SUPPLIER_LIFECYCLE_STATES) {
      expect(canTransitionSupplierState(state, state)).toBe(true);
    }
  });

  it('throws when asserting an invalid booking transition', () => {
    expect(() => assertValidBookingTransition('draft', 'booking_confirmed')).toThrow(
      'Invalid booking transition: draft -> booking_confirmed'
    );
  });

  it('throws on unknown lifecycle states', () => {
    expect(() => assertValidBookingTransition('unknown', 'draft')).toThrow(
      'Invalid booking lifecycle state: unknown'
    );
    expect(() => assertValidBookingTransition('draft', 'unknown')).toThrow(
      'Invalid booking lifecycle state: unknown'
    );
  });

  it('enforces payment and supplier monotonic transitions', () => {
    expect(() => assertValidPaymentTransition('authorized', 'pending')).toThrow(
      'Invalid payment transition: authorized -> pending'
    );
    expect(() => assertValidSupplierTransition('confirmed', 'requesting')).toThrow(
      'Invalid supplier transition: confirmed -> requesting'
    );
  });
});
