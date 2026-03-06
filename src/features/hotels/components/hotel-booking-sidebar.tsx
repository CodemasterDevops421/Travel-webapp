'use client';

import { PreferenceLink } from '@/components/navigation/preference-link';
import type { HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';

type CancellationCopy = {
  status: string;
  detail: string;
};

type HotelBookingSidebarProps = {
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

export function HotelBookingSidebar({
  checkin,
  checkout,
  adults,
  currency,
  lowestRate,
  selectedRate,
  selectedCancellation,
  selectedBookingHref,
  formatMoney
}: HotelBookingSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected stay</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{formatMoney(selectedRate?.currency ?? currency, selectedRate?.amount ?? lowestRate, true)}</p>
          <p className="text-xs text-muted-foreground">per night, taxes and fees included</p>
        </div>

        <div className="space-y-4 p-5">
          {selectedRate ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Selected room</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedRate.roomName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedRate.boardName}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Booking clarity</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{selectedCancellation?.status ?? 'Select a room to view policy'}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedCancellation?.detail ?? 'Cancellation details will follow the selected room.'}</p>
          </div>

          {selectedBookingHref ? (
            <PreferenceLink href={selectedBookingHref} className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Reserve selected room
            </PreferenceLink>
          ) : (
            <a href="#rooms" className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              See availability
            </a>
          )}

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Stay facts</p>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium text-foreground">{checkin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-medium text-foreground">{checkout}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium text-foreground">{adults} adults</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              You will receive confirmation details immediately after payment completes and the selected room is finalized.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
