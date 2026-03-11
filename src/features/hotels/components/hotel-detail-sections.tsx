'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/shared/lib/utils';
import type { HotelDetails } from '@/server/liteapi';
import type { HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';

type CancellationCopy = {
  status: string;
  detail: string;
};

type HotelDetailSectionsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPartialDetail: boolean;
  hotel: HotelDetails | null;
  mapUrl: string | null;
  amenities: string[];
  policies: HotelDetails['policies'] | undefined;
  locationContext: HotelDetails['locationContext'] | undefined;
  rates: HotelRateWithCancellationContext[];
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  selectedRate: HotelRateWithCancellationContext | null;
  setSelectedRateKey: (key: string) => void;
  buildRateKey: (rate: Pick<HotelRateWithCancellationContext, 'offerId' | 'roomId'>) => string;
  getCancellationCopy: (rate: HotelRateWithCancellationContext) => CancellationCopy;
  formatMoney: (currency: string, amount: number | null, compact?: boolean) => string;
  reviewBreakdown: NonNullable<HotelDetails['reviewBreakdown']>;
  reviews: NonNullable<HotelDetails['reviews']>;
  prosAndCons: HotelDetails['prosAndCons'] | undefined;
  question: string;
  setQuestion: (value: string) => void;
  askLoading: boolean;
  askAnswer: string;
  askHotelAI: (question?: string) => Promise<void>;
};

export function HotelDetailSections({
  activeTab,
  setActiveTab,
  isPartialDetail,
  hotel,
  mapUrl,
  amenities,
  policies,
  locationContext,
  rates,
  checkin,
  checkout,
  adults,
  rooms,
  selectedRate,
  setSelectedRateKey,
  buildRateKey,
  getCancellationCopy,
  formatMoney,
  reviewBreakdown,
  reviews,
  prosAndCons,
  question,
  setQuestion,
  askLoading,
  askAnswer,
  askHotelAI
}: HotelDetailSectionsProps) {
  const reviewRailRef = useRef<HTMLDivElement | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState<'top' | 'newest' | 'oldest'>('top');

  function parseReviewDate(value: string | null): number {
    if (!value) return 0;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.getTime() : 0;
  }

  function formatReviewDate(value: string | null): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }

  const travelersQuestions = [
    {
      q: 'What are check-in and check-out times?',
      a: policies?.checkInFrom || policies?.checkOutUntil
        ? `Check-in: ${policies?.checkInFrom ?? 'not provided'} to ${policies?.checkInUntil ?? 'not provided'}. Check-out: ${policies?.checkOutFrom ?? 'not provided'} to ${policies?.checkOutUntil ?? 'not provided'}.`
        : 'Check-in and check-out times are not fully provided by the supplier yet.'
    },
    {
      q: 'Is this stay refundable?',
      a: selectedRate
        ? `${getCancellationCopy(selectedRate).status}. ${getCancellationCopy(selectedRate).detail}`
        : 'Select a room to view cancellation policy and refund rules.'
    },
    {
      q: 'Are there nearby places to visit?',
      a: locationContext?.nearbyLandmarks?.length
        ? `Nearby: ${locationContext.nearbyLandmarks.slice(0, 4).join(', ')}.`
        : 'Nearby landmark information is currently unavailable from the supplier.'
    },
    {
      q: 'What amenities are available?',
      a: amenities.length > 0
        ? `Popular amenities include ${amenities.slice(0, 6).join(', ')}.`
        : 'Amenities list is currently unavailable from the supplier.'
    }
  ];
  const areaInfo = hotel?.areaInfo ?? [];
  const nearbyRestaurants = hotel?.nearbyRestaurants ?? [];
  const facilityCategories = hotel?.facilityCategories ?? [];
  const houseRulesDetailed = hotel?.houseRulesDetailed ?? [];
  const smartHighlights = hotel?.smartHighlights ?? [];
  const reviewHighlights = hotel?.reviewHighlights;
  const descriptionNarrative = hotel?.descriptionNarrative;
  const sortedReviews = useMemo(() => {
    const items = [...reviews];
    if (reviewSort === 'newest') {
      items.sort((a, b) => parseReviewDate(b.createdAt) - parseReviewDate(a.createdAt));
      return items;
    }
    if (reviewSort === 'oldest') {
      items.sort((a, b) => parseReviewDate(a.createdAt) - parseReviewDate(b.createdAt));
      return items;
    }

    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return items;
  }, [reviewSort, reviews]);
  const visibleReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 3);
  const groupedRates = useMemo(() => {
    const groups = new Map<string, {
      roomId: string;
      roomName: string;
      imageUrl: string | null;
      offers: HotelRateWithCancellationContext[];
    }>();

    for (const rate of rates) {
      const existing = groups.get(rate.roomId);
      if (existing) {
        existing.offers.push(rate);
        if (!existing.imageUrl && rate.imageUrl) {
          existing.imageUrl = rate.imageUrl;
        }
        continue;
      }

      groups.set(rate.roomId, {
        roomId: rate.roomId,
        roomName: rate.roomName,
        imageUrl: rate.imageUrl ?? null,
        offers: [rate]
      });
    }

    return Array.from(groups.values());
  }, [rates]);
  const popularFacilityHighlights = amenities.slice(0, 12);
  const surroundings = locationContext?.nearbyLandmarks?.length
    ? locationContext.nearbyLandmarks
    : [
      `City center access in ${hotel?.city ?? 'the area'}`,
      'Shops and convenience stores nearby',
      'Taxi pick-up points around the property',
      'Dining options in walking or short-drive distance'
    ];
  const languageCandidates = [
    ...amenities,
    ...(policies?.extra ?? []),
    ...(policies?.children ?? [])
  ].join(' ').toLowerCase();
  const languagesSpoken = [
    languageCandidates.includes('arabic') ? 'Arabic' : null,
    languageCandidates.includes('hindi') ? 'Hindi' : null,
    languageCandidates.includes('english') ? 'English' : 'English',
    languageCandidates.includes('french') ? 'French' : null,
    languageCandidates.includes('russian') ? 'Russian' : null
  ].filter((item): item is string => Boolean(item));

  return (
    <div className="space-y-12 pb-24">
      <section id="overview" className="scroll-mt-24 space-y-6" onMouseEnter={() => setActiveTab('overview')}>
        <h2 className="font-heading text-3xl font-semibold">Smart Highlights</h2>
        {isPartialDetail ? (
          <p className="rounded-[24px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {hotel?.completeness?.message ?? 'Some supplier details are currently unavailable for this property.'}
          </p>
        ) : null}
        {smartHighlights.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {smartHighlights.map((highlight) => (
              <li key={`${highlight.source}-${highlight.title}`} className="rounded-[24px] border border-border/70 bg-card p-6 shadow-premium-sm transition-colors hover:bg-secondary/40">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{highlight.source}</p>
                <p className="mt-2 font-semibold text-foreground">{highlight.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{highlight.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Smart highlights are currently unavailable because supplier detail signals are limited for this property.
          </p>
        )}
        {mapUrl ? (
          <div className="mt-8 overflow-hidden rounded-[28px] border border-border/70 bg-muted shadow-premium-sm">
            <iframe title="Hotel map" src={mapUrl} className="h-[400px] w-full" loading="lazy" />
          </div>
        ) : (
          <p className="rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Exact map coordinates are not available from the supplier for this property.
          </p>
        )}
      </section>

      <section id="amenities" className="scroll-mt-24 space-y-6" onMouseEnter={() => setActiveTab('amenities')}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Amenities</h2>
          <span className="text-xs text-muted-foreground">Supplier-backed data</span>
        </div>
        {amenities.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {amenities.map((facility) => (
              <p key={facility} className="rounded-[20px] border border-border/70 bg-secondary/45 px-3 py-2 text-sm">
                {facility}
              </p>
            ))}
          </div>
        ) : (
          <p className="rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Amenities data is currently unavailable from the supplier for this property.
          </p>
        )}
      </section>

      <section id="policies" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('policies')}>
        <h2 className="text-xl font-semibold">Policies</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <p className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">
            Check-in: {policies?.checkInFrom || policies?.checkInUntil ? `${policies.checkInFrom ?? 'Unknown'} - ${policies.checkInUntil ?? 'Unknown'}` : 'Not provided by supplier'}
          </p>
          <p className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">
            Check-out: {policies?.checkOutFrom || policies?.checkOutUntil ? `${policies.checkOutFrom ?? 'Unknown'} - ${policies.checkOutUntil ?? 'Unknown'}` : 'Not provided by supplier'}
          </p>
        </div>
        {policies && policies.cancellation.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {policies.cancellation.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Cancellation policy details are currently unavailable from the supplier.
          </p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-[20px] border border-border/70 bg-secondary/45 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Payment policies</p>
            <p className="mt-2 text-muted-foreground">{policies?.payment?.length ? policies.payment.join(' ') : 'Not provided by supplier'}</p>
          </article>
          <article className="rounded-[20px] border border-border/70 bg-secondary/45 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Additional notes</p>
            <p className="mt-2 text-muted-foreground">{policies?.extra?.length ? policies.extra.join(' ') : 'No additional policy notes provided.'}</p>
          </article>
        </div>
      </section>

      <section id="location" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('location')}>
        <h2 className="text-xl font-semibold">Location context</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {locationContext?.addressLine ?? 'Address details are currently unavailable from the supplier.'}
        </p>
        {locationContext?.nearbyLandmarks?.length ? (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nearby landmarks</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {locationContext.nearbyLandmarks.map((landmark) => (
                <span key={landmark} className="rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-xs">{landmark}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-[20px] border border-border/70 bg-secondary/45 p-3 text-sm text-muted-foreground">
            Nearby landmark context is currently unavailable from the supplier.
          </p>
        )}
      </section>

      <section id="area-info" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('area-info')}>
        <h2 className="text-xl font-semibold">Hotel area info</h2>
        {areaInfo.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {areaInfo.map((item) => (
              <article key={`${item.label}-${item.value}`} className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm text-foreground">{item.value}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Area context details are currently unavailable from the supplier.
          </p>
        )}
      </section>

      <section id="restaurants" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('restaurants')}>
        <h2 className="text-xl font-semibold">Restaurants</h2>
        {nearbyRestaurants.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {nearbyRestaurants.map((restaurant) => (
              <article key={restaurant.name} className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">
                <p className="text-sm font-semibold text-foreground">{restaurant.name}</p>
                {restaurant.cuisine ? <p className="mt-1 text-xs text-muted-foreground">Cuisine: {restaurant.cuisine}</p> : null}
                {restaurant.description ? <p className="mt-1 text-sm text-muted-foreground">{restaurant.description}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Nearby restaurant details are currently unavailable from the supplier.
          </p>
        )}
      </section>

      <section id="surroundings" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('surroundings')}>
        <h2 className="text-xl font-semibold">Property surroundings</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {surroundings.slice(0, 8).map((item, index) => (
            <article key={`${item}-${index}`} className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">
              <p className="text-sm text-foreground">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="rooms" className="scroll-mt-24 space-y-6" onMouseEnter={() => setActiveTab('rooms')}>
        <h2 className="font-heading text-3xl font-semibold">Choose your room</h2>
        <div className="border-b border-border pb-4">
          <p className="text-sm font-medium text-foreground">
            {checkin} to {checkout}
          </p>
          <p className="text-sm text-muted-foreground">
            {adults} adults · {rooms} room{rooms > 1 ? 's' : ''}
          </p>
        </div>
        <article className="rounded-[24px] border border-border/70 bg-card/70 p-4 shadow-premium-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Availability snapshot</p>
          <p className="mt-2 text-sm text-foreground">{rates.length} room options found for your selected dates.</p>
          <p className="mt-1 text-sm text-muted-foreground">Final cancellation and payment terms depend on the selected room and fare conditions.</p>
        </article>
        {groupedRates.length === 0 ? (
          <p className="rounded-xl border border-border bg-background/70 p-4 text-sm">No rates found for selected dates.</p>
        ) : (
          groupedRates.map((group) => {
            return (
              <article key={group.roomId} className="space-y-4 rounded-xl border border-border bg-card/70 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  {group.imageUrl ? (
                    <div className="relative h-32 w-full overflow-hidden rounded-lg md:w-48">
                      <Image
                        src={group.imageUrl}
                        alt={group.roomName}
                        fill
                        sizes="(max-width: 768px) 100vw, 192px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground">{group.roomName}</h3>
                    <p className="text-xs text-muted-foreground">{group.offers.length} offer{group.offers.length > 1 ? 's' : ''} for this room type</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.offers.map((rate) => {
                    const isSelected = selectedRate ? buildRateKey(selectedRate) === buildRateKey(rate) : false;
                    const cancellationCopy = getCancellationCopy(rate);

                    return (
                      <div
                        key={`${rate.offerId}-${rate.roomId}`}
                        className={cn(
                          'flex flex-col justify-between gap-4 border p-4 transition-colors md:flex-row md:items-center',
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/20'
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex w-fit items-center gap-1 border border-green-200 bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                              ✓ {rate.refundableTag}
                            </span>
                            <span className="inline-flex w-fit items-center gap-1 border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                              ☕ {rate.boardName}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-foreground">{cancellationCopy.status}</p>
                          <p className="text-xs text-muted-foreground">{cancellationCopy.detail}</p>
                        </div>

                        <div className="flex min-w-[220px] flex-col gap-3 md:items-end">
                          <div className="w-full text-left md:text-right">
                            <p className="text-2xl font-bold text-foreground">{formatMoney(rate.currency, rate.amount)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Includes taxes and charges</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedRateKey(buildRateKey(rate))}
                            className={cn(
                              'w-full rounded-none px-6 py-2 text-sm font-bold transition-all md:w-auto',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-border bg-background text-foreground hover:bg-muted'
                            )}
                          >
                            {isSelected ? 'Selected offer' : 'Select offer'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        )}
      </section>

      <section id="reviews" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('reviews')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-bold text-foreground">Guest reviews</h2>
          <a href="#rooms" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-premium-sm hover:bg-primary/95">See availability</a>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-[14px] bg-accent px-3 py-1.5 text-base font-bold text-white">{(hotel?.reviewScore ?? 0).toFixed(1)}</span>
          <p className="text-lg font-semibold text-foreground">
            {hotel?.reviewScore ? (hotel.reviewScore >= 9 ? 'Excellent' : hotel.reviewScore >= 8 ? 'Very good' : 'Good') : 'Verified'}
            <span className="font-normal text-muted-foreground"> · {hotel?.reviewCount ? Math.round(hotel.reviewCount).toLocaleString() : reviews.length.toLocaleString()} reviews</span>
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Showing {visibleReviews.length} of {reviews.length} fetched review{reviews.length === 1 ? '' : 's'}
          {typeof hotel?.reviewCount === 'number' && hotel.reviewCount > reviews.length
            ? ` (supplier returned ${reviews.length} of ${Math.round(hotel.reviewCount)} total).`
            : '.'}
        </p>

        {reviewHighlights && !reviewHighlights.lowSignal && (reviewHighlights.positiveTopics.length > 0 || reviewHighlights.tradeoffTopics.length > 0) ? (
          <div className="mt-5 space-y-4 rounded-[24px] border border-border/70 bg-secondary/45 p-4">
            <div className="flex flex-wrap gap-2">
              {[...reviewHighlights.positiveTopics, ...reviewHighlights.tradeoffTopics].slice(0, 8).map((topic) => (
                <span key={`topic-${topic.label}`} className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-foreground">
                  {topic.label} ({topic.mentions})
                </span>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-emerald-800">Loved by guests</p>
                {reviewHighlights.positiveTopics.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                    {reviewHighlights.positiveTopics.slice(0, 4).map((topic) => (
                      <li key={`positive-${topic.label}`}>{topic.label} mentioned in {topic.mentions} reviews</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-emerald-900">No recurring positive themes met the stability threshold yet.</p>
                )}
              </article>
              <article className="rounded-[20px] border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-amber-900">Consider before booking</p>
                {reviewHighlights.tradeoffTopics.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {reviewHighlights.tradeoffTopics.slice(0, 4).map((topic) => (
                      <li key={`tradeoff-${topic.label}`}>{topic.label} mentioned in {topic.mentions} reviews</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-amber-900">No recurring trade-offs met the stability threshold yet.</p>
                )}
              </article>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            {reviewHighlights?.message ?? 'Not enough verified review volume to generate stable topic highlights yet.'}
          </p>
        )}

        {reviewBreakdown.length > 0 && (
          <>
            <p className="mt-6 text-lg font-semibold text-foreground">Categories</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reviewBreakdown.map((item) => (
                <div key={item.label} className="text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="font-semibold text-foreground">{item.score.toFixed(1)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, (item.score / 10) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {reviews.length > 0 && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-semibold text-foreground">See what guests loved the most</p>
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="review-sort" className="text-muted-foreground">Sort by</label>
                <select
                  id="review-sort"
                  className="rounded-full border border-border/80 bg-card px-3 py-1.5 text-foreground"
                  value={reviewSort}
                  onChange={(event) => {
                    setReviewSort(event.target.value as 'top' | 'newest' | 'oldest');
                  }}
                >
                  <option value="top">Top rated</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                {!showAllReviews && visibleReviews.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        reviewRailRef.current?.scrollBy({ left: -360, behavior: 'smooth' });
                      }}
                      className="rounded-full border border-border/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        reviewRailRef.current?.scrollBy({ left: 360, behavior: 'smooth' });
                      }}
                      className="rounded-full border border-border/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      Next
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div
              ref={reviewRailRef}
              className={cn(
                'mt-3 gap-3',
                showAllReviews
                  ? 'grid md:grid-cols-2 xl:grid-cols-3'
                  : 'flex overflow-x-auto pb-2'
              )}
            >
              {visibleReviews.map((review, index) => (
                <article
                  key={`${review.author ?? 'guest'}-${index}`}
                  className={cn(
                    'rounded-[24px] border border-border/70 bg-card p-4 shadow-premium-sm',
                    showAllReviews ? '' : 'min-w-[320px] max-w-[360px] shrink-0'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                      {(review.author ?? 'G').charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{review.author ?? 'Guest'}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.travelerType ?? 'Traveler'}
                        {typeof review.score === 'number' ? ` · ${review.score.toFixed(1)}` : ''}
                        {formatReviewDate(review.createdAt) ? ` · ${formatReviewDate(review.createdAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">{review.comment}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {reviews.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((previous) => !previous)}
                  className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
                >
                  {showAllReviews ? 'Show top reviews only' : `View all reviews (${reviews.length})`}
                </button>
              ) : null}
            </div>
          </>
        )}

        {reviews.length === 0 ? (
          <p className="mt-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Detailed guest comments are currently unavailable from the supplier.
          </p>
        ) : null}
      </section>

      <section id="travelers-asking" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('travelers-asking')}>
        <h2 className="text-xl font-semibold">Travelers are asking</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {travelersQuestions.map((item) => (
            <article key={item.q} className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
              <p className="text-sm font-semibold text-foreground">{item.q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pros-cons" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('pros-cons')}>
        <h2 className="text-xl font-semibold">Pros and cons</h2>
        {prosAndCons && (prosAndCons.pros.length > 0 || prosAndCons.cons.length > 0) ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pros</p>
              {prosAndCons.pros.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {prosAndCons.pros.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-[20px] border border-border/70 bg-secondary/45 p-3 text-sm text-muted-foreground">
                  Positive highlights are currently unavailable from supplier reviews.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cons</p>
              {prosAndCons.cons.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {prosAndCons.cons.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-[20px] border border-border/70 bg-secondary/45 p-3">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-[20px] border border-border/70 bg-secondary/45 p-3 text-sm text-muted-foreground">
                  Trade-off details are currently unavailable from supplier reviews.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Pros and cons summaries are currently unavailable from supplier reviews.
          </p>
        )}
      </section>

      <section id="description" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('description')}>
        <h2 className="text-xl font-semibold">Property description</h2>
        {descriptionNarrative && descriptionNarrative.sections.length > 0 ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {descriptionNarrative.sections.map((section, index) => (
              <article key={`${section.title}-${index}`} className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{section.source}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{section.title}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            {descriptionNarrative?.message ?? 'Property description is currently unavailable.'}
          </p>
        )}
      </section>

      <section id="facilities-detail" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('facilities-detail')}>
        <h2 className="text-xl font-semibold">Facilities of this property</h2>
        {popularFacilityHighlights.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {popularFacilityHighlights.map((item) => (
              <span key={item} className="rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-xs text-foreground">
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {facilityCategories.length > 0 ? (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {facilityCategories.map((category) => (
              <article key={category.category} className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
                <p className="text-sm font-semibold text-foreground">{category.category}</p>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {category.items.slice(0, 16).map((item) => (
                    <li key={`${category.category}-${item}`}>• {item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-[24px] border border-border/70 bg-secondary/45 p-4 text-sm text-muted-foreground">
            Detailed facilities categories are currently unavailable from the supplier.
          </p>
        )}
      </section>

      <section id="languages" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('languages')}>
        <h2 className="text-xl font-semibold">Languages spoken</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {languagesSpoken.map((language) => (
            <span key={language} className="rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-sm text-foreground">
              {language}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Language data from supplier feeds can be partial; English support is commonly available for international bookings.
        </p>
      </section>

      <section id="house-rules" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('house-rules')}>
        <h2 className="text-xl font-semibold">House rules</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Check-in window</p>
            <p className="mt-2 text-sm text-foreground">
              {policies?.checkInFrom || policies?.checkInUntil
                ? `${policies?.checkInFrom ?? 'Unknown'} - ${policies?.checkInUntil ?? 'Unknown'}`
                : 'Not provided by supplier'}
            </p>
          </article>
          <article className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Check-out window</p>
            <p className="mt-2 text-sm text-foreground">
              {policies?.checkOutFrom || policies?.checkOutUntil
                ? `${policies?.checkOutFrom ?? 'Unknown'} - ${policies?.checkOutUntil ?? 'Unknown'}`
                : 'Not provided by supplier'}
            </p>
          </article>
          <article className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Children policy</p>
            <p className="mt-2 text-sm text-foreground">
              {policies?.children?.length ? policies.children.join(' ') : 'Children policy details are currently unavailable.'}
            </p>
          </article>
          <article className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pet policy</p>
            <p className="mt-2 text-sm text-foreground">
              {policies?.pets?.length ? policies.pets.join(' ') : 'Pet policy details are currently unavailable.'}
            </p>
          </article>
        </div>
        {houseRulesDetailed.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {houseRulesDetailed.map((rule) => (
              <article key={`${rule.title}-${rule.detail}`} className="rounded-[20px] border border-border/70 bg-secondary/45 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{rule.title}</p>
                <p className="mt-2 text-sm text-foreground">{rule.detail}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section id="ask-ai" className="rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-premium-sm" onMouseEnter={() => setActiveTab('ask-ai')}>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ask AI · Beta</p>
        <h2 className="mt-2 text-xl font-semibold">Ask about this hotel</h2>
        <p className="mt-1 text-sm text-muted-foreground">Get quick answers about facilities, policies, and stay details.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Does this property have parking?', 'Is breakfast included?', 'What are check-in/check-out times?'].map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-full border border-border/70 bg-secondary/45 px-3 py-1.5 text-xs"
              onClick={() => {
                setQuestion(preset);
                void askHotelAI(preset);
              }}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-[20px] border border-border/70 bg-secondary/45 px-3 py-2 text-sm"
            placeholder="Ask anything..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-premium-sm disabled:opacity-60"
            onClick={() => {
              void askHotelAI();
            }}
            disabled={askLoading}
          >
            {askLoading ? 'Asking...' : 'Ask'}
          </button>
        </div>
        {askAnswer ? <p className="mt-3 rounded-[20px] border border-border/70 bg-secondary/45 p-3 text-sm">{askAnswer}</p> : null}
      </section>
    </div>
  );
}
