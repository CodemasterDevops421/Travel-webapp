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
  const nightlyRate = formatMoney(selectedRate?.currency ?? currency, selectedRate?.amount ?? lowestRate, true);

  return (
    <aside className="surface-shell overflow-hidden">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr),auto] md:items-center md:p-5">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected stay</p>
          <div className="flex flex-wrap items-end gap-2">
            <p className="text-[2rem] font-bold leading-none text-foreground">{nightlyRate}</p>
            <p className="pb-1 text-xs text-muted-foreground">per night, taxes and fees included</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-background px-2.5 py-1">{checkin}</span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1">to</span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1">{checkout}</span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1">{adults} adults</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-2">
          <div className="surface-shell-subtle px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Selected room</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-foreground">
              {selectedRate?.roomName ?? 'Choose a room below'}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {selectedRate?.boardName ?? 'Room and board details appear once you select an offer.'}
            </p>
          </div>
          <div className="rounded-[var(--surface-radius-sm)] border border-emerald-200/80 bg-emerald-50/70 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Booking clarity</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {selectedCancellation?.status ?? 'Select a room to view policy'}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {selectedCancellation?.detail ?? 'Cancellation details will follow the selected room.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          {selectedBookingHref ? (
            <PreferenceLink
              href={selectedBookingHref}
              className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 md:w-auto md:min-w-[178px]"
            >
              Reserve selected room
            </PreferenceLink>
          ) : (
            <a
              href="#rooms"
              className="flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 md:w-auto md:min-w-[178px]"
            >
              See availability
            </a>
          )}
          <p className="max-w-[240px] text-xs leading-5 text-muted-foreground md:text-right">
            Booking stays inline so you can compare rooms, cancellation details, and reviews before checkout.
          </p>
        </div>
      </div>
    </aside>
  );
}
