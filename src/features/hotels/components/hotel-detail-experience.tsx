'use client';

import { useMemo, useState } from 'react';
import type { HotelDetails, HotelRateOption } from '@/server/liteapi';
import { PreferenceLink } from '@/components/navigation/preference-link';
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
  { id: 'facilities', label: 'Facilities' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'reviews', label: 'Reviews' },
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

  const photos = hotel?.photos?.length ? hotel.photos : hotel?.mainPhoto ? [hotel.mainPhoto] : [];
  const facilities = hotel?.facilities?.length
    ? hotel.facilities
    : ['Free WiFi', '24-hour front desk', 'Luggage storage', 'Elevator', 'Smoke-free property'];
  const lowestRate = rates.reduce<number | null>((min, rate) => (min === null || rate.amount < min ? rate.amount : min), null);
  const currency = rates[0]?.currency ?? 'USD';
  const address = hotel?.address ?? `${hotel?.city ?? 'Unknown city'}${hotel?.countryCode ? `, ${hotel.countryCode}` : ''}`;
  const reviewBreakdown = hotel?.reviewBreakdown ?? [];
  const reviews = hotel?.reviews ?? [];
  const browseHotelsHref = `/hotels?q=${encodeURIComponent(hotel?.city ?? '')}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}&rooms=${rooms}`;

  const mapUrl = useMemo(() => {
    if (hotel?.latitude && hotel?.longitude) {
      return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${hotel.latitude}%2C${hotel.longitude}`;
    }
    return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=48.8566%2C2.3522`;
  }, [hotel?.latitude, hotel?.longitude]);

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
      <section className="space-y-2 rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm md:p-5">
        <PreferenceLink href={browseHotelsHref} className="inline-flex text-sm font-semibold text-muted-foreground underline underline-offset-4">
          See all properties
        </PreferenceLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{hotel?.name ?? 'Hotel'}</h1>
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

      <section className="grid gap-3 md:grid-cols-[1.2fr,1fr]">
        {photos[0] ? (
          <button type="button" className="overflow-hidden rounded-2xl border border-border bg-card/85 text-left" onClick={() => setLightboxIndex(0)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[0]} alt={hotel?.name ?? 'Hotel photo'} className="h-[360px] w-full object-cover md:h-[430px]" />
          </button>
        ) : (
          <article className="flex h-[360px] items-center justify-center rounded-2xl border border-border bg-card/70 md:h-[430px]">
            <p className="text-sm text-muted-foreground">Photos unavailable</p>
          </article>
        )}
        <div className="grid grid-cols-2 gap-3">
          {photos.slice(1, 5).map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              type="button"
              className="overflow-hidden rounded-2xl border border-border bg-card/85"
              onClick={() => setLightboxIndex(index + 1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={`${hotel?.name ?? 'Hotel'} view ${index + 2}`} className="h-[210px] w-full object-cover" />
            </button>
          ))}
          {!photos[1] && (
            <article className="col-span-2 flex h-[210px] items-center justify-center rounded-2xl border border-border bg-card/70">
              <p className="text-sm text-muted-foreground">Show all pictures</p>
            </article>
          )}
        </div>
      </section>

      <nav className="sticky top-2 z-10 flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-card/90 p-3 backdrop-blur">
        {SECTION_TABS.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${activeTab === tab.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background'
              }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1.75fr,0.95fr]">
        <div className="space-y-5">
          <section id="overview" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('overview')}>
            <h2 className="text-xl font-semibold">Smart highlights</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="rounded-xl border border-border bg-background/70 p-3">
                <p className="font-semibold">Prime location access</p>
                <p className="text-muted-foreground">Close to major landmarks and city experiences.</p>
              </li>
              <li className="rounded-xl border border-border bg-background/70 p-3">
                <p className="font-semibold">Comfort-focused stay</p>
                <p className="text-muted-foreground">Dependable rooms and practical amenities for short or long stays.</p>
              </li>
              <li className="rounded-xl border border-border bg-background/70 p-3">
                <p className="font-semibold">Transparent booking flow</p>
                <p className="text-muted-foreground">Total price and cancellation terms are shown before confirmation.</p>
              </li>
            </ul>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <iframe title="Hotel map" src={mapUrl} className="h-56 w-full" loading="lazy" />
            </div>
          </section>

          <section id="facilities" className="rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('facilities')}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Popular facilities</h2>
              <span className="text-xs text-muted-foreground">See all facilities</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {facilities.map((facility) => (
                <p key={facility} className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm">
                  {facility}
                </p>
              ))}
            </div>
          </section>

          <section id="rooms" className="space-y-3 rounded-xl border border-border bg-card/85 p-4" onMouseEnter={() => setActiveTab('rooms')}>
            <h2 className="text-xl font-semibold">Choose your room</h2>
            <p className="text-sm text-muted-foreground">
              {checkin} to {checkout} · {adults} adults · {rooms} room{rooms > 1 ? 's' : ''}
            </p>
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
                  <article key={`${rate.offerId}-${rate.roomId}`} className="rounded-xl border border-border bg-background/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold">{rate.roomName}</h3>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-border bg-card px-2 py-1">{rate.boardName}</span>
                          <span className="rounded-full border border-border bg-card px-2 py-1">{rate.refundableTag}</span>
                          {rate.cancelTime ? (
                            <span className="rounded-full border border-border bg-card px-2 py-1">Cancel until {rate.cancelTime}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">{formatMoney(rate.currency, rate.amount)}</p>
                        <p className="text-xs text-muted-foreground">+ taxes and fees at checkout</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <PreferenceLink
                        href={`/booking?${bookingQuery.toString()}`}
                        className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        Select room
                      </PreferenceLink>
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

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <article className="rounded-2xl border border-border bg-card/90 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">From</p>
            <p className="mt-1 text-3xl font-bold text-primary">{formatMoney(currency, lowestRate, true)}</p>
            <p className="text-xs text-muted-foreground">/ night</p>
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-background/70 p-3 text-sm">
              <p>{checkin} to {checkout}</p>
              <p>{adults} adults · {rooms} room{rooms > 1 ? 's' : ''}</p>
            </div>
            <a href="#rooms" className="mt-3 inline-flex w-full justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Choose your room
            </a>
          </article>
        </aside>
      </div>

      {lightboxIndex !== null && photos[lightboxIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <button type="button" className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-sm font-semibold" onClick={() => setLightboxIndex(null)}>
            Close
          </button>
          <div className="max-h-[90vh] max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[lightboxIndex]} alt={`${hotel?.name ?? 'Hotel'} enlarged`} className="max-h-[85vh] w-full rounded-xl object-contain" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
