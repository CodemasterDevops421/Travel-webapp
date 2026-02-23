import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('hotel booking card selected-rate contract', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'),
    'utf8'
  );

  it('keeps one selected-rate source of truth shared by room cards and sticky card', () => {
    expect(source).toContain('const [selectedRateKey, setSelectedRateKey] = useState<string | null>(');
    expect(source).toContain('const selectedRate = useMemo(');
    expect(source).toContain('const selectedCancellation = useMemo(');
    expect(source).toContain('const selectedBookingHref = useMemo(() =>');
    expect(source).toContain('onClick={() => setSelectedRateKey(buildRateKey(rate))}');
  });

  it('shows cancellation context from explicit rate contract fields', () => {
    expect(source).toContain('function getCancellationCopy(rate: HotelRateWithCancellationContext)');
    expect(source).toContain("status: 'Non-refundable'");
    expect(source).toContain("status: 'Free cancellation'");
    expect(source).toContain("status: 'Cancellation policy pending'");
    expect(source).toContain('selectedCancellation?.status');
    expect(source).toContain('selectedCancellation?.detail');
  });

  it('passes complete booking query payload including cancellation fields', () => {
    expect(source).toContain('bookingQuery.set(\'cancellationDeadline\', rate.cancellationDeadline);');
    expect(source).toContain('bookingQuery.set(\'cancellationNote\', rate.cancellationNote);');
    expect(source).toContain("isRefundable: rate.isRefundable === null ? 'unknown' : rate.isRefundable ? 'true' : 'false'");
    expect(source).toContain('hotelId: context.hotelId');
    expect(source).toContain('roomId: rate.roomId');
    expect(source).toContain('offerId: rate.offerId');
    expect(source).toContain('amount: String(rate.amount)');
    expect(source).toContain('checkIn: context.checkin');
    expect(source).toContain('checkOut: context.checkout');
  });
});
