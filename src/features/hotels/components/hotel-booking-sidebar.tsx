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
      <div className="rounded-2xl border border-border bg-card p-6 shadow-editorial-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected stay</p>
        <p className="mt-2 text-4xl font-bold text-foreground">{formatMoney(selectedRate?.currency ?? currency, selectedRate?.amount ?? lowestRate, true)}</p>
        <p className="mt-1 text-xs text-muted-foreground">per night, taxes and charges included</p>

        {selectedRate ? (
          <div className="mt-4 rounded-xl border border-border bg-background/70 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected room</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedRate.roomName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedRate.boardName}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Check-in</span>
            <span className="font-semibold text-foreground">{checkin}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Check-out</span>
            <span className="font-semibold text-foreground">{checkout}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Guests</span>
            <span className="font-semibold text-foreground">{adults} adults</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-800">Booking clarity</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{selectedCancellation?.status ?? 'Select a room to view policy'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{selectedCancellation?.detail ?? 'Cancellation details will follow the selected room.'}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Taxes and charges are already included in the price shown here. Your final confirmation will use the selected rate and policy shown before payment.
          </p>
        </div>

        {selectedBookingHref ? (
          <PreferenceLink href={selectedBookingHref} className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg">
            Reserve selected room
          </PreferenceLink>
        ) : (
          <a href="#rooms" className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg">
            See availability
          </a>
        )}

        <div className="mt-6 rounded-xl border border-border bg-background/70 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">After booking</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You will receive confirmation details immediately after payment completes and the selected room is finalized.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-background/70 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stay details</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selectedRate?.roomName ?? 'Select a room to view stay details'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check-in {checkin} · Check-out {checkout} · {adults} adults
          </p>
        </div>
      </div>
    </aside>
  );
}
