'use client';

import { useMemo, useState } from 'react';
import type { HotelDetails, HotelRateOption } from '@/server/liteapi';
import { PreferenceLink } from '@/components/navigation/preference-link';
import Image from 'next/image';
import { cn } from '@/shared/lib/utils';
import { useHotelDetails } from '@/features/hotels/hooks/use-hotel-details';
import { useHotelRates } from '@/features/hotels/hooks/use-hotel-rates';

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
  { id: 'amenities', label: 'Amenities' },
  { id: 'policies', label: 'Policies' },
  { id: 'location', label: 'Location' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'pros-cons', label: 'Pros & Cons' },
  { id: 'description', label: 'Description' },
  { id: 'ask-ai', label: 'Ask AI (Beta)' }
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

export function HotelDetailExperience({ hotelId, checkin, checkout, adults, rooms, hotel: initialHotel, rates: initialRates }: HotelDetailExperienceProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [askLoading, setAskLoading] = useState(false);

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

  const photos = hotel?.photos?.length ? hotel.photos : hotel?.mainPhoto ? [hotel.mainPhoto as string] : [];
  const amenities = hotel?.facilities ?? [];
  const lowestRate = rates.reduce<number | null>((min, rate) => (min === null || rate.amount < min ? rate.amount : min), null);
  const currency = rates[0]?.currency ?? 'USD';
  const address = hotel?.address ?? `${hotel?.city ?? 'Unknown city'}${hotel?.countryCode ? `, ${hotel.countryCode}` : ''}`;
  const reviewBreakdown = hotel?.reviewBreakdown ?? [];
  const reviews = hotel?.reviews ?? [];
  const policies = hotel?.policies;
  const locationContext = hotel?.locationContext;
  const prosAndCons = hotel?.prosAndCons;
  const isPartialDetail = hotel?.completeness?.isPartial ?? true;
  const browseHotelsHref = `/hotels?q=${encodeURIComponent(hotel?.city ?? '')}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}&rooms=${rooms}`;

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
      <section className="space-y-4 pt-4 pb-8 border-b border-border">
        <PreferenceLink href={browseHotelsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          &larr; See all properties
        </PreferenceLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-4xl font-bold md:text-5xl">{hotel?.name ?? 'Hotel'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{address}</p>
            {hotel?.reviewScore ? (
              <p className="mt-2 text-sm font-medium">
                {hotel.reviewScore.toFixed(1)} / 10 guest rating
                {hotel.reviewCount ? ` · Based on ${Math.round(hotel.reviewCount)} reviews` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Guest reviews are not available for this property yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">From</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(currency, lowestRate, true)}</p>
            <p className="text-xs text-muted-foreground">/ night</p>
          </div>
        </div>
      </section>

      <section className="grid gap-1 md:grid-cols-[2fr,1fr] h-[400px] md:h-[500px] overflow-hidden">
        {photos[0] ? (
          <button type="button" className="group relative h-full w-full bg-muted overflow-hidden" onClick={() => setLightboxIndex(0)}>
            <Image src={photos[0]} alt={hotel?.name ?? 'Hotel photo'} fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          </button>
        ) : (
          <article className="flex h-full w-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Photos unavailable</p>
          </article>
        )}
        <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
          {photos.slice(1, 5).map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              className="group relative h-full w-full bg-muted overflow-hidden"
              onClick={() => setLightboxIndex(index + 1)}
            >
              <Image src={photo} alt={`${hotel?.name ?? 'Hotel'} view ${index + 2}`} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            </button>
          ))}
          {!photos[1] && (
            <article className="col-span-2 flex h-[210px] items-center justify-center rounded-2xl border border-border bg-card/70">
              <p className="text-sm text-muted-foreground">Show all pictures</p>
            </article>
          )}
        </div>
      </section>

      <nav className="sticky top-0 z-20 -mx-4 flex overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur md:mx-0 md:px-0">
        <div className="flex w-full gap-8">
          {SECTION_TABS.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 text-sm font-semibold transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
        <div className="space-y-12 pb-24">
          <section id="overview" className="scroll-mt-24 space-y-6" onMouseEnter={() => setActiveTab('overview')}>
            <h2 className="font-heading text-3xl font-light">Smart Highlights</h2>
            {isPartialDetail ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {hotel?.completeness.message ?? 'Some supplier details are currently unavailable for this property.'}
              </p>
            ) : null}
            <ul className="grid gap-4 sm:grid-cols-3">
              <li className="border border-border bg-card p-6 transition-colors hover:bg-muted/50">
                <p className="font-semibold text-foreground">Prime location access</p>
                <p className="mt-2 text-sm text-muted-foreground">Close to major landmarks and city experiences.</p>
              </li>
              <li className="border border-border bg-card p-6 transition-colors hover:bg-muted/50">
                <p className="font-semibold text-foreground">Comfort-focused stay</p>
                <p className="mt-2 text-sm text-muted-foreground">Dependable rooms and practical amenities for short or long stays.</p>
              </li>
              <li className="border border-border bg-card p-6 transition-colors hover:bg-muted/50">
                <p className="font-semibold text-foreground">Transparent booking flow</p>
                <p className="mt-2 text-sm text-muted-foreground">Total price and cancellation terms are shown before confirmation.</p>
              </li>
            </ul>
            {mapUrl ? (
              <div className="mt-8 border border-border bg-muted">
                <iframe title="Hotel map" src={mapUrl} className="h-[400px] w-full" loading="lazy" />
              </div>
            ) : (
              <p className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
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
                  <p key={facility} className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm">
                    {facility}
                  </p>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                Amenities data is currently unavailable from the supplier for this property.
              </p>
            )}
          </section>

          <section id="policies" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('policies')}>
            <h2 className="text-xl font-semibold">Policies</h2>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <p className="rounded-xl border border-border bg-background/70 p-3">
                Check-in: {policies?.checkInFrom || policies?.checkInUntil ? `${policies.checkInFrom ?? 'Unknown'} - ${policies.checkInUntil ?? 'Unknown'}` : 'Not provided by supplier'}
              </p>
              <p className="rounded-xl border border-border bg-background/70 p-3">
                Check-out: {policies?.checkOutFrom || policies?.checkOutUntil ? `${policies.checkOutFrom ?? 'Unknown'} - ${policies.checkOutUntil ?? 'Unknown'}` : 'Not provided by supplier'}
              </p>
            </div>
            {policies && policies.cancellation.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {policies.cancellation.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-xl border border-border bg-background/70 p-3">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                Cancellation policy details are currently unavailable from the supplier.
              </p>
            )}
          </section>

          <section id="location" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('location')}>
            <h2 className="text-xl font-semibold">Location context</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {locationContext?.addressLine ?? 'Address details are currently unavailable from the supplier.'}
            </p>
            {locationContext?.nearbyLandmarks?.length ? (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nearby landmarks</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {locationContext.nearbyLandmarks.map((landmark) => (
                    <span key={landmark} className="rounded-full border border-border bg-background px-3 py-1 text-xs">{landmark}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                Nearby landmark context is currently unavailable from the supplier.
              </p>
            )}
          </section>

          <section id="rooms" className="scroll-mt-24 space-y-6" onMouseEnter={() => setActiveTab('rooms')}>
            <h2 className="font-heading text-3xl font-light">Choose your room</h2>
            <div className="border-b border-border pb-4">
              <p className="text-sm text-foreground font-medium">
                {checkin} to {checkout}
              </p>
              <p className="text-sm text-muted-foreground">
                {adults} adults · {rooms} room{rooms > 1 ? 's' : ''}
              </p>
            </div>
            {rates.length === 0 ? (
              <p className="rounded-xl border border-border bg-background/70 p-4 text-sm">No rates found for selected dates.</p>
            ) : (
              rates.map((rate) => {
                const bookingQuery = new URLSearchParams({
                  hotelId,
                  roomId: rate.roomId,
                  offerId: rate.offerId,
                  amount: String(rate.amount),
                  currency: rate.currency,
                  checkIn: checkin,
                  checkOut: checkout,
                  adults: String(adults),
                  rooms: String(rooms)
                });
                return (
                  <article key={`${rate.offerId}-${rate.roomId}`} className="border border-border p-6 transition-colors hover:bg-muted/20">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <h3 className="text-xl font-bold text-foreground">{rate.roomName}</h3>
                        <div className="flex flex-col gap-2">
                          <span className="inline-flex w-fit items-center gap-1 bg-green-50 px-2 py-1 text-xs font-bold text-green-700 border border-green-200">
                            ✓ {rate.refundableTag}
                          </span>
                          <span className="inline-flex w-fit items-center gap-1 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                            ☕ {rate.boardName}
                          </span>
                          {rate.cancelTime ? (
                            <span className="text-xs font-medium text-muted-foreground">Cancel until {rate.cancelTime}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-4 min-w-[200px]">
                        <div className="w-full text-left md:text-right">
                          <p className="text-3xl font-bold text-foreground">{formatMoney(rate.currency, rate.amount)}</p>
                          <p className="text-xs text-muted-foreground mt-1 text-left md:text-right">Includes taxes and charges</p>
                        </div>
                        <PreferenceLink
                          href={`/booking?${bookingQuery.toString()}`}
                          className="w-full text-center rounded-none bg-primary px-8 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
                        >
                          Reserve
                        </PreferenceLink>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section id="reviews" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('reviews')}>
            <h2 className="text-xl font-semibold">Guest reviews</h2>
            {hotel?.reviewScore ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {hotel.reviewScore.toFixed(1)} · Based on {hotel.reviewCount ? Math.round(hotel.reviewCount) : 'available'} reviews
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No verified review score available from supplier for this property.</p>
            )}

            {reviewBreakdown.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {reviewBreakdown.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-background/70 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p>{item.label}</p>
                      <p className="font-semibold">{item.score.toFixed(1)}</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, (item.score / 10) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reviews.length > 0 && (
              <div className="mt-4 space-y-3">
                {reviews.slice(0, 6).map((review, index) => (
                  <article key={`${review.author ?? 'guest'}-${index}`} className="rounded-xl border border-border bg-background/70 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{review.author ?? 'Guest'}</span>
                      {review.travelerType ? <span>• {review.travelerType}</span> : null}
                      {review.score ? <span>• {review.score.toFixed(1)}</span> : null}
                      {review.createdAt ? <span>• {review.createdAt}</span> : null}
                    </div>
                    <p className="mt-2 text-sm">{review.comment}</p>
                  </article>
                ))}
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="mt-3 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                Detailed guest comments are currently unavailable from the supplier.
              </p>
            ) : null}
          </section>

          <section id="pros-cons" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('pros-cons')}>
            <h2 className="text-xl font-semibold">Pros and cons</h2>
            {prosAndCons && (prosAndCons.pros.length > 0 || prosAndCons.cons.length > 0) ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pros</p>
                  {prosAndCons.pros.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm">
                      {prosAndCons.pros.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-xl border border-border bg-background/70 p-3">{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                      Positive highlights are currently unavailable from supplier reviews.
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cons</p>
                  {prosAndCons.cons.length > 0 ? (
                    <ul className="mt-2 space-y-2 text-sm">
                      {prosAndCons.cons.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-xl border border-border bg-background/70 p-3">{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                      Trade-off details are currently unavailable from supplier reviews.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                Pros and cons summaries are currently unavailable from supplier reviews.
              </p>
            )}
          </section>

          <section id="description" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('description')}>
            <h2 className="text-xl font-semibold">Property description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {hotel?.description ?? 'Property description is currently unavailable.'}
            </p>
          </section>

          <section id="ask-ai" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('ask-ai')}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ask AI · Beta</p>
            <h2 className="mt-2 text-xl font-semibold">Ask about this hotel</h2>
            <p className="mt-1 text-sm text-muted-foreground">Get quick answers about facilities, policies, and stay details.</p>
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
                onClick={() => void askHotelAI()}
                disabled={askLoading}
              >
                {askLoading ? 'Asking...' : 'Ask'}
              </button>
            </div>
            {askAnswer ? <p className="mt-3 rounded-xl border border-border bg-background/70 p-3 text-sm">{askAnswer}</p> : null}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-border bg-card p-6 shadow-editorial-md">
            {/* Urgency Badge */}
            <div className="mb-6 flex items-start gap-3 rounded bg-red-50 p-3 border border-red-100">
              <span className="mt-0.5 flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500"></span>
              <div>
                <p className="text-sm font-bold text-red-700">In high demand</p>
                <p className="text-xs text-red-600/80">Prices may increase soon.</p>
              </div>
            </div>

            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Price per night</p>
            <p className="mt-2 text-4xl font-bold text-foreground">{formatMoney(currency, lowestRate, true)}</p>

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

            <a href="#rooms" className="mt-8 flex w-full items-center justify-center rounded-none bg-primary px-4 py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg">
              See availability
            </a>

            <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">✓ No booking fees</li>
              <li className="flex items-center gap-2">✓ Price match guarantee</li>
            </ul>
          </div>
        </aside>
      </div>

      {lightboxIndex !== null && photos[lightboxIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <button type="button" className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-sm font-semibold" onClick={() => setLightboxIndex(null)}>
            Close
          </button>
          <div className="relative h-[85vh] w-[85vw] max-w-5xl rounded-xl overflow-hidden">
            <Image src={photos[lightboxIndex]} alt={`${hotel?.name ?? 'Hotel'} enlarged`} fill className="object-contain" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
