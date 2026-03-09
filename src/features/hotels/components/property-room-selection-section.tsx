'use client';

import Image from 'next/image';
import { CheckCircle2, Coffee, Sparkles, Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';

type CancellationCopy = {
  status: string;
  detail: string;
};

type GroupedRate = {
  roomId: string;
  roomName: string;
  imageUrl: string | null;
  offers: HotelRateWithCancellationContext[];
};

type PropertyRoomSelectionSectionProps = {
  groupedRates: GroupedRate[];
  ratesCount: number;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  selectedRate: HotelRateWithCancellationContext | null;
  recommendedRateKey: string | null;
  buildRateKey: (rate: Pick<HotelRateWithCancellationContext, 'offerId' | 'roomId'>) => string;
  setSelectedRateKey: (key: string) => void;
  getCancellationCopy: (rate: HotelRateWithCancellationContext) => CancellationCopy;
  formatMoney: (currency: string, amount: number | null, compact?: boolean) => string;
  onActivate: () => void;
};

export function PropertyRoomSelectionSection({
  groupedRates,
  ratesCount,
  checkin,
  checkout,
  adults,
  rooms,
  selectedRate,
  recommendedRateKey,
  buildRateKey,
  setSelectedRateKey,
  getCancellationCopy,
  formatMoney,
  onActivate
}: PropertyRoomSelectionSectionProps) {
  return (
    <section id="rooms" className="surface-shell scroll-mt-24 space-y-4 p-3.5 md:p-4" onMouseEnter={onActivate}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Choose your room</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {checkin} to {checkout} · {adults} adults · {rooms} room{rooms > 1 ? 's' : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            We surface the clearest offer first, then keep the rest visible in the same booking flow.
          </p>
        </div>
        <div className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
          {ratesCount} offer{ratesCount === 1 ? '' : 's'} found
        </div>
      </div>

      {groupedRates.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background/70 p-4 text-sm">No rates found for selected dates.</p>
      ) : (
        <div className="space-y-4">
          {groupedRates.map((group) => (
            <article key={group.roomId} className="overflow-hidden rounded-[18px] border border-border/70 bg-card">
              <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
                {group.imageUrl ? (
                  <div className="relative h-48 w-full overflow-hidden rounded-[14px] md:h-44 md:w-[220px] md:shrink-0">
                    <Image
                      src={group.imageUrl}
                      alt={group.roomName}
                      fill
                      sizes="(max-width: 768px) 100vw, 220px"
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute bottom-3 left-3 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      Room preview
                    </div>
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold leading-6 text-foreground">{group.roomName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {group.offers.length} offer{group.offers.length > 1 ? 's' : ''} for this room type
                      </p>
                    </div>
                    {group.offers.some((rate) => buildRateKey(rate) === recommendedRateKey) ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommended
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 divide-y divide-border/70 rounded-[16px] border border-border/70 bg-background/70">
                    {group.offers.map((rate) => {
                      const rateKey = buildRateKey(rate);
                      const isSelected = selectedRate ? buildRateKey(selectedRate) === rateKey : false;
                      const isRecommended = recommendedRateKey === rateKey;
                      const cancellationCopy = getCancellationCopy(rate);

                      return (
                        <div
                          key={`${rate.offerId}-${rate.roomId}`}
                          className={cn(
                            'flex flex-col gap-4 p-4 transition-colors md:grid md:grid-cols-[minmax(0,1fr),180px] md:items-center',
                            isSelected ? 'bg-primary/[0.05]' : '',
                            isRecommended && !isSelected ? 'bg-primary/[0.03]' : ''
                          )}
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {isRecommended ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Recommended value
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground">
                                <Coffee className="h-3.5 w-3.5" />
                                {rate.boardName}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {cancellationCopy.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm font-semibold leading-5 text-foreground">{rate.roomName}</p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {adults} guests
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Coffee className="h-3.5 w-3.5" />
                                  {rate.boardName}
                                </span>
                              </div>
                              <p className="text-xs leading-5 text-muted-foreground">{cancellationCopy.detail}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 md:items-end">
                            <div className="space-y-1 md:text-right">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total stay rate</p>
                              <p className="text-[1.55rem] font-bold leading-none text-foreground">
                                {formatMoney(rate.currency, rate.amount, true)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">1 room · taxes & fees included</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedRateKey(rateKey)}
                              className={cn(
                                'inline-flex w-full items-center justify-center rounded-full px-4.5 py-2.5 text-sm font-semibold transition-all md:w-[170px]',
                                isSelected
                                  ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_-16px_rgba(37,99,235,0.85)]'
                                  : 'border border-border bg-card text-foreground hover:border-primary/40 hover:text-primary'
                              )}
                            >
                              {isSelected ? 'Selected room' : isRecommended ? 'Choose recommended' : 'Choose room'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
