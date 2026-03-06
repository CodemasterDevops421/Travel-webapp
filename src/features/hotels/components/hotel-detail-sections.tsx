'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, ChevronLeft, ChevronRight, Coffee, MapPin, ShieldCheck, Sparkles, Users } from 'lucide-react';
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
  const reviewRailRef = useRef<HTMLDivElement | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState<'top' | 'newest' | 'oldest'>('top');
  const [isReviewRailPaused, setIsReviewRailPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(mediaQuery.matches);
    onChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

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

  useEffect(() => {
    if (showAllReviews || prefersReducedMotion || isReviewRailPaused || visibleReviews.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const rail = reviewRailRef.current;
      if (!rail) return;

      const isAtEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 12;
      if (isAtEnd) {
        rail.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }

      rail.scrollBy({ left: 360, behavior: 'smooth' });
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, [isReviewRailPaused, prefersReducedMotion, showAllReviews, visibleReviews.length]);
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
    <div className="flex flex-col gap-5 pb-16">
      <section id="overview" className="scroll-mt-24 space-y-3" onMouseEnter={() => setActiveTab('overview')}>
        {isPartialDetail ? (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {hotel?.completeness?.message ?? 'Some supplier details are currently unavailable for this property.'}
          </p>
        ) : null}
        {smartHighlights.length > 0 ? (
          <ul className="grid gap-2.5 md:grid-cols-3">
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
      </section>

      <section id="rooms" className="scroll-mt-24 space-y-3.5" onMouseEnter={() => setActiveTab('rooms')}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Choose your room</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {checkin} to {checkout} · {adults} adults · {rooms} room{rooms > 1 ? 's' : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">We recommend the lowest-priced selectable offer first, but every available room option remains visible below.</p>
          </div>
          <div className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
            {rates.length} offer{rates.length === 1 ? '' : 's'} found
          </div>
        </div>
        {groupedRates.length === 0 ? (
          <p className="rounded-2xl border border-border bg-background/70 p-4 text-sm">No rates found for selected dates.</p>
        ) : (
          groupedRates.map((group) => (
            <article key={group.roomId} className="rounded-[18px] border border-border/60 bg-card shadow-[0_16px_34px_-34px_rgba(15,23,42,0.35)]">
              <div className="flex flex-col gap-3 p-3.5 md:flex-row md:items-start">
                {group.imageUrl ? (
                  <div className="relative h-40 w-full overflow-hidden rounded-[14px] md:w-[220px] md:flex-none">
                    <Image
                      src={group.imageUrl}
                      alt={group.roomName}
                      fill
                      sizes="(max-width: 768px) 100vw, 230px"
                      className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute bottom-3 left-3 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      Room preview
                    </div>
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold leading-6 text-foreground">{group.roomName}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{group.offers.length} offer{group.offers.length > 1 ? 's' : ''} for this room type</p>
                    </div>
                    {group.offers.some((rate) => buildRateKey(rate) === recommendedRateKey) ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommended
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2.5">
                    {group.offers.map((rate) => {
                      const isSelected = selectedRate ? buildRateKey(selectedRate) === buildRateKey(rate) : false;
                      const isRecommended = recommendedRateKey === buildRateKey(rate);
                      const cancellationCopy = getCancellationCopy(rate);

                      return (
                        <div
                          key={`${rate.offerId}-${rate.roomId}`}
                          className={cn(
                            'grid gap-3 rounded-[15px] border px-3.5 py-3 transition-all md:grid-cols-[minmax(0,1.2fr),170px,auto] md:items-center',
                            isSelected ? 'border-primary bg-primary/[0.05] shadow-[0_16px_34px_-28px_rgba(37,99,235,0.75)]' : 'border-border bg-background',
                            isRecommended && !isSelected ? 'border-primary/30' : ''
                          )}
                        >
                            <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {isRecommended ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Recommended value
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-foreground">
                                <Coffee className="h-3.5 w-3.5" />
                                {rate.boardName}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {cancellationCopy.status}
                              </span>
                            </div>
                            <p className="text-sm font-semibold leading-5 text-foreground">{rate.roomName}</p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {adults} guests</span>
                              <span>Room mapped: {rate.roomId}</span>
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">{cancellationCopy.detail}</p>
                          </div>

                          <div className="space-y-1 md:text-right">
                            <p className="text-[1.6rem] font-bold leading-none text-foreground">{formatMoney(rate.currency, rate.amount, true)}</p>
                            <p className="text-[11px] text-muted-foreground">1 room · taxes & fees included</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedRateKey(buildRateKey(rate))}
                            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_20px_-16px_rgba(37,99,235,0.85)] transition-all hover:bg-primary/90 hover:shadow-[0_14px_24px_-16px_rgba(37,99,235,0.95)] md:w-[168px]"
                          >
                            {isSelected ? 'Selected' : isRecommended ? 'Choose recommended offer' : 'Choose room'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <section id="ask-ai" className="rounded-[16px] border border-border/70 bg-card p-3.5 shadow-[0_12px_26px_-28px_rgba(15,23,42,0.32)]" onMouseEnter={() => setActiveTab('rooms')}>
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
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Ask anything..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
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

      <section id="reviews" className="scroll-mt-24 rounded-[16px] border border-border/70 bg-card p-3.5 shadow-[0_12px_26px_-28px_rgba(15,23,42,0.32)] md:p-4" onMouseEnter={() => setActiveTab('reviews')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Guest reviews</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">{(hotel?.reviewScore ?? 0).toFixed(1)}</span>
              <p className="text-sm font-medium text-foreground">
                {hotel?.reviewScore ? (hotel.reviewScore >= 9 ? 'Excellent' : hotel.reviewScore >= 8 ? 'Very good' : 'Good') : 'Verified'}
                <span className="text-muted-foreground"> · {hotel?.reviewCount ? Math.round(hotel.reviewCount).toLocaleString() : reviews.length.toLocaleString()} reviews</span>
              </p>
            </div>
          </div>
          <a href="#rooms" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">See availability</a>
        </div>

        {reviewHighlights && !reviewHighlights.lowSignal && (reviewHighlights.positiveTopics.length > 0 || reviewHighlights.tradeoffTopics.length > 0) ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[...reviewHighlights.positiveTopics, ...reviewHighlights.tradeoffTopics].slice(0, 6).map((topic) => (
                  <span key={`topic-${topic.label}`} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground">
                    {topic.label} ({topic.mentions})
                  </span>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-800">Loved by guests</p>
                  {reviewHighlights.positiveTopics.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                      {reviewHighlights.positiveTopics.slice(0, 3).map((topic) => (
                      <li key={`positive-${topic.label}`}>{topic.label} mentioned in {topic.mentions} reviews</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-emerald-900">No recurring positive themes met the stability threshold yet.</p>
                )}
              </article>
                <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-900">Consider before booking</p>
                  {reviewHighlights.tradeoffTopics.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-amber-900">
                      {reviewHighlights.tradeoffTopics.slice(0, 3).map((topic) => (
                      <li key={`tradeoff-${topic.label}`}>{topic.label} mentioned in {topic.mentions} reviews</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-amber-900">No recurring trade-off themes met the stability threshold yet.</p>
                )}
              </article>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
            {reviewHighlights?.message ?? 'Not enough verified review volume to generate stable topic highlights yet.'}
          </p>
        )}

        {reviewBreakdown.length > 0 ? (
          <div className="mt-5 space-y-2">
            {reviewBreakdown.slice(0, 4).map((item) => {
              const value = item.score ? Math.max(0, Math.min(10, item.score)) : 0;
              return (
                <div key={item.label} className="grid grid-cols-[108px,1fr,44px] items-center gap-3 text-sm">
                  <p className="text-foreground">{item.label}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
                  </div>
                  <p className="text-right text-muted-foreground">{value.toFixed(1)}</p>
                </div>
              );
            })}
          </div>
        ) : null}

        {visibleReviews.length > 0 ? (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Top comments from travelers</p>
              <div className="flex items-center gap-2">
                <label htmlFor="review-sort" className="text-xs text-muted-foreground">Sort by</label>
                <select
                  id="review-sort"
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
                  value={reviewSort}
                  onChange={(event) => setReviewSort(event.target.value as 'top' | 'newest' | 'oldest')}
                >
                  <option value="top">Top rated</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                {!showAllReviews ? (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      onClick={() => reviewRailRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                      aria-label="Scroll reviews left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-border bg-background p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      onClick={() => reviewRailRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                      aria-label="Scroll reviews right"
                    >
                      <ChevronRight className="h-4 w-4" />
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
                  ? 'grid md:grid-cols-2'
                  : 'flex snap-x snap-mandatory overflow-x-auto pb-2 scrollbar-none'
              )}
              onMouseEnter={() => setIsReviewRailPaused(true)}
              onMouseLeave={() => setIsReviewRailPaused(false)}
              onFocusCapture={() => setIsReviewRailPaused(true)}
              onBlurCapture={() => setIsReviewRailPaused(false)}
            >
              {visibleReviews.map((review, index) => (
                <article
                  key={`${review.author}-${review.createdAt ?? index}`}
                  className={cn(
                    'rounded-[18px] border border-border bg-background p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)]',
                    showAllReviews ? '' : 'min-w-[320px] snap-start'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {(review.author ?? 'G').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{review.author ?? 'Guest'}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.travelerType}
                        {review.score ? ` · ${review.score.toFixed(1)}` : ''}
                        {formatReviewDate(review.createdAt) ? ` · ${formatReviewDate(review.createdAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{review.comment}</p>
                </article>
              ))}
            </div>

            {sortedReviews.length > 6 ? (
              <button
                type="button"
                className="mt-4 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                onClick={() => setShowAllReviews((current) => !current)}
              >
                {showAllReviews ? 'Collapse reviews' : `View all reviews (${sortedReviews.length})`}
              </button>
            ) : null}
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
            Detailed guest comments are currently unavailable from the supplier.
          </p>
        )}
      </section>

      <section id="amenities" className="scroll-mt-24 rounded-[16px] border border-border/70 bg-card p-3.5 shadow-[0_12px_26px_-28px_rgba(15,23,42,0.32)] md:p-4" onMouseEnter={() => setActiveTab('amenities')}>
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

      <section id="policies" className="scroll-mt-24 rounded-[16px] border border-border/70 bg-card p-3.5 shadow-[0_12px_26px_-28px_rgba(15,23,42,0.32)] md:p-4" onMouseEnter={() => setActiveTab('policies')}>
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

      <section id="description" className="rounded-[16px] border border-border/70 bg-card p-3.5 shadow-[0_12px_26px_-28px_rgba(15,23,42,0.32)] md:p-4" onMouseEnter={() => setActiveTab('policies')}>
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
