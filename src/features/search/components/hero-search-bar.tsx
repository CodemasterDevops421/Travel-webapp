'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, MapPin, Search, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAutocomplete } from '@/features/search/hooks/use-autocomplete';
import { parseDiscoveryQuery, serializeDiscoveryQuery } from '@/features/search/lib/discovery-query';
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
    const initialCheckIn = initialValues?.checkIn;
    const initialCheckOut = initialValues?.checkOut;

    const [query, setQuery] = useState(initialValues?.query ?? '');
    const [checkIn, setCheckIn] = useState(() => {
        if (initialCheckIn) {
            return initialCheckIn;
        }
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() + 14);
        return start.toISOString().slice(0, 10);
    });
    const [checkOut, setCheckOut] = useState(() => {
        if (initialCheckOut) {
            return initialCheckOut;
        }
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() + 14);
        const end = new Date(start);
        end.setDate(start.getDate() + 2);
        return end.toISOString().slice(0, 10);
    });
    const [adults, setAdults] = useState(initialValues?.adults ?? 2);
    const [rooms, setRooms] = useState(initialValues?.rooms ?? 1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const today = new Date();

    useEffect(() => {
        if (checkOut <= checkIn) {
            const nextDay = new Date(checkIn);
            nextDay.setDate(nextDay.getDate() + 1);
            setCheckOut(nextDay.toISOString().slice(0, 10));
        }
    }, [checkIn, checkOut]);

    const router = useRouter();
    const language = useSearchUIStore((state) => state.language);
    const currency = useSearchUIStore((state) => state.currency);
    const activeMood = useSearchUIStore((state) => state.activeMood);
    const hasTrackedSearchInput = useRef(false);
    const suggestionsListId = useId();
    const { data, isFetching } = useAutocomplete(query, language);
    const suggestions = data ?? [];
    const isSuggestionsOpen = query.length > 2 && showSuggestions;
    const canSearch = query.trim().length >= 3 && checkIn.length > 0 && checkOut.length > 0 && checkOut > checkIn;

    useEffect(() => {
        setHighlightedIndex(-1);
    }, [query, suggestions.length, showSuggestions]);

    const onSearch = (queryOverride?: string) => {
        const nextQuery = (queryOverride ?? query).trim();
        if (nextQuery.length < 3) {
            return;
        }
        setShowSuggestions(false);

        trackFunnelEvent({
            name: 'search_submitted',
            step: 'search',
            properties: { queryLength: nextQuery.length }
        });

        const params = serializeDiscoveryQuery(
            parseDiscoveryQuery({
                q: nextQuery,
                checkin: checkIn,
                checkout: checkOut,
                guests: String(adults),
                rooms: String(rooms),
                vibe: activeMood ?? undefined,
                language,
                currency
            })
        );
        router.push(`/search?${params.toString()}`);
    };

    const onPickSuggestion = (name: string) => {
        setQuery(name);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
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
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className={cn(
                "relative z-20 mx-auto w-full",
                variant === 'default' ? "max-w-full" : "max-w-7xl",
                className
            )}
        >
            <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="relative w-full">
                <div className="flex w-full flex-col md:flex-row md:items-stretch transition-all rounded-2xl md:rounded-full border border-border/60 bg-card/95 shadow-xl px-2 py-2">

                    {/* Destination Input */}
                    <div className="relative z-50 flex-[1.5]">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            <MapPin className="h-5 w-5 text-primary/80" strokeWidth={1.5} />
                        </div>
                        <Input
                            className="h-14 w-full border-0 bg-transparent pl-14 text-sm font-medium text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0 md:h-16"
                            placeholder="Enter a destination"
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
                            <div
                                className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card p-2 shadow-2xl"
                                style={{ zIndex: 9999 }}
                            >
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
                                                    "flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors hover:bg-accent",
                                                    highlightedIndex === idx && "bg-accent"
                                                )}
                                                onMouseDown={(e) => { e.preventDefault(); onPickSuggestion(item.name); }}
                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                            >
                                                <span className="font-medium text-foreground">{item.name}</span>
                                                <span className="text-xs capitalize text-muted-foreground">{item.source}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Dates - Split into Check-in / Check-out */}
                    <div className="flex flex-1 items-center border-t border-border/20 md:border-t-0 md:border-l">
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                <Calendar className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
                            </div>
                            <input
                                type="date"
                                className="h-14 w-full cursor-pointer bg-transparent pl-10 pr-2 text-xs font-medium text-foreground focus:outline-none md:h-16"
                                value={checkIn}
                                min={today.toISOString().slice(0, 10)}
                                onChange={(e) => setCheckIn(e.target.value)}
                            />
                        </div>
                        <div className="relative flex-1 border-l border-border/20">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                <Calendar className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
                            </div>
                            <input
                                type="date"
                                className="h-14 w-full cursor-pointer bg-transparent pl-10 pr-2 text-xs font-medium text-foreground focus:outline-none md:h-16"
                                value={checkOut}
                                min={checkIn}
                                onChange={(e) => setCheckOut(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Guests & Search Button */}
                    <div className="flex flex-1 items-center justify-between border-t border-border/20 md:border-t-0 md:border-l pl-2 pb-2 pt-2 md:p-0">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button type="button" className="flex flex-1 items-center gap-3 hover:bg-primary/5 px-4 text-left transition-colors h-14 md:h-16 group outline-none focus-visible:bg-primary/5 rounded-l-xl md:rounded-xl">
                                    <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-foreground">{rooms} Room, {adults} Guests</span>
                                    </div>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 border-border shadow-editorial-md p-6 z-[100] rounded-xl" align="end">
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
                            type="submit"
                            disabled={!canSearch}
                            className="mr-2 md:mr-0 h-12 w-12 shrink-0 rounded-full bg-primary flex items-center justify-center p-0 text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                        >
                            <Search className="h-5 w-5" strokeWidth={2.5} />
                        </Button>
                    </div>
                </div>

                {!canSearch ? (
                    <div className="absolute left-0 right-0 -bottom-8 flex justify-center pointer-events-none">
                        <p className={cn(
                            'text-[12px] font-medium drop-shadow-md',
                            variant === 'default' ? 'text-white/90' : 'text-muted-foreground'
                        )}>
                            Select destination, check-in, and check-out to enable search.
                        </p>
                    </div>
                ) : null}

            </form>
        </motion.div>
    );
}
