'use client';

import { useMemo, useState } from 'react';
import { Map, SlidersHorizontal } from 'lucide-react';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';
import { PreferenceLink } from '@/components/navigation/preference-link';

type SearchResultsPageProps = {
  query: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  language: string;
  currency: string;
};

function formatMoney(currency: string, amount: number | null): string {
  if (amount === null) return 'Price on request';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function SearchResultsPage({ query, checkin, checkout, adults, rooms, language, currency }: SearchResultsPageProps) {
  const { data, isFetching } = usePropertyPreview(query, language, currency, checkin, checkout, adults, rooms);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating-desc'>('recommended');
  const [minRating, setMinRating] = useState(0);
  const [minStars, setMinStars] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number>(99999);
  const [mapMode, setMapMode] = useState<'list' | 'split'>('list');

  const listings = useMemo(() => {
    const source = [...(data ?? [])];
    const filtered = source.filter((hotel) => {
      const price = hotel.price ?? 0;
      const review = hotel.reviewScore ?? 0;
      const stars = hotel.starRating ?? 0;
      return price <= maxPrice && review >= minRating && stars >= minStars;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
      if (sortBy === 'price-desc') return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === 'rating-desc') return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
      const scoreA = (a.reviewScore ?? 0) * 10 + (a.starRating ?? 0) * 5 - (a.price ?? 0) / 100;
      const scoreB = (b.reviewScore ?? 0) * 10 + (b.starRating ?? 0) * 5 - (b.price ?? 0) / 100;
      return scoreB - scoreA;
    });

    return filtered;
  }, [data, maxPrice, minRating, minStars, sortBy]);

  const nights = useMemo(() => {
    const start = new Date(checkin);
    const end = new Date(checkout);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [checkin, checkout]);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/85 p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Search results</p>
        <h1 className="mt-2 text-3xl font-bold">Stays in {query}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {checkin} to {checkout} · {nights} night{nights > 1 ? 's' : ''} · {adults} adults · {rooms} room{rooms > 1 ? 's' : ''} · {currency}
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/75 p-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </p>
        <label className="rounded-full border border-border bg-background px-3 py-1 text-xs">
          Sort
          <select className="ml-2 bg-transparent outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
            <option value="rating-desc">Top rated</option>
          </select>
        </label>
        <label className="rounded-full border border-border bg-background px-3 py-1 text-xs">
          Min guest score
          <select className="ml-2 bg-transparent outline-none" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
            {[0, 7, 8, 9].map((value) => (
              <option key={value} value={value}>
                {value === 0 ? 'Any' : `${value}+`}
              </option>
            ))}
          </select>
        </label>
        <label className="rounded-full border border-border bg-background px-3 py-1 text-xs">
          Min stars
          <select className="ml-2 bg-transparent outline-none" value={minStars} onChange={(e) => setMinStars(Number(e.target.value))}>
            {[0, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value === 0 ? 'Any' : `${value}★+`}
              </option>
            ))}
          </select>
        </label>
        <label className="rounded-full border border-border bg-background px-3 py-1 text-xs">
          Max price
          <input
            type="number"
            min={50}
            className="ml-2 w-24 bg-transparent outline-none"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Math.max(50, Number(e.target.value) || 99999))}
          />
        </label>
        <button
          type="button"
          onClick={() => setMapMode((current) => (current === 'list' ? 'split' : 'list'))}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold"
        >
          <Map className="h-3.5 w-3.5" />
          {mapMode === 'list' ? 'Show map' : 'Hide map'}
        </button>
      </section>

      {isFetching ? (
        <p className="text-sm text-muted-foreground">Loading hotel listings...</p>
      ) : (
        <section className={`grid gap-3 ${mapMode === 'split' ? 'lg:grid-cols-[1.3fr,0.9fr]' : ''}`}>
          <div className="space-y-3">
            {listings.map((hotel) => (
              <PreferenceLink
                key={hotel.hotelId}
                href={`/hotels/${hotel.hotelId}?checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}&rooms=${rooms}&currency=${encodeURIComponent(currency)}`}
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
                    <p className="text-2xl font-bold text-primary">{formatMoney(hotel.currency, hotel.price)}</p>
                    <p className="text-xs text-muted-foreground">/ night</p>
                  </div>
                  <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">View details</span>
                </div>
              </PreferenceLink>
            ))}
            {listings.length === 0 && (
              <p className="rounded-xl border border-border bg-card/70 p-4 text-sm text-muted-foreground">
                No stays found for this filter combination. Reset filters or try another destination.
              </p>
            )}
          </div>

          {mapMode === 'split' ? (
            <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
              <article className="overflow-hidden rounded-2xl border border-border bg-card/85">
                <iframe
                  title="Map view"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`}
                  className="h-[420px] w-full"
                  loading="lazy"
                />
              </article>
              <article className="rounded-2xl border border-border bg-card/85 p-3 text-xs text-muted-foreground">
                Map is centered on destination query and helps visual neighborhood context while you compare listings.
              </article>
            </aside>
          ) : null}
        </section>
      )}
    </main>
  );
}
