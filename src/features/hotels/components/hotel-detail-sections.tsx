'use client';

import { useMemo, useState } from 'react';
import { MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import type { HotelDetails } from '@/server/liteapi';
import type { HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';
import { PropertyRoomSelectionSection } from '@/features/hotels/components/property-room-selection-section';
import { PropertyGuestReviewsSection } from '@/features/hotels/components/property-guest-reviews-section';

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
  recommendedRateKey: string | null;
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
  recommendedRateKey,
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
  const visibleReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 6);

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

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        offers: [...group.offers].sort((left, right) => {
          const leftIsRecommended = buildRateKey(left) === recommendedRateKey;
          const rightIsRecommended = buildRateKey(right) === recommendedRateKey;
          if (leftIsRecommended && !rightIsRecommended) return -1;
          if (rightIsRecommended && !leftIsRecommended) return 1;
          if (left.amount !== right.amount) return left.amount - right.amount;
          return buildRateKey(left).localeCompare(buildRateKey(right));
        })
      }))
      .sort((left, right) => {
        const leftHasRecommended = left.offers.some((rate) => buildRateKey(rate) === recommendedRateKey);
        const rightHasRecommended = right.offers.some((rate) => buildRateKey(rate) === recommendedRateKey);
        if (leftHasRecommended && !rightHasRecommended) return -1;
        if (rightHasRecommended && !leftHasRecommended) return 1;
        return Math.min(...left.offers.map((rate) => rate.amount)) - Math.min(...right.offers.map((rate) => rate.amount));
      });
  }, [buildRateKey, rates, recommendedRateKey]);
  const popularFacilityHighlights = amenities.slice(0, 12);
  const overviewReviewMetrics = reviewBreakdown.slice(0, 4);
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
    <div className="page-section flex flex-col pb-16">
      <section id="overview" className="scroll-mt-24 space-y-3" onMouseEnter={() => setActiveTab('overview')}>
        {isPartialDetail ? (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {hotel?.completeness?.message ?? 'Some supplier details are currently unavailable for this property.'}
          </p>
        ) : null}
        {smartHighlights.length > 0 ? (
          <ul className="grid gap-2.5 lg:grid-cols-3">
            {smartHighlights.slice(0, 3).map((highlight) => (
              <li key={`${highlight.source}-${highlight.title}`} className="rounded-[16px] border border-border/70 bg-card px-3.5 py-3.5 shadow-[0_12px_28px_-28px_rgba(15,23,42,0.38)]">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 p-1.5 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{highlight.source}</p>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{highlight.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{highlight.detail}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
            Smart highlights are currently unavailable because supplier detail signals are limited for this property.
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
          <article className="surface-shell-subtle p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Popular facilities</h2>
                <p className="mt-1 text-sm text-muted-foreground">The most visible amenities guests check first.</p>
              </div>
              <a href="#amenities" className="text-xs font-semibold text-primary transition-colors hover:text-primary/80">See all</a>
            </div>
            {popularFacilityHighlights.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {popularFacilityHighlights.slice(0, 10).map((item) => (
                  <span key={item} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                Amenities data is currently unavailable from the supplier for this property.
              </p>
            )}
          </article>

          <article className="surface-shell-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Review snapshot</h2>
                <p className="mt-1 text-sm text-muted-foreground">Quick guest sentiment before you compare rooms.</p>
              </div>
              <a href="#reviews" className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Read reviews
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                {(hotel?.reviewScore ?? 0).toFixed(1)}
              </span>
              <p className="text-sm font-medium text-foreground">
                {hotel?.reviewScore ? (hotel.reviewScore >= 9 ? 'Excellent' : hotel.reviewScore >= 8 ? 'Very good' : 'Good') : 'Verified'}
                <span className="text-muted-foreground"> · {hotel?.reviewCount ? Math.round(hotel.reviewCount).toLocaleString() : reviews.length.toLocaleString()} reviews</span>
              </p>
            </div>

            {overviewReviewMetrics.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {overviewReviewMetrics.map((item) => {
                  const value = item.score ? Math.max(0, Math.min(10, item.score)) : 0;
                  return (
                    <div key={item.label} className="grid grid-cols-[92px,1fr,36px] items-center gap-3 text-sm">
                      <p className="text-foreground">{item.label}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
                      </div>
                      <p className="text-right text-muted-foreground">{value.toFixed(1)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                Detailed review category scores are currently unavailable from the supplier.
              </p>
            )}
          </article>
        </div>
      </section>

      <PropertyRoomSelectionSection
        groupedRates={groupedRates}
        ratesCount={rates.length}
        checkin={checkin}
        checkout={checkout}
        adults={adults}
        rooms={rooms}
        selectedRate={selectedRate}
        recommendedRateKey={recommendedRateKey}
        buildRateKey={buildRateKey}
        setSelectedRateKey={setSelectedRateKey}
        getCancellationCopy={getCancellationCopy}
        formatMoney={formatMoney}
        onActivate={() => setActiveTab('rooms')}
      />

      <section id="ask-ai" className="surface-shell scroll-mt-24 p-3.5 md:p-4" onMouseEnter={() => setActiveTab('rooms')}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Ask AI</p>
        <h2 className="mt-1 text-lg font-semibold">Ask about this hotel</h2>
        <p className="mt-1 text-sm text-muted-foreground">Get quick answers before selecting a room.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Does this property have parking?', 'Is breakfast included?', 'What are check-in/check-out times?'].map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
              onClick={() => {
                setQuestion(preset);
                void askHotelAI(preset);
              }}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Ask anything..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:self-auto"
            onClick={() => {
              void askHotelAI();
            }}
            disabled={askLoading}
          >
            {askLoading ? 'Asking...' : 'Ask'}
          </button>
        </div>
        {askAnswer ? <p className="mt-3 rounded-xl border border-border bg-background/70 p-3 text-sm">{askAnswer}</p> : null}
      </section>

      <PropertyGuestReviewsSection
        hotel={hotel ?? null}
        reviews={reviews}
        reviewBreakdown={reviewBreakdown}
        reviewHighlights={reviewHighlights}
        reviewSort={reviewSort}
        setReviewSort={setReviewSort}
        visibleReviews={visibleReviews}
        sortedReviewsCount={sortedReviews.length}
        showAllReviews={showAllReviews}
        setShowAllReviews={setShowAllReviews}
        formatReviewDate={formatReviewDate}
        onActivate={() => setActiveTab('reviews')}
      />

      <section id="amenities" className="surface-shell scroll-mt-24 p-3.5 md:p-4" onMouseEnter={() => setActiveTab('amenities')}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Amenities</h2>
          <span className="text-xs text-muted-foreground">Supplier-backed data</span>
        </div>
        {amenities.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {amenities.map((item) => (
              <span key={item} className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
            Amenities data is currently unavailable from the supplier for this property.
          </p>
        )}
      </section>

      <section id="policies" className="surface-shell scroll-mt-24 p-3.5 md:p-4" onMouseEnter={() => setActiveTab('policies')}>
        <h2 className="text-xl font-semibold">Policies</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <p className="rounded-xl border border-border bg-background p-3">
            Check-in: {policies?.checkInFrom || policies?.checkInUntil ? `${policies.checkInFrom ?? 'Unknown'} - ${policies.checkInUntil ?? 'Unknown'}` : 'Not provided by supplier'}
          </p>
          <p className="rounded-xl border border-border bg-background p-3">
            Check-out: {policies?.checkOutFrom || policies?.checkOutUntil ? `${policies.checkOutFrom ?? 'Unknown'} - ${policies.checkOutUntil ?? 'Unknown'}` : 'Not provided by supplier'}
          </p>
        </div>
        {policies && policies.cancellation.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {policies.cancellation.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-xl border border-border bg-background p-3">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
            Cancellation policy details are currently unavailable from the supplier.
          </p>
        )}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Payment policies</p>
            <p className="mt-2 text-muted-foreground">{policies?.payment?.length ? policies.payment.join(' ') : 'Not provided by supplier'}</p>
          </article>
          <article className="rounded-xl border border-border bg-background p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Additional notes</p>
            <p className="mt-2 text-muted-foreground">{policies?.extra?.length ? policies.extra.join(' ') : 'No additional policy notes provided.'}</p>
          </article>
        </div>
      </section>

      <section id="description" className="surface-shell p-3.5 md:p-4" onMouseEnter={() => setActiveTab('overview')}>
        <h2 className="text-xl font-semibold">More about this stay</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Location context</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {locationContext?.addressLine ?? 'Address details are currently unavailable from the supplier.'}
            </p>
            {locationContext?.nearbyLandmarks?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {locationContext.nearbyLandmarks.map((landmark) => (
                  <span key={landmark} className="rounded-full border border-border bg-card px-3 py-1 text-xs">{landmark}</span>
                ))}
              </div>
            ) : null}
            {mapUrl ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
                <iframe title="Hotel map" src={mapUrl} className="h-56 w-full" loading="lazy" />
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Practical details</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {languagesSpoken.map((language) => (
                <span key={language} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                  {language}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Children policy</p>
                <p className="mt-2 text-sm text-foreground">
                  {policies?.children?.length ? policies.children.join(' ') : 'Children policy details are currently unavailable.'}
                </p>
              </article>
              <article className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Pet policy</p>
                <p className="mt-2 text-sm text-foreground">
                  {policies?.pets?.length ? policies.pets.join(' ') : 'Pet policy details are currently unavailable.'}
                </p>
              </article>
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Property description</p>
            {descriptionNarrative && descriptionNarrative.sections.length > 0 ? (
              <div className="mt-3 space-y-3">
                {descriptionNarrative.sections.map((section, index) => (
                  <article key={`${section.title}-${index}`} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{section.source}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{section.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{section.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                {descriptionNarrative?.message ?? 'Property description is currently unavailable.'}
              </p>
            )}
          </article>

          <article className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Property area</p>
            {areaInfo.length > 0 ? (
              <div className="mt-3 grid gap-3">
                {areaInfo.map((item) => (
                  <article key={item.label} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-sm text-foreground">{item.value}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                Area insight data is currently unavailable from the supplier.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {surroundings.map((item) => (
                <span key={item} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Facilities of this property</p>
            {popularFacilityHighlights.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {popularFacilityHighlights.map((item) => (
                  <span key={item} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {facilityCategories.length > 0 ? (
              <div className="mt-3 grid gap-3">
                {facilityCategories.map((category) => (
                  <article key={category.category} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-sm font-semibold text-foreground">{category.category}</p>
                    <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                      {category.items.slice(0, 12).map((item) => (
                        <li key={`${category.category}-${item}`}>• {item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                Detailed facilities categories are currently unavailable from the supplier.
              </p>
            )}
          </article>

          <article className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">House rules and nearby dining</p>
            </div>
            {nearbyRestaurants.length > 0 ? (
              <div className="mt-3 grid gap-3">
                {nearbyRestaurants.slice(0, 3).map((restaurant) => (
                  <article key={`${restaurant.name}-${restaurant.cuisine}`} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-sm font-semibold text-foreground">{restaurant.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{restaurant.cuisine}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{restaurant.description}</p>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Check-in window</p>
                <p className="mt-2 text-sm text-foreground">
                  {policies?.checkInFrom || policies?.checkInUntil
                    ? `${policies?.checkInFrom ?? 'Unknown'} - ${policies?.checkInUntil ?? 'Unknown'}`
                    : 'Not provided by supplier'}
                </p>
              </article>
              <article className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Check-out window</p>
                <p className="mt-2 text-sm text-foreground">
                  {policies?.checkOutFrom || policies?.checkOutUntil
                    ? `${policies?.checkOutFrom ?? 'Unknown'} - ${policies?.checkOutUntil ?? 'Unknown'}`
                    : 'Not provided by supplier'}
                </p>
              </article>
            </div>
            {houseRulesDetailed.length > 0 ? (
              <div className="mt-3 grid gap-3">
                {houseRulesDetailed.map((rule) => (
                  <article key={`${rule.title}-${rule.detail}`} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{rule.title}</p>
                    <p className="mt-2 text-sm text-foreground">{rule.detail}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </article>
        </div>

        {prosAndCons && (prosAndCons.pros.length > 0 || prosAndCons.cons.length > 0) ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Pros</p>
              {prosAndCons.pros.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {prosAndCons.pros.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl border border-border bg-card p-3">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
                  Positive highlights are currently unavailable from supplier reviews.
                </p>
              )}
            </article>
            <article className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Cons</p>
              {prosAndCons.cons.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {prosAndCons.cons.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl border border-border bg-card p-3">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
                  Trade-off details are currently unavailable from supplier reviews.
                </p>
              )}
            </article>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
            Pros and cons summaries are currently unavailable from supplier reviews.
          </p>
        )}
      </section>
    </div>
  );
}
