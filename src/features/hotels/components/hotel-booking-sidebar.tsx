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
      <div className="rounded-[32px] border border-border/70 bg-card p-6 shadow-premium-lg">
        <div className="mb-6 flex items-start gap-3 rounded-[20px] border border-[#F4B544]/25 bg-[#F4B544]/12 p-4">
          <span className="mt-0.5 flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#F4B544]"></span>
          <div>
            <p className="text-sm font-bold text-[#8A5A00]">In high demand</p>
            <p className="text-xs text-[#8A5A00]/80">Prices may increase soon.</p>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Price per night</p>
        <p className="mt-2 text-4xl font-bold text-foreground">{formatMoney(selectedRate?.currency ?? currency, selectedRate?.amount ?? lowestRate, true)}</p>

        {selectedRate ? (
          <div className="mt-4 rounded-[20px] border border-border/70 bg-secondary/50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected room</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedRate.roomName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedRate.boardName}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 border-t border-border/70 pt-5">
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

        <div className="mt-6 rounded-[20px] border border-border/70 bg-secondary/50 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cancellation</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selectedCancellation?.status ?? 'Select a room to view policy'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{selectedCancellation?.detail ?? 'Cancellation details will follow the selected room.'}</p>
        </div>

        {selectedBookingHref ? (
          <PreferenceLink href={selectedBookingHref} className="mt-8 flex w-full items-center justify-center rounded-full bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-premium-sm transition-all hover:bg-primary/95 hover:shadow-premium-md">
            Reserve selected room
          </PreferenceLink>
        ) : (
          <a href="#rooms" className="mt-8 flex w-full items-center justify-center rounded-full bg-primary px-4 py-4 text-base font-bold text-primary-foreground shadow-premium-sm transition-all hover:bg-primary/95 hover:shadow-premium-md">
            See availability
          </a>
        )}

        <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">✓ No booking fees</li>
          <li className="flex items-center gap-2">✓ Price match guarantee</li>
        </ul>
      </div>
    </aside>
  );
}
