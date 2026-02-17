'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ListFilter, Map as MapIcon } from 'lucide-react';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { FiltersSidebar } from './filters-sidebar';
import { HorizontalHotelCard } from './horizontal-hotel-card';

type SearchResultsPageProps = {
  query: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  language: string;
  currency: string;
};

export function SearchResultsPage({ query, checkin, checkout, adults, rooms, language, currency }: SearchResultsPageProps) {
  const { data, isFetching } = usePropertyPreview(query, language, currency, checkin, checkout, adults, rooms);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating-desc'>('recommended');
  const [minRating, setMinRating] = useState(0);
  const [minStars, setMinStars] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number>(99999);
  const [mapMode, setMapMode] = useState<'list' | 'split'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [data, maxPrice, minRating, minStars, sortBy]);

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return listings.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, listings]);

  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Sort & Map Toggle Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between rounded-xl bg-white p-3 shadow-sm border border-border/50">
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Getting the best deals...
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort By:</span>
            <select
              className="bg-transparent font-semibold text-foreground outline-none cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="recommended">our top picks</option>
              <option value="price-asc">lowest price first</option>
              <option value="price-desc">highest price first</option>
              <option value="rating-desc">guest rating</option>
            </select>
          </div>

          <div className="flex rounded-lg border border-border/50 bg-slate-100 p-1">
            <button
              onClick={() => setMapMode('list')}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all",
                mapMode === 'list' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListFilter className="h-3 w-3" />
              List
            </button>
            <button
              onClick={() => setMapMode('split')}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all",
                mapMode !== 'list' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapIcon className="h-3 w-3" />
              Map
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px,1fr]">
        {/* Sidebar Filters */}
        <div className="hidden lg:block sticky top-24 self-start">
          <FiltersSidebar />
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {mapMode === 'split' && (
            <article className="overflow-hidden rounded-xl border border-border shadow-sm mb-4">
              <iframe
                title="Map view"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`}
                className="h-[320px] w-full"
                loading="lazy"
              />
            </article>
          )}

          {isFetching ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 w-full animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <>
              {paginatedListings.map((hotel) => (
                <HorizontalHotelCard
                  key={hotel.hotelId}
                  hotel={hotel}
                  checkin={checkin}
                  checkout={checkout}
                  adults={adults}
                  rooms={rooms}
                  currency={currency}
                />
              ))}

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground bg-slate-50">
              <p className="text-lg font-medium text-foreground mb-2">No properties found</p>
              <p className="text-sm">Try adjusting your filters or search criteria.</p>
              <Button variant="link" onClick={() => {
                setMinRating(0);
                setMinStars(0);
                setMaxPrice(99999);
              }} className="mt-4">
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
