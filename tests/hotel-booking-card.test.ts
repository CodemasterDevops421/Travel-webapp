import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('hotel booking card selected-rate contract', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-sections.tsx'),
    'utf8'
  );
  const roomSectionSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/property-room-selection-section.tsx'),
    'utf8'
  );

  it('keeps one selected-rate source of truth shared by room cards and sticky card', () => {
    expect(roomSectionSource).toContain('setSelectedRateKey(rateKey);');
    expect(roomSectionSource).toContain('onChooseRate(rate);');
    expect(source).toContain('const groupedRates = useMemo(() =>');
    expect(roomSectionSource).toContain('group.offers.map((rate) =>');
  });

  it('moves booking forward directly from the chosen room row', () => {
    const parentSource = readFileSync(resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'), 'utf8');
    expect(roomSectionSource).toContain("isSelected ? 'Continue booking' : isRecommended ? 'Choose recommended' : 'Choose room'");
    expect(parentSource).toContain('const router = useRouter();');
    expect(parentSource).toContain('function handleChooseRate(rate: HotelRateWithCancellationContext)');
    expect(parentSource).toContain('router.push(buildBookingHref(rate) as any);');
    expect(source).toContain('onChooseRate: (rate: HotelRateWithCancellationContext) => void;');
  });

  it('verifies state contract matches selected props in parent', () => {
    const parentSource = readFileSync(resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'), 'utf8');
    expect(parentSource).toContain('const [selectedRateKey, setSelectedRateKey] = useState<string | null>(');
    expect(parentSource).toContain('const recommendedRateKey = useMemo(() =>');
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
    expect(sidebarSource).not.toContain('In high demand');
    expect(sidebarSource).not.toContain('Prices may increase soon.');
    expect(sidebarSource.indexOf('Booking clarity')).toBeLessThan(sidebarSource.indexOf('Reserve selected room'));
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

  it('pins a recommended offer without hiding alternatives', () => {
    const parentSource = readFileSync(resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'), 'utf8');
    expect(parentSource).toContain('function pickRecommendedRate<T extends Pick<HotelRateOption, \'offerId\' | \'roomId\' | \'amount\'>>(rates: T[]): T | null {');

    expect(source).toContain('recommendedRateKey: string | null;');
    expect(roomSectionSource).toContain('const isRecommended = recommendedRateKey === rateKey;');
    expect(roomSectionSource).toContain('Recommended value');
    expect(roomSectionSource).toContain('Choose recommended');
    expect(roomSectionSource).toContain('We surface the clearest offer first, then keep the rest visible in the same booking flow.');
  });
});
