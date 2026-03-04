'use client';

import { useCallback, type ChangeEvent } from 'react';
import { Map, Search } from 'lucide-react';
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
            const next = current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value];
            updateFilter({ [key]: next });
        },
        [filters, updateFilter]
    );

    const toggleAmenity = useCallback(
        (amenity: string) => {
            toggleCollectionValue('amenities', amenity);
        },
        [toggleCollectionValue]
    );

    const togglePropertyType = useCallback(
        (propertyType: string) => {
            toggleCollectionValue('propertyTypes', propertyType);
        },
        [toggleCollectionValue]
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
        <aside className="w-full space-y-5 lg:w-[300px] shrink-0">
            <div className="relative h-40 overflow-hidden rounded-xl border border-border bg-slate-100 shadow-sm transition-transform hover:shadow-md dark:bg-slate-800">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-70"
                    style={{
                        backgroundImage: `url(https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(query || 'World')}&zoom=13&size=300x160&sensor=false)`
                    }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                        variant="secondary"
                        className="gap-2 shadow-md rounded-full bg-white/90 hover:bg-white text-primary font-semibold dark:bg-gray-900/90 dark:hover:bg-gray-900"
                        onClick={onShowMap}
                    >
                        <Map className="h-4 w-4" />
                        Show on map
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Filters</h3>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                    >
                        Clear all
                    </Button>
                )}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <h4 className="text-sm font-semibold">Property name</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="For example: Hilton"
                        className="pl-9 bg-slate-50 dark:bg-slate-800 border-border/60"
                        value={filters.propertyName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter({ propertyName: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Price (per night)</h4>
                    <span className="text-xs font-medium text-primary">
                        ${filters.minPrice} - ${filters.maxPrice}
                    </span>
                </div>
                <div className="px-2 pt-2">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Minimum</p>
                    <Slider
                        value={filters.minPrice}
                        max={1000}
                        step={10}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const minPrice = Number(e.target.value);
                            updateFilter({
                                minPrice,
                                maxPrice: Math.max(minPrice, filters.maxPrice)
                            });
                        }}
                    />
                    <div className="mt-2" />
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Maximum</p>
                    <Slider
                        value={filters.maxPrice}
                        max={1000}
                        step={10}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const maxPrice = Number(e.target.value);
                            updateFilter({
                                minPrice: Math.min(filters.minPrice, maxPrice),
                                maxPrice
                            });
                        }}
                    />
                    <div className="mt-4 flex justify-between text-xs text-muted-foreground font-medium">
                        <span>$0</span>
                        <span>$1000+</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Guest rating</h4>
                    <span className="text-xs font-medium text-primary">
                        {filters.minGuestRating > 0 ? `${filters.minGuestRating.toFixed(1)}+` : 'Any'}
                    </span>
                </div>
                <div className="px-2 pt-2">
                    <Slider
                        value={filters.minGuestRating}
                        max={10}
                        step={0.5}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter({ minGuestRating: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Review count</h4>
                    <span className="text-xs font-medium text-primary">
                        {filters.minReviewCount > 0 ? `${filters.minReviewCount}+` : 'Any'}
                    </span>
                </div>
                <div className="px-2 pt-2">
                    <Slider
                        value={filters.minReviewCount}
                        max={500}
                        step={25}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter({ minReviewCount: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Star rating</h4>
                    <span className="text-xs font-medium text-primary">
                        {filters.minStars > 0 ? `${filters.minStars.toFixed(1)}+` : 'Any'}
                    </span>
                </div>
                <div className="px-2 pt-2">
                    <Slider
                        value={filters.minStars}
                        max={5}
                        step={0.5}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter({ minStars: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <h4 className="text-sm font-semibold">Popular filters</h4>
                <div className="space-y-3">
                    {AMENITY_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-3 group">
                            <Checkbox
                                id={`amenity-${option.value}`}
                                checked={filters.amenities.includes(option.value)}
                                onChange={() => toggleAmenity(option.value)}
                            />
                            <label
                                htmlFor={`amenity-${option.value}`}
                                className="text-sm font-medium leading-none cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors"
                            >
                                {option.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <h4 className="text-sm font-semibold">Property type</h4>
                <div className="space-y-3">
                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-3 group">
                            <Checkbox
                                id={`property-type-${option.value}`}
                                checked={filters.propertyTypes.includes(option.value)}
                                onChange={() => togglePropertyType(option.value)}
                            />
                            <label
                                htmlFor={`property-type-${option.value}`}
                                className="text-sm font-medium leading-none cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors"
                            >
                                {option.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-white dark:bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Distance from center</h4>
                    <span className="text-xs font-medium text-primary">
                        Up to {filters.maxDistanceKm.toFixed(0)} km
                    </span>
                </div>
                <div className="px-2 pt-2">
                    <Slider
                        value={filters.maxDistanceKm}
                        min={1}
                        max={30}
                        step={1}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter({ maxDistanceKm: Number(e.target.value) })}
                    />
                </div>
            </div>
        </aside>
    );
}
