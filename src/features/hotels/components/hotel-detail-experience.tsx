'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { HotelDetails, HotelRateOption } from '@/server/liteapi';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { cn } from '@/shared/lib/utils';
import { useHotelDetails } from '@/features/hotels/hooks/use-hotel-details';
import { useHotelRates, type HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';
import { useWishlist } from '@/shared/hooks/use-wishlist';
import { HotelPhotoGallery } from '@/features/hotels/components/hotel-photo-gallery';
import { HotelDetailSections } from '@/features/hotels/components/hotel-detail-sections';
import { HotelBookingSidebar } from '@/features/hotels/components/hotel-booking-sidebar';

type HotelDetailExperienceProps = {
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  hotel: HotelDetails | null;
  rates: HotelRateOption[];
};

const SECTION_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'travelers-asking', label: 'FAQs' },
  { id: 'ask-ai', label: 'Ask AI' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'policies', label: 'Policies' },
  { id: 'location', label: 'Location' },
  { id: 'pros-cons', label: 'Pros & Cons' },
  { id: 'description', label: 'Details' }
];

function formatMoney(currency: string, amount: number | null, compact = false): string {
  if (amount === null) return 'Unavailable';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function buildRateKey(rate: Pick<HotelRateOption, 'offerId' | 'roomId'>): string {
  return `${rate.offerId}:${rate.roomId}`;
}

function pickRecommendedRate<T extends Pick<HotelRateOption, 'offerId' | 'roomId' | 'amount'>>(rates: T[]): T | null {
  if (!rates.length) return null;
  return [...rates].sort((left, right) => {
    if (left.amount !== right.amount) {
      return left.amount - right.amount;
    }
    return buildRateKey(left).localeCompare(buildRateKey(right));
  })[0] ?? null;
}

function buildBookingQuery(
  rate: HotelRateWithCancellationContext,
  context: { hotelId: string; checkin: string; checkout: string; adults: number; rooms: number }
): URLSearchParams {
  const bookingQuery = new URLSearchParams({
    hotelId: context.hotelId,
    roomId: rate.roomId,
    offerId: rate.offerId,
    amount: String(rate.amount),
    currency: rate.currency,
    checkIn: context.checkin,
    checkOut: context.checkout,
    adults: String(context.adults),
    rooms: String(context.rooms),
    isRefundable: rate.isRefundable === null ? 'unknown' : rate.isRefundable ? 'true' : 'false'
  });

  if (rate.cancellationDeadline) {
    bookingQuery.set('cancellationDeadline', rate.cancellationDeadline);
  }
  if (rate.cancellationNote) {
    bookingQuery.set('cancellationNote', rate.cancellationNote);
  }

  return bookingQuery;
}

function getCancellationCopy(rate: HotelRateWithCancellationContext): { status: string; detail: string } {
  if (rate.isRefundable === false) {
    return {
      status: 'Non-refundable',
      detail: rate.cancellationNote ?? 'This rate cannot be refunded after booking.'
    };
  }
  if (rate.cancellationDeadline) {
    return {
      status: 'Free cancellation',
      detail: `Cancel until ${rate.cancellationDeadline}`
    };
  }
  if (rate.isRefundable === true) {
    return {
      status: 'Refundable',
      detail: rate.cancellationNote ?? 'Cancellation deadline was not provided by the supplier.'
    };
  }
  return {
    status: 'Cancellation policy pending',
    detail: 'Supplier has not provided cancellation policy details for this rate yet.'
  };
}

export function HotelDetailExperience({ hotelId, checkin, checkout, adults, rooms, hotel: initialHotel, rates: initialRates }: HotelDetailExperienceProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [selectedRateKey, setSelectedRateKey] = useState<string | null>(
    pickRecommendedRate(initialRates) ? buildRateKey(pickRecommendedRate(initialRates)!) : null
  );
  const { isSaved, toggleSave, authRequired, clearAuthRequired } = useWishlist();

  const { data: hotel } = useHotelDetails(hotelId, undefined, initialRates[0]?.currency, {
    initialData: initialHotel ?? undefined
  });

  const { data: rates = [] } = useHotelRates({
    hotelId,
    checkin,
    checkout,
    adults,
    rooms,
    currency: initialRates[0]?.currency
  }, {
    initialData: initialRates
  });

  useEffect(() => {
    if (!rates.length) {
      setSelectedRateKey(null);
      return;
    }

    const recommendedRate = pickRecommendedRate(rates);

    setSelectedRateKey((current) => {
      if (current && rates.some((rate) => buildRateKey(rate) === current)) {
        return current;
      }
      return recommendedRate ? buildRateKey(recommendedRate) : buildRateKey(rates[0]);
    });
  }, [rates]);

  const photos = useMemo(() => {
    const basePhotos = hotel?.photos?.length ? hotel.photos : hotel?.mainPhoto ? [hotel.mainPhoto as string] : [];
    const roomPhotos = rates
      .map((rate) => (typeof rate.imageUrl === 'string' ? rate.imageUrl : null))
      .filter((item): item is string => Boolean(item));
    return Array.from(new Set([...basePhotos, ...roomPhotos]));
  }, [hotel?.mainPhoto, hotel?.photos, rates]);
  const amenities = hotel?.facilities ?? [];
  const lowestRate = rates.reduce<number | null>((min, rate) => (min === null || rate.amount < min ? rate.amount : min), null);
  const currency = rates[0]?.currency ?? 'USD';
  const selectedRate = useMemo(
    () => rates.find((rate) => buildRateKey(rate) === selectedRateKey) ?? rates[0] ?? null,
    [rates, selectedRateKey]
  );
  const recommendedRateKey = useMemo(() => {
    const recommendedRate = pickRecommendedRate(rates);
    return recommendedRate ? buildRateKey(recommendedRate) : null;
  }, [rates]);
  const selectedCancellation = useMemo(
    () => (selectedRate ? getCancellationCopy(selectedRate) : null),
    [selectedRate]
  );
  const selectedBookingHref = useMemo(() => {
    if (!selectedRate) return null;
    const query = buildBookingQuery(selectedRate, {
      hotelId,
      checkin,
      checkout,
      adults,
      rooms
    });
    return `/booking?${query.toString()}`;
  }, [selectedRate, hotelId, checkin, checkout, adults, rooms]);
  const address = hotel?.address ?? `${hotel?.city ?? 'Unknown city'}${hotel?.countryCode ? `, ${hotel.countryCode}` : ''}`;
  const reviewBreakdown = hotel?.reviewBreakdown ?? [];
  const reviews = hotel?.reviews ?? [];
  const policies = hotel?.policies;
  const locationContext = hotel?.locationContext;
  const prosAndCons = hotel?.prosAndCons;
  const isPartialDetail = hotel?.completeness?.isPartial ?? true;
  const browseHotelsHref = `/hotels?q=${encodeURIComponent(hotel?.city ?? '')}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}&rooms=${rooms}`;
  const isHotelSaved = isSaved(hotelId);
  const loginHref = useMemo(() => {
    const query = searchParams.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;
    return `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
  }, [pathname, searchParams]);

  const mapUrl = useMemo(() => {
    const latitude = locationContext?.latitude ?? null;
    const longitude = locationContext?.longitude ?? null;
    if (latitude !== null && longitude !== null) {
      return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${latitude}%2C${longitude}`;
    }
    return null;
  }, [locationContext?.latitude, locationContext?.longitude]);

  async function askHotelAI(nextQuestion?: string) {
    const prompt = (nextQuestion ?? question).trim();
    if (!prompt) return;
    setAskLoading(true);
    setAskAnswer('');
    try {
      const response = await fetch('/api/hotel-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hotelId, question: prompt })
      });
      const json = await response.json();
      if (!response.ok) {
        setAskAnswer(json.error ?? 'Unable to fetch AI answer right now.');
      } else {
        setAskAnswer(json.answer ?? 'No answer available.');
      }
    } catch {
      setAskAnswer('Unable to fetch AI answer right now.');
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 md:py-9">
      <section className="space-y-4 border-b border-border pb-8 pt-4">
        <PreferenceLink href={browseHotelsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          &larr; See all properties
        </PreferenceLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-4xl font-bold md:text-5xl">{hotel?.name ?? 'Hotel'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{address}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">
                {checkin} to {checkout}
              </span>
              <span>{adults} guests</span>
              <span>•</span>
              <span>{rooms} room{rooms > 1 ? 's' : ''}</span>
            </div>
            {hotel?.reviewScore ? (
              <p className="mt-2 text-sm font-medium">
                {hotel.reviewScore.toFixed(1)} / 10 guest rating
                {hotel.reviewCount ? ` · Based on ${Math.round(hotel.reviewCount)} reviews` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Guest reviews are not available for this property yet.</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  clearAuthRequired();
                  void toggleSave({
                    hotelId,
                    hotelName: hotel?.name,
                    hotelImage: hotel?.mainPhoto ?? undefined,
                    starRating: hotel?.starRating ?? undefined,
                    city: hotel?.city
                  });
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold transition-colors',
                  isHotelSaved ? 'bg-rose-50 text-rose-600' : 'bg-background text-foreground hover:bg-muted'
                )}
              >
                <Heart className={cn('h-4 w-4', isHotelSaved ? 'fill-current' : '')} />
                {isHotelSaved ? 'Saved to wishlist' : 'Save stay'}
              </button>
              {authRequired ? (
                <PreferenceLink href={loginHref} className="text-sm font-semibold text-amber-700 underline underline-offset-2">
                  Sign in to save
                </PreferenceLink>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">From</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(currency, lowestRate, true)}</p>
            <p className="text-xs text-muted-foreground">/ night</p>
          </div>
        </div>
      </section>

      <HotelPhotoGallery
        photos={photos}
        hotelName={hotel?.name ?? 'Hotel photo'}
        lightboxIndex={lightboxIndex}
        onOpen={setLightboxIndex}
        onClose={() => {
          setLightboxIndex(null);
        }}
      />

      <nav className="sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 backdrop-blur md:top-20 md:mx-0 md:px-0">
        <div className="relative">
          <div className="flex w-full gap-8 overflow-x-auto px-4 md:px-0 scrollbar-none">
            {SECTION_TABS.map((tab) => (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'whitespace-nowrap border-b-2 py-4 text-sm font-semibold transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {tab.label}
              </a>
            ))}
          </div>
          {/* Scroll fade indicator — signals more tabs offscreen */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent md:hidden" />
        </div>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr,minmax(320px,400px)]">
        <HotelDetailSections
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isPartialDetail={isPartialDetail}
          hotel={hotel ?? null}
          mapUrl={mapUrl}
          amenities={amenities}
          policies={policies}
          locationContext={locationContext}
          rates={rates}
          checkin={checkin}
          checkout={checkout}
          adults={adults}
          rooms={rooms}
          selectedRate={selectedRate}
          recommendedRateKey={recommendedRateKey}
          setSelectedRateKey={setSelectedRateKey}
          buildRateKey={buildRateKey}
          getCancellationCopy={getCancellationCopy}
          formatMoney={formatMoney}
          reviewBreakdown={reviewBreakdown}
          reviews={reviews}
          prosAndCons={prosAndCons}
          question={question}
          setQuestion={setQuestion}
          askLoading={askLoading}
          askAnswer={askAnswer}
          askHotelAI={askHotelAI}
        />
        <HotelBookingSidebar
          checkin={checkin}
          checkout={checkout}
          adults={adults}
          currency={currency}
          lowestRate={lowestRate}
          selectedRate={selectedRate}
          selectedCancellation={selectedCancellation}
          selectedBookingHref={selectedBookingHref}
          formatMoney={formatMoney}
        />
      </div>
    </main>
  );
}
