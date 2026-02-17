'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, MapPin, Search, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAutocomplete } from '@/features/search/hooks/use-autocomplete';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { trackFunnelEvent } from '@/shared/lib/analytics';
import { cn } from '@/shared/lib/utils';

export type HeroSearchBarProps = {
    variant?: 'default' | 'compact';
    className?: string;
    initialValues?: {
        query?: string;
        checkIn?: string;
        checkOut?: string;
        adults?: number;
        rooms?: number;
    };
};

export function HeroSearchBar({ variant = 'default', className, initialValues }: HeroSearchBarProps) {
    const [query, setQuery] = useState(initialValues?.query ?? '');
    // Initialize with empty strings to prevent hydration mismatch
    const [checkIn, setCheckIn] = useState(initialValues?.checkIn ?? '');
    const [checkOut, setCheckOut] = useState(initialValues?.checkOut ?? '');
    const [adults, setAdults] = useState(initialValues?.adults ?? 2);
    const [rooms, setRooms] = useState(initialValues?.rooms ?? 1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    useEffect(() => {
        if (!checkIn && !initialValues?.checkIn) {
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() + 14);
            setCheckIn(start.toISOString().slice(0, 10));

            const end = new Date(start);
            end.setDate(start.getDate() + 2);
            setCheckOut(end.toISOString().slice(0, 10));
        }
    }, []);

    const router = useRouter();
    const language = useSearchUIStore((state) => state.language);
    const currency = useSearchUIStore((state) => state.currency);
    const hasTrackedSearchInput = useRef(false);
    const suggestionsListId = useId();
    const { data, isFetching } = useAutocomplete(query, language);
    const suggestions = data ?? [];
    const isSuggestionsOpen = query.length > 2 && showSuggestions;

    useEffect(() => {
        setHighlightedIndex(-1);
    }, [query, suggestions.length, showSuggestions]);

    const onSearch = () => {
        if (query.trim().length < 3) return;
        const nextQuery = query.trim();
        setShowSuggestions(false);

        trackFunnelEvent({
            name: 'search_submitted',
            step: 'search',
            properties: { queryLength: nextQuery.length }
        });

        const params = new URLSearchParams({
            q: nextQuery,
            checkin: checkIn,
            checkout: checkOut,
            adults: String(adults),
            rooms: String(rooms),
            language,
            currency
        });
        router.push(`/search?${params.toString()}`);
    };

    const onPickSuggestion = (name: string) => {
        setQuery(name);
        setShowSuggestions(false);
        trackFunnelEvent({
            name: 'autocomplete_suggestion_selected',
            step: 'search',
            properties: { suggestionLength: name.length }
        });
    };

    const onAutocompleteKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            setShowSuggestions(false);
            setHighlightedIndex(-1);
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!isSuggestionsOpen || suggestions.length === 0) {
                setShowSuggestions(true);
                return;
            }
            setHighlightedIndex((c) => (c < 0 ? 0 : Math.min(c + 1, suggestions.length - 1)));
            return;
        }
        if (event.key === 'ArrowUp') {
            if (!isSuggestionsOpen || suggestions.length === 0) return;
            event.preventDefault();
            setHighlightedIndex((c) => (c <= 0 ? 0 : c - 1));
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            if (isSuggestionsOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                onPickSuggestion(suggestions[highlightedIndex].name);
                return;
            }
            onSearch();
        }
    };

    return (
        <motion.div
            className={cn(
                "relative z-20 mx-auto w-full",
                variant === 'default' ? "max-w-5xl" : "max-w-7xl",
                className
            )}
        >
            {/* Search Bar Container - Fully Rounded Pill */}
            <div className={cn(
                "flex flex-col gap-2 bg-white p-2 md:flex-row md:items-center md:gap-0 transition-all",
                variant === 'default'
                    ? "rounded-[2rem] lg:rounded-full shadow-soft-xl border border-white/20"
                    : "rounded-3xl lg:rounded-full shadow-sm border border-border"
            )}>

                {/* Destination Input */}
                <div className="relative flex-1 md:border-r md:border-border/30">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <MapPin className="h-5 w-5 text-primary/80" strokeWidth={1.5} />
                    </div>
                    <Input
                        className="h-14 w-full border-0 bg-transparent pl-14 text-base font-medium text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 md:h-16"
                        placeholder="Where are you going?"
                        value={query}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!hasTrackedSearchInput.current && val.trim().length > 0) {
                                hasTrackedSearchInput.current = true;
                                trackFunnelEvent({ name: 'search_input_started', step: 'discovery' });
                            }
                            setQuery(val);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={onAutocompleteKeyDown}
                    />

                    {/* Autocomplete Dropdown */}
                    {isSuggestionsOpen && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-4 overflow-hidden rounded-[1.5rem] border border-border/60 bg-white/95 backdrop-blur-sm shadow-electric-lg ring-1 ring-black/5 p-2">
                            {isFetching ? (
                                <div className="p-4 text-sm text-muted-foreground">Searching...</div>
                            ) : suggestions.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">No destinations found.</div>
                            ) : (
                                <ul className="max-h-[300px] overflow-y-auto py-2">
                                    {suggestions.map((item, idx) => (
                                        <li
                                            key={item.id}
                                            className={cn(
                                                "flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors hover:bg-primary/5",
                                                highlightedIndex === idx && "bg-primary/5"
                                            )}
                                            onMouseDown={(e) => { e.preventDefault(); onPickSuggestion(item.name); }}
                                            onMouseEnter={() => setHighlightedIndex(idx)}
                                        >
                                            <span className="font-medium text-foreground">{item.name}</span>
                                            <span className="text-xs text-muted-foreground capitalize">{item.source}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Dates - Split into Check-in / Check-out */}
                <div className="flex flex-1 items-center border-b border-border/30 md:border-b-0 md:border-r">
                    <div className="relative flex-1">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            <Calendar className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
                        </div>
                        <input
                            type="date"
                            className="h-14 w-full cursor-pointer bg-transparent pl-12 pr-2 text-sm font-medium focus:outline-none md:h-16"
                            value={checkIn}
                            onChange={(e) => setCheckIn(e.target.value)}
                        />
                    </div>
                    <div className="relative flex-1 border-l border-border/30">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            <Calendar className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
                        </div>
                        <input
                            type="date"
                            className="h-14 w-full cursor-pointer bg-transparent pl-12 pr-2 text-sm font-medium focus:outline-none md:h-16"
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                        />
                    </div>
                </div>

                {/* Guests & Search Button */}
                <div className="flex flex-1 items-center gap-2 pl-2 pr-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button type="button" className="flex h-14 flex-1 items-center gap-3 rounded-full hover:bg-primary/5 px-6 text-left transition-colors md:h-16 group">
                                <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground">{adults} Guests</span>
                                    <span className="text-xs text-muted-foreground">{rooms} Room{rooms > 1 ? 's' : ''}</span>
                                </div>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 rounded-[1.5rem] border-border/60 shadow-electric-md p-6 z-[100]" align="end">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="block text-sm font-semibold">Adults</span>
                                        <span className="text-xs text-muted-foreground">Ages 13 or above</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setAdults(Math.max(1, adults - 1))}>-</Button>
                                        <span className="w-4 text-center text-sm font-medium">{adults}</span>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setAdults(Math.min(10, adults + 1))}>+</Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="block text-sm font-semibold">Rooms</span>
                                        <span className="text-xs text-muted-foreground">Max 5 per booking</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setRooms(Math.max(1, rooms - 1))}>-</Button>
                                        <span className="w-4 text-center text-sm font-medium">{rooms}</span>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setRooms(Math.min(5, rooms + 1))}>+</Button>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button
                        size="lg"
                        onClick={onSearch}
                        className="h-12 rounded-full px-8 text-base font-semibold shadow-electric-md transition-all hover:scale-105 hover:shadow-electric-lg active:scale-95 md:h-14"
                    >
                        Search
                    </Button>
                </div>

            </div>
        </motion.div>
    );
}
