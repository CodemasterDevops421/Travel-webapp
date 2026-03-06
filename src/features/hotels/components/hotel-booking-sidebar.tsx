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
      <div className="overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)]">
        <div className="border-b border-border/60 bg-muted/25 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected stay</p>
              <p className="mt-1 text-[2rem] font-bold leading-none text-foreground">{formatMoney(selectedRate?.currency ?? currency, selectedRate?.amount ?? lowestRate, true)}</p>
              <p className="mt-1 text-xs text-muted-foreground">per night, taxes and fees included</p>
            </div>
            <div className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {adults} adults
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {selectedRate ? (
            <div className="rounded-2xl border border-border bg-background p-3.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Selected room</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{selectedRate.roomName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{selectedRate.boardName}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Booking clarity</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{selectedCancellation?.status ?? 'Select a room to view policy'}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedCancellation?.detail ?? 'Cancellation details will follow the selected room.'}</p>
          </div>

          {selectedBookingHref ? (
            <PreferenceLink href={selectedBookingHref} className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_-18px_rgba(37,99,235,0.85)] transition-all hover:bg-primary/90 hover:shadow-[0_18px_32px_-18px_rgba(37,99,235,0.95)]">
              Reserve selected room
            </PreferenceLink>
          ) : (
            <a href="#rooms" className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_-18px_rgba(37,99,235,0.85)] transition-all hover:bg-primary/90 hover:shadow-[0_18px_32px_-18px_rgba(37,99,235,0.95)]">
              See availability
            </a>
          )}

          <div className="rounded-2xl border border-border bg-background p-3.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Stay facts</p>
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
            <div className="mt-3 h-px bg-border" />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              You will receive confirmation details immediately after payment completes and the selected room is finalized.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
