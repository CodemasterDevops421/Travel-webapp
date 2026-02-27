import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('booking cancellation UI wiring', () => {
  it('renders first-party cancellation action on booking confirmation page', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/bookings/[bookingId]/page.tsx'), 'utf8');
    expect(source).toContain('BookingCancelAction');
  });

  it('wires cancellation action to booking cancel API route', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/features/booking/components/booking-cancel-action.tsx'), 'utf8');
    expect(source).toContain('/api/bookings/${encodeURIComponent(bookingId)}/cancel');
    expect(source).toContain("'x-booking-view-token': viewToken");
  });
});
