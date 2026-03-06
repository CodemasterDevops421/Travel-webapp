import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('checkout conversion UI contract', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/booking/components/booking-console.tsx'),
    'utf8'
  );

  it('keeps the real step state while compressing the progress presentation', () => {
    expect(source).toContain("type CheckoutStep = 'guest_details' | 'payment' | 'confirmation';");
    expect(source).toContain('Guest details');
    expect(source).toContain('Payment');
    expect(source).toContain('Confirmation');
    expect(source).not.toContain('Complete your booking in three simple steps.');
  });

  it('anchors reassurance in the summary panel, including cancellation context', () => {
    expect(source).toContain('Cancellation summary');
    expect(source).toContain('Your booking is protected');
    expect(source).toContain('Selected rate locked');
  });
});
