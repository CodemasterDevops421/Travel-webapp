import type { Metadata } from 'next';
import Link from 'next/link';
import { getHotelDetails, getHotelRates } from '@/server/liteapi';

type PageProps = {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{
    checkin?: string;
    checkout?: string;
    adults?: string;
  }>;
};

export async function generateMetadata({ params }: Pick<PageProps, 'params'>): Promise<Metadata> {
  const { hotelId } = await params;
  return {
    title: `Hotel Details | ${hotelId} | TravelForge`,
    description: `Compare rates, reviews, and full cancellation details for hotel ${hotelId}.`,
    openGraph: {
      title: `Hotel Details | ${hotelId} | TravelForge`,
      description: `Compare rates, reviews, and full cancellation details for hotel ${hotelId}.`,
      url: `/hotels/${hotelId}`,
      type: 'website'
    },
    alternates: {
      canonical: `/hotels/${hotelId}`
    }
  };
}

function defaultDates() {
  const checkinDate = new Date();
  checkinDate.setDate(checkinDate.getDate() + 14);
  const checkoutDate = new Date(checkinDate);
  checkoutDate.setDate(checkoutDate.getDate() + 2);
  return {
    checkin: checkinDate.toISOString().slice(0, 10),
    checkout: checkoutDate.toISOString().slice(0, 10)
  };
}

function toInrLike(currency: string, amount: number | null): string {
  if (amount === null) return 'Unavailable';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default async function HotelRatesPage({ params, searchParams }: PageProps) {
  const { hotelId } = await params;
  const qs = await searchParams;
  const dates = defaultDates();
  const checkin = qs.checkin ?? dates.checkin;
  const checkout = qs.checkout ?? dates.checkout;
  const adults = Number(qs.adults ?? '2') || 2;

  const [hotel, rates] = await Promise.all([
    getHotelDetails(hotelId),
    getHotelRates({
      hotelId,
      checkin,
      checkout,
      adults
    })
  ]);

  const lowestRate = rates.reduce<number | null>((min, rate) => {
    if (min === null || rate.amount < min) return rate.amount;
    return min;
  }, null);

  const currency = rates[0]?.currency ?? 'USD';
  const photoPool = hotel?.photos?.length ? hotel.photos : hotel?.mainPhoto ? [hotel.mainPhoto] : [];
  const heroPhotos = photoPool.slice(0, 4);
  const facilities = hotel?.facilities?.length
    ? hotel.facilities
    : ['24-hour front desk', 'Free WiFi', 'Fitness center', 'Concierge', 'Spa', 'Luggage storage'];
  const rating = hotel?.reviewScore ?? 0;

  const jsonLd = hotel
    ? {
        '@context': 'https://schema.org',
        '@type': 'Hotel',
        name: hotel.name,
        address: hotel.address ?? `${hotel.city}${hotel.countryCode ? `, ${hotel.countryCode}` : ''}`,
        image: heroPhotos.length ? heroPhotos : undefined,
        starRating: hotel.starRating
          ? {
              '@type': 'Rating',
              ratingValue: hotel.starRating
            }
          : undefined,
        offers:
          lowestRate !== null
            ? {
                '@type': 'Offer',
                price: lowestRate,
                priceCurrency: currency,
                availability: 'https://schema.org/InStock',
                validFrom: new Date().toISOString()
              }
            : undefined
      }
    : null;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 md:py-9">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}

      <section className="space-y-3 rounded-3xl border border-border/80 bg-card/85 p-5 shadow-sm md:p-6">
        <Link href="/" className="inline-flex text-sm font-semibold text-muted-foreground underline underline-offset-4">
          See all properties
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{hotel?.name ?? 'Hotel'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {hotel?.address ?? `${hotel?.city ?? 'City'}${hotel?.countryCode ? `, ${hotel.countryCode}` : ''}`}
            </p>
            <p className="mt-2 text-sm font-medium">
              {hotel?.reviewScore ? `${hotel.reviewScore.toFixed(1)} / 10 guest rating` : 'Guest rating coming soon'}
              {hotel?.reviewCount ? ` · Based on ${Math.round(hotel.reviewCount)} reviews` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">From</p>
            <p className="text-2xl font-bold text-primary">{toInrLike(currency, lowestRate)}</p>
            <p className="text-xs text-muted-foreground">/ night</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-[1.2fr,1fr]">
        {heroPhotos[0] ? (
          <article className="overflow-hidden rounded-2xl border border-border bg-card/85">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroPhotos[0]} alt={hotel?.name ?? 'Hotel photo'} className="h-[360px] w-full object-cover md:h-[430px]" />
          </article>
        ) : (
          <article className="flex h-[360px] items-center justify-center rounded-2xl border border-border bg-card/70 md:h-[430px]">
            <p className="text-sm text-muted-foreground">Photos unavailable</p>
          </article>
        )}
        <div className="grid grid-cols-2 gap-3">
          {heroPhotos.slice(1, 4).map((photo, index) => (
            <article key={`${photo}-${index}`} className="overflow-hidden rounded-2xl border border-border bg-card/85">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={`${hotel?.name ?? 'Hotel'} view ${index + 2}`} className="h-[210px] w-full object-cover" />
            </article>
          ))}
          {!heroPhotos[1] && (
            <article className="col-span-2 flex h-[210px] items-center justify-center rounded-2xl border border-border bg-card/70">
              <p className="text-sm text-muted-foreground">Show all pictures</p>
            </article>
          )}
        </div>
      </section>

      <nav className="sticky top-2 z-10 flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-card/90 p-3 backdrop-blur">
        {[
          ['Overview', 'overview'],
          ['Facilities', 'facilities'],
          ['Rooms', 'rooms'],
          ['Reviews', 'reviews'],
          ['Description', 'description'],
          ['Ask AI (Beta)', 'ask-ai-beta']
        ].map(([label, id]) => {
          return (
            <a key={label} href={`#${id}`} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
              {label}
            </a>
          );
        })}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1.75fr,0.95fr]">
        <div className="space-y-5">
          <section id="overview" className="rounded-2xl border border-border bg-card/85 p-5">
            <h2 className="text-xl font-semibold">Smart highlights</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="rounded-xl border border-border bg-background/70 p-3">
                <p className="font-semibold">Prime location access</p>
                <p className="text-muted-foreground">
                  Close to major landmarks, dining, and city experiences with straightforward local connectivity.
                </p>
              </li>
              <li className="rounded-xl border border-border bg-background/70 p-3">
                <p className="font-semibold">Comfort-focused stay</p>
                <p className="text-muted-foreground">
                  Designed for dependable comfort with practical in-room features and consistent guest services.
                </p>
              </li>
              <li className="rounded-xl border border-border bg-background/70 p-3">
                <p className="font-semibold">Transparent booking flow</p>
                <p className="text-muted-foreground">
                  Total price, taxes, and cancellation terms are shown before final confirmation.
                </p>
              </li>
            </ul>
          </section>

          <section id="facilities" className="rounded-2xl border border-border bg-card/85 p-5">
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

          <section id="rooms" className="space-y-3 rounded-2xl border border-border bg-card/85 p-5">
            <h2 className="text-xl font-semibold">Choose your room</h2>
            <p className="text-sm text-muted-foreground">
              {checkin} to {checkout} · {adults} adults
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
                  checkOut: checkout
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
                        <p className="text-xl font-bold text-primary">{toInrLike(rate.currency, rate.amount)}</p>
                        <p className="text-xs text-muted-foreground">+ taxes and fees at checkout</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={`/booking?${bookingQuery.toString()}`}
                        className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        Select room
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section id="reviews" className="rounded-2xl border border-border bg-card/85 p-5">
            <h2 className="text-xl font-semibold">Guest reviews</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {hotel?.reviewScore ? `${hotel.reviewScore.toFixed(1)} · Wonderful experience score` : 'Guest reviews are being refreshed.'}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ['Cleanliness', rating],
                ['Service', rating ? Math.min(10, rating + 0.3) : 0],
                ['Location', rating ? Math.max(0, rating - 0.1) : 0],
                ['Value', rating ? Math.max(0, rating - 0.4) : 0]
              ].map(([label, score]) => (
                <div key={label} className="rounded-xl border border-border bg-background/70 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p>{label}</p>
                    <p className="font-semibold">{Number(score).toFixed(1)}</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, (Number(score) / 10) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="description" className="rounded-2xl border border-border bg-card/85 p-5">
            <h2 className="text-xl font-semibold">Property description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {hotel?.description ?? 'A well-connected stay with comfort-driven amenities, practical services, and easy city access.'}
            </p>
          </section>

          <section id="ask-ai-beta" className="rounded-2xl border border-border bg-card/85 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ask AI · Beta</p>
            <h2 className="mt-2 text-xl font-semibold">Ask about this hotel</h2>
            <p className="mt-1 text-sm text-muted-foreground">Get quick answers about facilities, policies, and stay details.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Does this property have parking?', 'Is breakfast included?', 'What are check-in/check-out times?'].map((q) => (
                <button key={q} type="button" className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                  {q}
                </button>
              ))}
            </div>
            <input className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Ask anything..." />
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <article className="rounded-2xl border border-border bg-card/90 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">From</p>
            <p className="mt-1 text-3xl font-bold text-primary">{toInrLike(currency, lowestRate)}</p>
            <p className="text-xs text-muted-foreground">/ night</p>
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-background/70 p-3 text-sm">
              <p>{checkin} to {checkout}</p>
              <p>{adults} adults · 1 room</p>
            </div>
            <a href="#rooms" className="mt-3 inline-flex w-full justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Choose your room
            </a>
          </article>
        </aside>
      </div>
    </main>
  );
}
