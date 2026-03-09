'use client';

import { HotelBookingSidebar } from '@/features/hotels/components/hotel-booking-sidebar';
import type { HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';

type CancellationCopy = {
  status: string;
  detail: string;
};

type PropertyBookingRailProps = {
  checkin: string;
  checkout: string;
  adults: number;
  currency: string;
  lowestRate: number | null;
  selectedRate: HotelRateWithCancellationContext | null;
  selectedCancellation: CancellationCopy | null;
  selectedBookingHref: string | null;
  formatMoney: (currency: string, amount: number | null, compact?: boolean) => string;
};

export function PropertyBookingRail(props: PropertyBookingRailProps) {
  return (
    <div className="w-full">
      <HotelBookingSidebar {...props} />
    </div>
  );
}
