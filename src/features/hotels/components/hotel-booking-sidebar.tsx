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
      <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)]">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.08] via-background to-background px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected stay</p>
          <p className="mt-2 text-4xl font-bold text-foreground">{formatMoney(selectedRate?.currency ?? currency, selectedRate?.amount ?? lowestRate, true)}</p>
          <p className="mt-1 text-xs text-muted-foreground">per night, taxes and charges included</p>
        </div>

        <div className="space-y-6 p-6">
          {selectedRate ? (
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected room</p>
              <p className="mt-1 text-base font-semibold text-foreground">{selectedRate.roomName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedRate.boardName}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stay facts</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-semibold text-foreground">{checkin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-semibold text-foreground">{checkout}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-semibold text-foreground">{adults} adults</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-800">Booking clarity</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{selectedCancellation?.status ?? 'Select a room to view policy'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedCancellation?.detail ?? 'Cancellation details will follow the selected room.'}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Taxes and charges are already included in the price shown here. Your final confirmation will use the selected rate and policy shown before payment.
            </p>
          </div>

          {selectedBookingHref ? (
            <PreferenceLink href={selectedBookingHref} className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg">
              Reserve selected room
            </PreferenceLink>
          ) : (
            <a href="#rooms" className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg">
              See availability
            </a>
          )}

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">After booking</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You will receive confirmation details immediately after payment completes and the selected room is finalized.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
