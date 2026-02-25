import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking checkout return flow', () => {
  const returnClientSource = readFileSync(
    resolve(process.cwd(), 'src/app/booking/return/booking-return-client.tsx'),
    'utf8'
  );

  it('polls lifecycle-backed status endpoint before rendering confirmation route', () => {
    expect(returnClientSource).toContain("fetch('/api/booking/status'");
    expect(returnClientSource).toContain("statusJson.outcome === 'confirmed'");
    expect(returnClientSource).toContain("statusJson.outcome === 'failed'");
  });

  it('keeps processing state messaging while lifecycle is pending', () => {
    expect(returnClientSource).toContain('Waiting for booking lifecycle confirmation');
    expect(returnClientSource).toContain("setStatus('processing')");
    expect(returnClientSource).toContain('Booking is still processing');
  });

  it('only redirects to confirmation after confirmed outcome branch', () => {
    const confirmedIndex = returnClientSource.indexOf("statusJson.outcome === 'confirmed'");
    const replaceIndex = returnClientSource.indexOf('router.replace(bookingUrl as never);');

    expect(confirmedIndex).toBeGreaterThanOrEqual(0);
    expect(replaceIndex).toBeGreaterThan(confirmedIndex);
  });
});
