import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking checkout session persistence', () => {
  const bookingConsoleSource = readFileSync(
    resolve(process.cwd(), 'src/features/booking/components/booking-console.tsx'),
    'utf8'
  );

  it('preserves guest payload in local fallback session storage for return recovery', () => {
    expect(bookingConsoleSource).toContain('const localPayload: CheckoutSessionPayload');
    expect(bookingConsoleSource).toContain('guests: payload.guests');
    expect(bookingConsoleSource).not.toContain('guests: []');
  });

  it('preserves holder identity for booking return finalization payload', () => {
    expect(bookingConsoleSource).not.toContain("holder: {\n      firstName: '',\n      lastName: '',\n      email: ''\n    }");
  });
});
