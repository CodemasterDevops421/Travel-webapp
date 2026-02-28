import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('hotel booking card selected-rate contract', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-sections.tsx'),
    'utf8'
  );

  it('keeps one selected-rate source of truth shared by room cards and sticky card', () => {
    expect(source).toContain('onClick={() => setSelectedRateKey(buildRateKey(rate))}');
    expect(source).toContain('const groupedRates = useMemo(() =>');
    expect(source).toContain('group.offers.map((rate) =>');
  });

  it('verifies state contract matches selected props in parent', () => {
    const parentSource = readFileSync(resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'), 'utf8');
    expect(parentSource).toContain('const [selectedRateKey, setSelectedRateKey] = useState<string | null>(');
    expect(parentSource).toContain('const selectedRate = useMemo(');
    expect(parentSource).toContain('const selectedCancellation = useMemo(');
    expect(parentSource).toContain('const selectedBookingHref = useMemo(() =>');
  });

  it('shows cancellation context from explicit rate contract fields', () => {
    const parentSource = readFileSync(resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'), 'utf8');
    const sidebarSource = readFileSync(resolve(process.cwd(), 'src/features/hotels/components/hotel-booking-sidebar.tsx'), 'utf8');
    expect(parentSource).toContain('function getCancellationCopy(rate: HotelRateWithCancellationContext)');
    expect(parentSource).toContain("status: 'Non-refundable'");
    expect(parentSource).toContain("status: 'Free cancellation'");
    expect(parentSource).toContain("status: 'Cancellation policy pending'");
    expect(sidebarSource).toContain('selectedCancellation?.status');
    expect(sidebarSource).toContain('selectedCancellation?.detail');
  });

  it('passes complete booking query payload including cancellation fields', () => {
    const parentSource = readFileSync(resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'), 'utf8');
    expect(parentSource).toContain('bookingQuery.set(\'cancellationDeadline\', rate.cancellationDeadline);');
    expect(parentSource).toContain('bookingQuery.set(\'cancellationNote\', rate.cancellationNote);');
    expect(parentSource).toContain("isRefundable: rate.isRefundable === null ? 'unknown' : rate.isRefundable ? 'true' : 'false'");
    expect(parentSource).toContain('hotelId: context.hotelId');
    expect(parentSource).toContain('roomId: rate.roomId');
    expect(parentSource).toContain('offerId: rate.offerId');
    expect(parentSource).toContain('amount: String(rate.amount)');
    expect(parentSource).toContain('checkIn: context.checkin');
    expect(parentSource).toContain('checkOut: context.checkout');
  });
});
