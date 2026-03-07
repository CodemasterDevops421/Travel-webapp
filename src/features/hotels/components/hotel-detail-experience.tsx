'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { HotelDetails, HotelRateOption } from '@/server/liteapi';
import { useHotelDetails } from '@/features/hotels/hooks/use-hotel-details';
import { useHotelRates, type HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';
import { useWishlist } from '@/shared/hooks/use-wishlist';
import { PropertyHero } from '@/features/hotels/components/property-hero';
import { PropertyTabNav } from '@/features/hotels/components/property-tab-nav';
import { PropertyContentSections } from '@/features/hotels/components/property-content-sections';
import { PropertyBookingRail } from '@/features/hotels/components/property-booking-rail';

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
  { id: 'rooms', label: 'Rooms' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'policies', label: 'Policies' }
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
    <main className="hotel-detail-page mx-auto max-w-[1160px] space-y-4 px-4 py-4 md:space-y-5 md:py-6">
      <PropertyHero
        browseHotelsHref={browseHotelsHref}
        hotelName={hotel?.name ?? 'Hotel'}
        starRating={hotel?.starRating}
        reviewScore={hotel?.reviewScore}
        reviewCount={hotel?.reviewCount}
        address={address}
        checkin={checkin}
        checkout={checkout}
        adults={adults}
        rooms={rooms}
        currency={currency}
        lowestRate={lowestRate}
        photos={photos}
        lightboxIndex={lightboxIndex}
        onOpenLightbox={setLightboxIndex}
        onCloseLightbox={() => {
          setLightboxIndex(null);
        }}
        isHotelSaved={isHotelSaved}
        authRequired={authRequired}
        loginHref={loginHref}
        onToggleSave={() => {
          clearAuthRequired();
          void toggleSave({
            hotelId,
            hotelName: hotel?.name,
            hotelImage: hotel?.mainPhoto ?? undefined,
            starRating: hotel?.starRating ?? undefined,
            city: hotel?.city
          });
        }}
        formatMoney={formatMoney}
      />

      <PropertyTabNav activeTab={activeTab} tabs={SECTION_TABS} onTabChange={setActiveTab} />

      <section className="relative lg:grid lg:grid-cols-[minmax(0,1fr),272px] lg:items-start lg:gap-6">
        <div className="min-w-0">
          <PropertyContentSections
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
        </div>
        <div className="mt-5 hidden lg:mt-0 lg:block">
          <PropertyBookingRail
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
      </section>
    </main>
  );
}
