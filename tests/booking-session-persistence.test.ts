import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking checkout session persistence', () => {
  const bookingConsoleSource = readFileSync(
    resolve(process.cwd(), 'src/features/booking/components/booking-console.tsx'),
    'utf8'
  );
  const bookingReturnSource = readFileSync(
    resolve(process.cwd(), 'src/app/booking/return/booking-return-client.tsx'),
    'utf8'
  );

  it('stores checkout recovery payload on the server before payment launch', () => {
    expect(bookingConsoleSource).toContain("fetch('/api/booking/checkout-progress'");
    expect(bookingConsoleSource).toContain('guests: guestsPayload');
    expect(bookingConsoleSource).toContain('quote: activePrebook.quote');
  });

  it('does not read checkout secrets or traveler data from browser storage on return', () => {
    expect(bookingReturnSource).not.toContain('sessionStorage');
    expect(bookingReturnSource).not.toContain('localStorage');
    expect(bookingReturnSource).toContain('body: JSON.stringify({');
    expect(bookingReturnSource).toContain('prebookId,');
    expect(bookingReturnSource).toContain('transactionId');
  });
});
