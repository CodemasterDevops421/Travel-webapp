'use client';

import Link from 'next/link';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';

type SearchResultsPageProps = {
  query: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency: string;
};

export function SearchResultsPage({
  query,
  checkin,
  checkout,
  adults,
  rooms,
  currency
}: SearchResultsPageProps) {
  const { data, isFetching } = usePropertyPreview(query, currency, checkin, checkout, adults, rooms);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/85 p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Search results</p>
        <h1 className="mt-2 text-3xl font-bold">Stays in {query}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {checkin} to {checkout} · {adults} adults · {rooms} room{rooms > 1 ? 's' : ''} · {currency}
        </p>
      </section>

      {isFetching ? (
        <p className="text-sm text-muted-foreground">Loading hotel listings...</p>
      ) : (
        <section className="grid gap-3">
          {(data ?? []).map((hotel) => (
            <Link
              key={hotel.hotelId}
              href={`/hotels/${hotel.hotelId}?checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}`}
              className="grid gap-3 rounded-2xl border border-border/80 bg-card/80 p-3 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md md:grid-cols-[260px,1fr,180px]"
            >
              {hotel.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hotel.imageUrl} alt={hotel.name} className="h-44 w-full rounded-xl object-cover md:h-40" />
              ) : (
                <div className="h-44 rounded-xl bg-[linear-gradient(120deg,hsl(var(--muted))_0%,hsl(var(--card))_55%,hsl(var(--muted))_100%)] md:h-40" />
              )}
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{hotel.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {hotel.city}
                  {hotel.countryCode ? `, ${hotel.countryCode}` : ''}
                  {hotel.starRating ? ` · ${hotel.starRating}★` : ''}
                </p>
                <p className="text-sm font-medium">
                  {hotel.reviewScore ? `${hotel.reviewScore.toFixed(1)} / 10 guest rating` : 'Guest rating available on details'}
                  {hotel.reviewCount ? ` · Based on ${Math.round(hotel.reviewCount)} reviews` : ''}
                </p>
              </div>
              <div className="flex flex-col items-start justify-between md:items-end">
                <div className="text-left md:text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">From</p>
                  <p className="text-2xl font-bold text-primary">
                    {hotel.price ? `${hotel.currency} ${hotel.price}` : 'Price on request'}
                  </p>
                  <p className="text-xs text-muted-foreground">/ night</p>
                </div>
                <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
                  View details
                </span>
              </div>
            </Link>
          ))}
          {(data ?? []).length === 0 && (
            <p className="rounded-xl border border-border bg-card/70 p-4 text-sm text-muted-foreground">
              No stays found for this search. Try different dates or destination text.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
