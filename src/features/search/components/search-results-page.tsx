'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ListFilter, Map as MapIcon } from 'lucide-react';
import type { Route } from 'next';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';
import {
  DEFAULT_LISTING_FILTERS,
  parseListingUiState,
  serializeListingSearchParams,
  type ListingUiState
} from '@/features/search/lib/listing-search-params';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { useWishlist } from '@/shared/hooks/use-wishlist';
import { FiltersSidebar, type FilterState } from './filters-sidebar';
import { HorizontalHotelCard } from './horizontal-hotel-card';

const SearchResultsMap = dynamic(
  () => import('./search-results-map').then((module) => module.SearchResultsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center bg-slate-100 text-sm text-muted-foreground dark:bg-slate-800">
        Preparing map view...
      </div>
    )
  }
);

type SearchResultsPageProps = {
  query: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  language: string;
  currency: string;
};

const ITEMS_PER_PAGE = 10;

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferPropertyType(name: string): string {
  const token = normalizeToken(name);
  if (token.includes('resort')) return 'resort';
  if (token.includes('apartment') || token.includes('suite')) return 'apartment';
  if (token.includes('hostel')) return 'hostel';
  if (token.includes('villa')) return 'villa';
  return 'hotel';
}

function computePopularityScore(price: number | null, reviewScore: number | null | undefined, starRating: number | null) {
  return (reviewScore ?? 0) * 12 + (starRating ?? 0) * 6 - (price ?? 0) / 120;
}

export function SearchResultsPage({ query, checkin, checkout, adults, rooms, language, currency }: SearchResultsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [deferMapRender, setDeferMapRender] = useState(false);
  const { isSaved, toggleSave, authRequired, clearAuthRequired } = useWishlist();

  const queryParams = useMemo(
    () => ({ query, checkin, checkout, adults, rooms, language, currency }),
    [query, checkin, checkout, adults, rooms, language, currency]
  );

  const urlState = useMemo(() => {
    return parseListingUiState(Object.fromEntries(searchParams.entries()));
  }, [searchParams]);

  const discoveryContext = useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);

  const apiFilters = useMemo(
    () => ({
      brief: urlState.filters.propertyName || undefined,
      minPrice: urlState.filters.minPrice > 0 ? urlState.filters.minPrice : undefined,
      minStars: urlState.filters.minStars > 0 ? urlState.filters.minStars : undefined,
      minGuestRating: urlState.filters.minGuestRating > 0 ? urlState.filters.minGuestRating : undefined,
      maxPrice: urlState.filters.maxPrice < DEFAULT_LISTING_FILTERS.maxPrice ? urlState.filters.maxPrice : undefined,
      page: urlState.page,
      limit: ITEMS_PER_PAGE
    }),
    [urlState.filters, urlState.page]
  );

  const { data: previewEnvelope, isFetching } = usePropertyPreview(
    query,
    language,
    currency,
    checkin,
    checkout,
    adults,
    rooms,
    apiFilters
  );

  const updateUrlState = useCallback(
    (updater: (previous: ListingUiState) => ListingUiState) => {
      const nextState = updater(urlState);
      const params = serializeListingSearchParams({
        query: queryParams,
        ui: nextState
      });
      router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
    },
    [pathname, queryParams, router, urlState]
  );

  const listings = useMemo(() => {
    const source = [...(previewEnvelope?.data ?? [])];
    const filtered = source.filter((hotel) => {
      const price = hotel.price ?? 0;
      const review = hotel.reviewScore ?? 0;
      const stars = hotel.starRating ?? 0;
      const name = (hotel.name ?? '').toLowerCase();

      if (urlState.filters.maxPrice < DEFAULT_LISTING_FILTERS.maxPrice && price > urlState.filters.maxPrice) {
        return false;
      }
      if (urlState.filters.minPrice > 0 && price < urlState.filters.minPrice) {
        return false;
      }
      if (urlState.filters.minGuestRating > 0 && review < urlState.filters.minGuestRating) {
        return false;
      }
      if (urlState.filters.minStars > 0 && stars < urlState.filters.minStars) {
        return false;
      }
      if (urlState.filters.propertyName && !name.includes(urlState.filters.propertyName.toLowerCase())) {
        return false;
      }

      if (urlState.filters.amenities.length > 0) {
        const hotelAmenities = (hotel.amenities ?? []).map(normalizeToken);
        const hasAllAmenities = urlState.filters.amenities.every((amenity) => hotelAmenities.includes(amenity));
        if (!hasAllAmenities) return false;
      }

      if (urlState.filters.propertyTypes.length > 0) {
        const propertyType = inferPropertyType(hotel.name ?? '');
        if (!urlState.filters.propertyTypes.includes(propertyType)) {
          return false;
        }
      }

      const distanceFromCenter = Number((hotel as { distanceFromCenterKm?: unknown }).distanceFromCenterKm);
      if (
        Number.isFinite(distanceFromCenter) &&
        distanceFromCenter > 0 &&
        distanceFromCenter > urlState.filters.maxDistanceKm
      ) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (urlState.sort === 'price') {
        return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
      }
      if (urlState.sort === 'rating') {
        return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
      }
      return (
        computePopularityScore(b.price, b.reviewScore, b.starRating) -
        computePopularityScore(a.price, a.reviewScore, a.starRating)
      );
    });

    return filtered;
  }, [previewEnvelope, urlState.filters, urlState.sort]);

  const totalPages = Math.max(1, Math.ceil(listings.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(urlState.page, totalPages);

  useEffect(() => {
    if (urlState.page > totalPages) {
      updateUrlState((previous) => ({
        ...previous,
        page: totalPages
      }));
    }
  }, [totalPages, updateUrlState, urlState.page]);

  useEffect(() => {
    if (urlState.view !== 'map') {
      setDeferMapRender(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setDeferMapRender(true);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [urlState.view]);

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return listings.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, listings]);

  const activeFilterCount =
    (urlState.filters.propertyName ? 1 : 0) +
    (urlState.filters.minPrice > 0 ? 1 : 0) +
    (urlState.filters.maxPrice < DEFAULT_LISTING_FILTERS.maxPrice ? 1 : 0) +
    (urlState.filters.minGuestRating > 0 ? 1 : 0) +
    (urlState.filters.minStars > 0 ? 1 : 0) +
    (urlState.filters.maxDistanceKm < DEFAULT_LISTING_FILTERS.maxDistanceKm ? 1 : 0) +
    urlState.filters.amenities.length +
    urlState.filters.propertyTypes.length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-white p-3 shadow-sm dark:bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {isFetching ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Getting the best deals...
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">{listings.length}</span> properties found
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 lg:hidden"
            onClick={() => setShowMobileFilters((previous) => !previous)}
          >
            <ListFilter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Sort by:</span>
            <select
              className="cursor-pointer bg-transparent font-semibold text-foreground outline-none"
              value={urlState.sort}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                updateUrlState((previous) => ({
                  ...previous,
                  sort: event.target.value as ListingUiState['sort'],
                  page: 1
                }));
              }}
            >
              <option value="popularity">popularity</option>
              <option value="price">price</option>
              <option value="rating">guest rating</option>
            </select>
          </div>

          <div className="flex rounded-lg border border-border/50 bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => {
                updateUrlState((previous) => ({ ...previous, view: 'grid' }));
              }}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all',
                urlState.view === 'grid'
                  ? 'bg-white text-primary shadow-sm dark:bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ListFilter className="h-3 w-3" />
              Grid
            </button>
            <button
              onClick={() => {
                updateUrlState((previous) => ({ ...previous, view: 'map' }));
              }}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all',
                urlState.view === 'map'
                  ? 'bg-white text-primary shadow-sm dark:bg-card'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MapIcon className="h-3 w-3" />
              Map
            </button>
          </div>
        </div>
      </div>

      {previewEnvelope?.degraded && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Live inventory is partially degraded</p>
          <p>
            Showing {previewEnvelope.freshness} results as of {new Date(previewEnvelope.asOf).toLocaleString()}.
            {previewEnvelope.degradedReason ? ` Reason: ${previewEnvelope.degradedReason}.` : ''}
          </p>
        </div>
      )}

      {showMobileFilters && (
        <div className="lg:hidden">
            <FiltersSidebar
              filters={urlState.filters}
              onFilterChange={(nextFilters: FilterState) => {
                updateUrlState((previous) => ({
                  ...previous,
                  filters: nextFilters,
                  page: 1
                }));
              }}
              onShowMap={() => {
                updateUrlState((previous) => ({ ...previous, view: 'map' }));
                setShowMobileFilters(false);
              }}
              query={query}
            />
          </div>
        )}

      <div className="grid gap-8 lg:grid-cols-[300px,1fr]">
        <div className="sticky top-24 hidden self-start lg:block">
            <FiltersSidebar
              filters={urlState.filters}
              onFilterChange={(nextFilters: FilterState) => {
                updateUrlState((previous) => ({
                  ...previous,
                  filters: nextFilters,
                  page: 1
                }));
              }}
              onShowMap={() => {
                updateUrlState((previous) => ({ ...previous, view: 'map' }));
              }}
              query={query}
            />
          </div>

        <div className="space-y-4">
          {urlState.view === 'map' && (
            <article className="mb-4 overflow-hidden rounded-xl border border-border shadow-sm">
              {deferMapRender ? (
                <SearchResultsMap hotels={paginatedListings} />
              ) : (
                <div className="flex h-[320px] items-center justify-center bg-slate-100 text-sm text-muted-foreground dark:bg-slate-800">
                  Preparing map view...
                </div>
              )}
            </article>
          )}

          {isFetching ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-48 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
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
                  discoveryContext={discoveryContext}
                  saved={isSaved(hotel.hotelId)}
                  showAuthPrompt={authRequired}
                  onToggleSave={(payload) => {
                    clearAuthRequired();
                    void toggleSave(payload);
                  }}
                />
              ))}

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateUrlState((previous) => ({
                        ...previous,
                        page: Math.max(1, currentPage - 1)
                      }));
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
                      updateUrlState((previous) => ({
                        ...previous,
                        page: Math.min(totalPages, currentPage + 1)
                      }));
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
            <div className="rounded-xl border border-dashed border-border bg-slate-50 p-12 text-center text-muted-foreground dark:bg-slate-900">
              <p className="mb-2 text-lg font-medium text-foreground">No properties found</p>
              <p className="text-sm">Try adjusting your filters or search criteria.</p>
              <Button
                variant="link"
                onClick={() => {
                  updateUrlState((previous) => ({
                    ...previous,
                    filters: { ...DEFAULT_LISTING_FILTERS },
                    page: 1
                  }));
                }}
                className="mt-4"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
