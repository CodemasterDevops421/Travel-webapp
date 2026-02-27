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
                variant === 'default' ? "max-w-5xl" : "max-w-7xl",
                className
            )}
        >
            <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="flex flex-col md:flex-row md:items-stretch transition-all rounded-full bg-transparent">

                {/* Destination Input */}
                <div className="relative z-50 flex-1">
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
                        <div
                            className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700"
                            style={{ zIndex: 9999, backgroundColor: '#ffffff', color: '#1e293b', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                        >
                            {isFetching ? (
                                <div className="p-4 text-sm" style={{ color: '#64748b' }}>Searching...</div>
                            ) : suggestions.length === 0 ? (
                                <div className="p-4 text-sm" style={{ color: '#64748b' }}>No destinations found.</div>
                            ) : (
                                <ul className="max-h-[300px] overflow-y-auto py-2">
                                    {suggestions.map((item, idx) => (
                                        <li
                                            key={item.id}
                                            className={cn(
                                                "flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors hover:bg-blue-50",
                                                highlightedIndex === idx && "bg-blue-50"
                                            )}
                                            onMouseDown={(e) => { e.preventDefault(); onPickSuggestion(item.name); }}
                                            onMouseEnter={() => setHighlightedIndex(idx)}
                                        >
                                            <span style={{ color: '#0f172a', fontWeight: 500 }}>{item.name}</span>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'capitalize' }}>{item.source}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Dates - Split into Check-in / Check-out */}
                <div className="flex flex-1 items-center border-t border-border/50 md:border-t-0 md:border-l md:border-border/50">
                    <div className="relative flex-1">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            <Calendar className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
                        </div>
                        <input
                            type="date"
                            className="h-14 w-full cursor-pointer bg-transparent pl-12 pr-2 text-sm font-medium text-foreground focus:outline-none md:h-16"
                            value={checkIn}
                            min={today.toISOString().slice(0, 10)}
                            onChange={(e) => setCheckIn(e.target.value)}
                        />
                    </div>
                    <div className="relative flex-1 border-l border-border/30">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            <Calendar className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
                        </div>
                        <input
                            type="date"
                            className="h-14 w-full cursor-pointer bg-transparent pl-12 pr-2 text-sm font-medium text-foreground focus:outline-none md:h-16"
                            value={checkOut}
                            min={checkIn}
                            onChange={(e) => setCheckOut(e.target.value)}
                        />
                    </div>
                </div>

                {/* Guests & Search Button */}
                <div className="flex flex-1 items-stretch border-t border-border/50 md:border-t-0 md:border-l md:border-border/50">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button type="button" className="flex flex-1 items-center gap-3 hover:bg-primary/5 px-6 text-left transition-colors md:h-16 group outline-none focus-visible:bg-primary/5">
                                <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground">{adults} Guests</span>
                                    <span className="text-xs text-muted-foreground">{rooms} Room{rooms > 1 ? 's' : ''}</span>
                                </div>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 border-border shadow-editorial-md p-6 z-[100] rounded-none" align="end">
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
                        size="lg"
                        disabled={!canSearch}
                        className="rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 px-8 text-base font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:brightness-110 active:scale-95 md:h-14 disabled:opacity-50 disabled:shadow-none"
                    >
                        Search
                    </Button>
                </div>

            </form>
            {!canSearch ? (
                <p className={cn(
                    'mt-2 text-xs font-medium md:text-right',
                    variant === 'default' ? 'text-slate-500' : 'text-muted-foreground'
                )}>
                    Select destination, check-in, and check-out to enable search.
                </p>
            ) : null}
        </motion.div>
    );
}
