import { describe, expect, it } from 'vitest';
import {
  BOOKING_LIFECYCLE_STATES,
  assertValidBookingTransition,
  canTransitionBookingState,
  getAllowedBookingTransitions
} from '@/server/booking/lifecycle';

describe('booking lifecycle guards', () => {
  it('accepts legal status transitions', () => {
    expect(canTransitionBookingState('pending', 'payment_authorized')).toBe(true);
    expect(canTransitionBookingState('payment_authorized', 'confirmed')).toBe(true);
    expect(canTransitionBookingState('payment_authorized', 'failed')).toBe(true);
    expect(canTransitionBookingState('confirmed', 'refunded')).toBe(true);
  });

  it('rejects illegal status jumps', () => {
    expect(canTransitionBookingState('pending', 'confirmed')).toBe(false);
    expect(canTransitionBookingState('pending', 'refunded')).toBe(false);
    expect(canTransitionBookingState('confirmed', 'failed')).toBe(false);
    expect(canTransitionBookingState('failed', 'pending')).toBe(false);
    expect(canTransitionBookingState('refunded', 'confirmed')).toBe(false);
  });

  it('treats failed and refunded as terminal states', () => {
    expect(getAllowedBookingTransitions('failed')).toEqual([]);
    expect(getAllowedBookingTransitions('refunded')).toEqual([]);
    expect(canTransitionBookingState('failed', 'confirmed')).toBe(false);
    expect(canTransitionBookingState('refunded', 'pending')).toBe(false);
  });

  it('allows idempotent writes for same status', () => {
    for (const state of BOOKING_LIFECYCLE_STATES) {
      expect(canTransitionBookingState(state, state)).toBe(true);
    }
  });

  it('throws when asserting an invalid transition', () => {
    expect(() => assertValidBookingTransition('pending', 'confirmed')).toThrow(
      'Invalid booking transition: pending -> confirmed'
    );
  });

  it('throws on unknown lifecycle states', () => {
    expect(() => assertValidBookingTransition('unknown', 'pending')).toThrow(
      'Invalid booking lifecycle state: unknown'
    );
    expect(() => assertValidBookingTransition('pending', 'unknown')).toThrow(
      'Invalid booking lifecycle state: unknown'
    );
  });
});
