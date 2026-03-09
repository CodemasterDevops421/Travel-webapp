'use client';

import { useCallback, type ChangeEvent } from 'react';
import { Map, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

export interface FilterState {
  propertyName: string;
  minPrice: number;
  maxPrice: number;
  minGuestRating: number;
  minReviewCount: number;
  minStars: number;
  amenities: string[];
  propertyTypes: string[];
  maxDistanceKm: number;
}

interface FiltersSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  query?: string;
  onShowMap?: () => void;
}

const AMENITY_OPTIONS = [
  { value: 'free-cancellation', label: 'Free cancellation' },
  { value: 'parking', label: 'Parking' },
  { value: 'breakfast-included', label: 'Breakfast included' },
  { value: 'swimming-pool', label: 'Swimming pool' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'air-conditioning', label: 'Air conditioning' },
  { value: 'gym', label: 'Gym' },
  { value: 'pet-friendly', label: 'Pet-friendly' }
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'villa', label: 'Villa' }
];

export function FiltersSidebar({ filters, onFilterChange, query, onShowMap }: FiltersSidebarProps) {
  const updateFilter = useCallback(
    (patch: Partial<FilterState>) => {
      onFilterChange({ ...filters, ...patch });
    },
    [filters, onFilterChange]
  );

  const toggleCollectionValue = useCallback(
    (key: 'amenities' | 'propertyTypes', value: string) => {
      const current = filters[key];
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      updateFilter({ [key]: next });
    },
    [filters, updateFilter]
  );

  const clearAllFilters = useCallback(() => {
    onFilterChange({
      propertyName: '',
      minPrice: 0,
      maxPrice: 1000,
      minGuestRating: 0,
      minReviewCount: 0,
      minStars: 0,
      amenities: [],
      propertyTypes: [],
      maxDistanceKm: 30
    });
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.propertyName !== '' ||
    filters.minPrice > 0 ||
    filters.maxPrice < 1000 ||
    filters.minGuestRating > 0 ||
    filters.minReviewCount > 0 ||
    filters.minStars > 0 ||
    filters.maxDistanceKm < 30 ||
    filters.amenities.length > 0 ||
    filters.propertyTypes.length > 0;

  return (
    <aside className="surface-shell space-y-5 p-4 lg:w-[292px]">
      <div className="overflow-hidden rounded-[18px] border border-border/70 bg-muted/35">
        <div
          className="relative h-32 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.18)), url(https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(query || 'World')}&zoom=13&size=320x160&sensor=false)`
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="secondary"
              className="gap-2 rounded-full bg-background/95 px-4 text-foreground shadow-sm hover:bg-background"
              onClick={onShowMap}
            >
              <Map className="h-4 w-4" />
              Show on map
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground">Filters</h3>
            <p className="text-xs text-muted-foreground">Refine your shortlist</p>
          </div>
        </div>
        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
          >
            Clear all
          </Button>
        ) : null}
      </div>

      <div className="space-y-5 rounded-[20px] border border-border/70 bg-background/75 p-4">
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Property name</h4>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="For example: Hilton"
              className="border-border/70 bg-card pl-9"
              value={filters.propertyName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilter({ propertyName: event.target.value })}
            />
          </div>
        </section>

        <section className="space-y-4 border-t border-border/70 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Price (per night)</h4>
            <span className="text-xs font-medium text-primary">${filters.minPrice} - ${filters.maxPrice}</span>
          </div>
          <div className="space-y-4 px-1">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Minimum</p>
              <Slider
                value={filters.minPrice}
                max={1000}
                step={10}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const minPrice = Number(event.target.value);
                  updateFilter({
                    minPrice,
                    maxPrice: Math.max(minPrice, filters.maxPrice)
                  });
                }}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Maximum</p>
              <Slider
                value={filters.maxPrice}
                max={1000}
                step={10}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const maxPrice = Number(event.target.value);
                  updateFilter({
                    minPrice: Math.min(filters.minPrice, maxPrice),
                    maxPrice
                  });
                }}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border/70 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Guest rating</h4>
            <span className="text-xs font-medium text-primary">
              {filters.minGuestRating > 0 ? `${filters.minGuestRating.toFixed(1)}+` : 'Any'}
            </span>
          </div>
          <Slider
            value={filters.minGuestRating}
            max={10}
            step={0.5}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilter({ minGuestRating: Number(event.target.value) })}
          />
        </section>

        <section className="space-y-4 border-t border-border/70 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Star rating</h4>
            <span className="text-xs font-medium text-primary">
              {filters.minStars > 0 ? `${filters.minStars.toFixed(1)}+` : 'Any'}
            </span>
          </div>
          <Slider
            value={filters.minStars}
            max={5}
            step={0.5}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilter({ minStars: Number(event.target.value) })}
          />
        </section>

        <section className="space-y-3 border-t border-border/70 pt-4">
          <h4 className="text-sm font-semibold text-foreground">Popular filters</h4>
          <div className="space-y-3">
            {AMENITY_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Checkbox
                  id={`amenity-${option.value}`}
                  checked={filters.amenities.includes(option.value)}
                  onChange={() => toggleCollectionValue('amenities', option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-border/70 pt-4">
          <h4 className="text-sm font-semibold text-foreground">Property type</h4>
          <div className="space-y-3">
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Checkbox
                  id={`property-type-${option.value}`}
                  checked={filters.propertyTypes.includes(option.value)}
                  onChange={() => toggleCollectionValue('propertyTypes', option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4 border-t border-border/70 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Distance from center</h4>
            <span className="text-xs font-medium text-primary">Up to {filters.maxDistanceKm.toFixed(0)} km</span>
          </div>
          <Slider
            value={filters.maxDistanceKm}
            min={1}
            max={30}
            step={1}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilter({ maxDistanceKm: Number(event.target.value) })}
          />
        </section>
      </div>
    </aside>
  );
}
