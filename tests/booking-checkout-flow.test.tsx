import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking checkout return flow', () => {
  const returnClientSource = readFileSync(
    resolve(process.cwd(), 'src/app/booking/return/booking-return-client.tsx'),
    'utf8'
  );
  const bookingConsoleSource = readFileSync(
    resolve(process.cwd(), 'src/features/booking/components/booking-console.tsx'),
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

  it('gates payment launch behind auth and preserves booking redirect context', () => {
    expect(bookingConsoleSource).toContain('const { user, isLoading: authIsLoading, error: authError } = useAuth();');
    expect(bookingConsoleSource).toContain('const redirectPath = query ? `${pathname}?${query}` : pathname;');
    expect(bookingConsoleSource).toContain('router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);');
    expect(bookingConsoleSource).toContain("throw new Error(authError ?? 'Sign in to continue to secure payment.');");
  });

  it('checks auth before creating or launching payment for a selected booking', () => {
    const signInGuardIndex = bookingConsoleSource.indexOf('await ensureSignedInForPayment();');
    const prebookIndex = bookingConsoleSource.indexOf('const createdPrebook = await prebookMutation.mutateAsync(values);');
    const widgetIndex = bookingConsoleSource.indexOf('liteAPIPayment.handlePayment();');

    expect(signInGuardIndex).toBeGreaterThanOrEqual(0);
    expect(prebookIndex).toBeGreaterThan(signInGuardIndex);
    expect(widgetIndex).toBeGreaterThan(signInGuardIndex);
  });
});
