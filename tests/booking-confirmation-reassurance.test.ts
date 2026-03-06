import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking confirmation reassurance contract', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/app/bookings/[bookingId]/page.tsx'),
    'utf8'
  );

  it('adds a next-step block ahead of itinerary and support details', () => {
    expect(source).toContain('Next step');
    expect(source.indexOf('Next step')).toBeLessThan(source.indexOf('Hotel details'));
    expect(source.indexOf('Next step')).toBeLessThan(source.indexOf('Support and actions'));
  });

  it('keeps operational status prominent for refund-pending bookings', () => {
    expect(source).toContain('Cancellation in progress');
    expect(source).toContain('Your booking status is being updated');
  });
});
