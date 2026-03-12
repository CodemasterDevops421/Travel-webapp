import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pickLowestActionableRate } from '@/features/hotels/components/hotel-detail-experience';

describe('hotel booking default-offer regression coverage', () => {
  const parentSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'),
    'utf8'
  );
  const bookingSidebarSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-booking-sidebar.tsx'),
    'utf8'
  );

  it('picks the cheapest actionable rate from unsorted supplier payloads', () => {
    const selected = pickLowestActionableRate([
      { offerId: 'offer-expensive', roomId: 'room-a', amount: 289 },
      { offerId: 'offer-cheapest', roomId: 'room-b', amount: 199 },
      { offerId: 'offer-mid', roomId: 'room-c', amount: 249 }
    ]);

    expect(selected?.offerId).toBe('offer-cheapest');
    expect(selected?.roomId).toBe('room-b');
    expect(selected?.amount).toBe(199);
  });

  it('skips zero and invalid prices before falling back', () => {
    const selected = pickLowestActionableRate([
      { offerId: 'offer-zero', roomId: 'room-a', amount: 0 },
      { offerId: 'offer-invalid', roomId: 'room-b', amount: Number.NaN },
      { offerId: 'offer-live', roomId: 'room-c', amount: 245 }
    ]);

    expect(selected?.offerId).toBe('offer-live');
  });

  it('falls back to the first supplier row only when no actionable rate exists', () => {
    const selected = pickLowestActionableRate([
      { offerId: 'offer-placeholder', roomId: 'room-a', amount: 0 },
      { offerId: 'offer-invalid', roomId: 'room-b', amount: Number.NaN }
    ]);

    expect(selected?.offerId).toBe('offer-placeholder');
  });

  it('uses the cheapest actionable rate as the shared default selection contract', () => {
    expect(parentSource).toContain('const initialDefaultRate = useMemo(() => pickLowestActionableRate(initialRates), [initialRates]);');
    expect(parentSource).toContain('const defaultRate = useMemo(() => pickLowestActionableRate(rates), [rates]);');
    expect(parentSource).toContain('initialDefaultRate ? buildRateKey(initialDefaultRate) : null');
    expect(parentSource).toContain('return defaultRate ? buildRateKey(defaultRate) : buildRateKey(rates[0]);');
    expect(parentSource).toContain('const lowestRate = defaultRate?.amount ?? rates.reduce<number | null>');
    expect(parentSource).toContain("const currency = defaultRate?.currency ?? rates[0]?.currency ?? 'USD';");
    expect(parentSource).toContain('() => rates.find((rate) => buildRateKey(rate) === selectedRateKey) ?? defaultRate ?? rates[0] ?? null,');
  });

  it('enriches the booking handoff with summary fields needed by the guest-first booking page', () => {
    expect(parentSource).toContain("bookingQuery.set('hotelName', context.hotelName);");
    expect(parentSource).toContain("bookingQuery.set('hotelImage', context.hotelImage);");
    expect(parentSource).toContain("bookingQuery.set('hotelAddress', context.hotelAddress);");
    expect(parentSource).toContain("bookingQuery.set('starRating', String(context.starRating));");
    expect(parentSource).toContain("bookingQuery.set('preferredLanguage', context.preferredLanguage);");
    expect(parentSource).toContain("bookingQuery.set('preferredCurrency', context.preferredCurrency);");
    expect(parentSource).toContain("const preferredLanguage = searchParams.get('language');");
    expect(parentSource).toContain("const preferredCurrency = searchParams.get('currency');");
    expect(parentSource).toContain("bookingQuery.set('roomImage', rate.imageUrl);");
    expect(parentSource).toContain("roomName: rate.roomName");
    expect(parentSource).toContain("boardName: rate.boardName");
  });

  it('keeps the booking rail chrome pinned to the restored shell utility classes', () => {
    expect(bookingSidebarSource).toContain('className="surface-shell overflow-hidden"');
    expect(bookingSidebarSource).toContain('className="surface-shell-subtle px-3 py-3"');
  });
});
