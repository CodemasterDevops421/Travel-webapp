import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking checkout return flow', () => {
  const returnClientSource = readFileSync(
    resolve(process.cwd(), 'src/app/booking/return/booking-return-client.tsx'),
    'utf8'
  );
  const bookingPageSource = readFileSync(resolve(process.cwd(), 'src/app/booking/page.tsx'), 'utf8');
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
    expect(bookingConsoleSource).toContain("const signInHref = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;");
    expect(bookingConsoleSource).toContain("const selectedLanguageParam = preferredLanguage ?? normalizeLanguage(searchParams.get('preferredLanguage')) ?? normalizeLanguage(searchParams.get('language'));");
    expect(bookingConsoleSource).toContain("const selectedCurrencyParam = preferredCurrency ?? normalizeCurrency(searchParams.get('preferredCurrency')) ?? normalizeCurrency(searchParams.get('currency'));");
    expect(bookingConsoleSource).toContain("params.set('language', selectedLanguageParam);");
    expect(bookingConsoleSource).toContain("params.set('currency', selectedCurrencyParam);");
    expect(bookingConsoleSource).toContain('router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);');
    expect(bookingConsoleSource).toContain("throw new Error(authError ?? 'Sign in to continue to secure payment.');");
  });

  it('checks auth before creating or launching payment for a selected booking', () => {
    expect(bookingConsoleSource).toContain('const createdPrebook = await prebookMutation.mutateAsync(values);');
    expect(bookingConsoleSource).toContain("{user ? 'Open secure payment' : 'Sign in to pay'}");
    expect(bookingConsoleSource).toContain('await startPayment(values).catch((error: unknown) => {');
    expect(bookingConsoleSource).toContain('liteAPIPayment.handlePayment();');
  });

  it('lets the booking page progress into review before payment auth is required', () => {
    expect(bookingConsoleSource).toContain("!prebook ? 'Continue to booking review' : 'Complete booking'");
    expect(bookingConsoleSource).toContain("{user ? 'Open secure payment' : 'Sign in to pay'}");
    expect(bookingConsoleSource).toContain('You can reach the booking page without signing in. We only require sign-in when you continue to payment.');
  });

  it('renders a booking-review layout with traveler form and stay summary before payment', () => {
    expect(bookingConsoleSource).toContain('Back to property');
    expect(bookingConsoleSource).toContain('Complete your booking');
    expect(bookingConsoleSource).toContain('Your details');
    expect(bookingConsoleSource).toContain('Payment information');
    expect(bookingConsoleSource).toContain('Cancellation policy');
    expect(bookingConsoleSource).toContain('Your room');
    expect(bookingConsoleSource).toContain('Complete booking');
    expect(bookingConsoleSource).not.toContain('Are you traveling for work?');
    expect(bookingConsoleSource).not.toContain('Who is the booking for');
    expect(bookingConsoleSource).not.toContain('Special requests');
    expect(bookingConsoleSource).not.toContain('We will pass along requests to the property');
  });

  it('passes hotel and room summary fields through the booking route contract', () => {
    expect(bookingPageSource).toContain("hotelName: pickParam(params, 'hotelName')");
    expect(bookingPageSource).toContain("hotelImage: pickParam(params, 'hotelImage')");
    expect(bookingPageSource).toContain("hotelAddress: pickParam(params, 'hotelAddress')");
    expect(bookingPageSource).toContain("starRating: pickNumber(params, 'starRating')");
    expect(bookingPageSource).toContain("roomName: pickParam(params, 'roomName')");
    expect(bookingPageSource).toContain("boardName: pickParam(params, 'boardName')");
    expect(bookingPageSource).toContain("roomImage: pickParam(params, 'roomImage')");
    expect(bookingPageSource).toContain("const preferredLanguage = normalizeLanguage(pickParam(params, 'preferredLanguage')) ?? normalizeLanguage(pickParam(params, 'language'));");
    expect(bookingPageSource).toContain("const preferredCurrency =");
    expect(bookingPageSource).toContain("const quoteCurrency = normalizeCurrency(pickParam(params, 'currency'));");
  });

  it('keeps multi-night stay cost separate from estimated taxes and fees', () => {
    expect(bookingConsoleSource).toContain('const quotedStayTotal = Number(liveValues.amount || 0);');
    expect(bookingConsoleSource).toContain('const staySubtotal = quotedStayTotal; // already the full stay price');
    expect(bookingConsoleSource).toContain('const estimatedTaxesAndFees = prebook ? Math.max(totalAmount - staySubtotal, 0) : 0;');
    expect(bookingConsoleSource).toContain('Average per night');
    expect(bookingConsoleSource).toContain('Room subtotal');
    expect(bookingConsoleSource).toContain('Estimated taxes and fees');
    expect(bookingConsoleSource).not.toContain('Selected stay');
    expect(bookingConsoleSource).not.toContain('Included taxes and fees');
  });
});
