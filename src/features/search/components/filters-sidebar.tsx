'use client';

import { Map, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

export function FiltersSidebar() {
    return (
        <aside className="w-full space-y-6 lg:w-[300px] shrink-0">
            {/* Map Widget */}
            <div className="relative h-40 overflow-hidden rounded-xl border border-border bg-slate-100 shadow-sm transition-transform hover:shadow-md">
                <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Paris&zoom=13&size=300x160&sensor=false')] bg-cover bg-center opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Button variant="secondary" className="gap-2 shadow-md rounded-full bg-white/90 hover:bg-white text-primary font-semibold">
                        <Map className="h-4 w-4" />
                        Show on map
                    </Button>
                </div>
            </div>

            {/* Filter Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Filters</h3>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground hover:text-primary">
                    Clear filters
                </Button>
            </div>

            {/* Property Name */}
            <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold">Property name</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="For example: Hilton" className="pl-9 bg-slate-50 border-border/60" />
                </div>
            </div>

            {/* Price Slider */}
            <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold">Price (per night)</h4>
                <div className="px-2 pt-2">
                    <Slider defaultValue={50} max={1000} step={10} />
                    <div className="mt-4 flex justify-between text-xs text-muted-foreground font-medium">
                        <span>SGD 0</span>
                        <span>SGD 1000+</span>
                    </div>
                </div>
            </div>

            {/* Popular Filters */}
            <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold">Popular filters</h4>
                <div className="space-y-3">
                    {['Free cancellation', 'Parking', 'Breakfast included', 'Swimming pool', 'Hotels', 'Apartments'].map((label) => (
                        <div key={label} className="flex items-center space-x-3 group">
                            <Checkbox id={label} />
                            <label htmlFor={label} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">
                                {label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Distance Filters */}
            <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold">Distance from center</h4>
                <div className="space-y-3">
                    {['Less than 1 km', 'Less than 3 km', 'Less than 5 km'].map((label) => (
                        <div key={label} className="flex items-center space-x-3 group">
                            <Checkbox id={label} />
                            <label htmlFor={label} className="text-sm font-medium leading-none cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">
                                {label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}
