'use client';

import { format } from 'date-fns';
import { Globe2, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ListingUiState } from '@/features/search/lib/listing-search-params';
import { cn } from '@/shared/lib/utils';

type QuickFilterKey =
  | 'topRated'
  | 'luxury'
  | 'budget'
  | 'freeCancellation'
  | 'breakfast'
  | 'pool'
  | 'nearCenter';

type QuickFilterSelection = Record<QuickFilterKey, boolean>;

interface ListingDiscoveryToolbarProps {
  query: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  language: string;
  currency: string;
  currentView: ListingUiState['view'];
  activeFilterCount: number;
  quickFilters: QuickFilterSelection;
  onToggleQuickFilter: (key: QuickFilterKey) => void;
  onResetFilters: () => void;
  onToggleView: (view: ListingUiState['view']) => void;
}

const QUICK_FILTER_ITEMS: Array<{
  key: QuickFilterKey;
  label: string;
  description: string;
}> = [
  { key: 'topRated', label: 'Top rated', description: 'Guest score 8.5+' },
  { key: 'luxury', label: '5-star', description: 'Premium stays only' },
  { key: 'budget', label: 'Budget picks', description: 'Keep totals tighter' },
  { key: 'freeCancellation', label: 'Free cancellation', description: 'Flexible booking terms' },
  { key: 'breakfast', label: 'Breakfast', description: 'Morning included' },
  { key: 'pool', label: 'Pool', description: 'Resort-style amenity' },
  { key: 'nearCenter', label: 'Near center', description: 'Within 5 km' }
];

function formatStayDates(checkin: string, checkout: string): string {
  const start = new Date(checkin);
  const end = new Date(checkout);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Flexible dates';
  }
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
}

export function ListingDiscoveryToolbar({
  query,
  checkin,
  checkout,
  adults,
  rooms,
  language,
  currency,
  currentView,
  activeFilterCount,
  quickFilters,
  onToggleQuickFilter,
  onResetFilters,
  onToggleView
}: ListingDiscoveryToolbarProps) {
  return (
    <section className="rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95))] p-5 text-white shadow-xl shadow-slate-900/15">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            <Sparkles className="h-3.5 w-3.5" />
            Hotels
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Same stays in {query}, tuned for how you want to book.
            </h1>
            <p className="max-w-3xl text-sm text-white/70 sm:text-base">
              Tighten the list fast with map-first discovery controls, flexible-booking shortcuts, and a cleaner trip snapshot.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/80">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5">
              <MapPin className="h-4 w-4 text-emerald-300" />
              {formatStayDates(checkin, checkout)}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5">
              <SlidersHorizontal className="h-4 w-4 text-sky-300" />
              {adults} guest{adults > 1 ? 's' : ''} · {rooms} room{rooms > 1 ? 's' : ''}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5">
              <Globe2 className="h-4 w-4 text-amber-300" />
              {language.toUpperCase()} · {currency}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Active filters</p>
            <p className="mt-2 text-3xl font-semibold">{activeFilterCount}</p>
            <p className="mt-1 text-sm text-white/65">
              {activeFilterCount === 0 ? 'Start with quick filters below.' : 'Trim the results without reopening the sidebar.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">View mode</p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant={currentView === 'grid' ? 'secondary' : 'ghost'}
                className={cn(
                  'h-9 flex-1 rounded-full border border-white/10 text-white hover:bg-white/15 hover:text-white',
                  currentView === 'grid' ? 'bg-white text-slate-900 hover:bg-white/90 hover:text-slate-900' : 'bg-white/5'
                )}
                onClick={() => onToggleView('grid')}
              >
                Grid
              </Button>
              <Button
                type="button"
                variant={currentView === 'map' ? 'secondary' : 'ghost'}
                className={cn(
                  'h-9 flex-1 rounded-full border border-white/10 text-white hover:bg-white/15 hover:text-white',
                  currentView === 'map' ? 'bg-white text-slate-900 hover:bg-white/90 hover:text-slate-900' : 'bg-white/5'
                )}
                onClick={() => onToggleView('map')}
              >
                Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {QUICK_FILTER_ITEMS.map((item) => {
          const active = quickFilters[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggleQuickFilter(item.key)}
              className={cn(
                'rounded-full border px-4 py-2 text-left transition',
                active
                  ? 'border-white bg-white text-slate-950 shadow-lg'
                  : 'border-white/12 bg-white/6 text-white hover:border-white/30 hover:bg-white/12'
              )}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className={cn('block text-xs', active ? 'text-slate-600' : 'text-white/60')}>
                {item.description}
              </span>
            </button>
          );
        })}
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-full border border-dashed border-white/25 px-4 py-2 text-sm font-semibold text-white/75 transition hover:border-white/45 hover:text-white"
          >
            Reset filters
          </button>
        ) : null}
      </div>
    </section>
  );
}
