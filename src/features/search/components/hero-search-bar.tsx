'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Calendar, MapPin, Search, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
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

function formatSearchDate(value: string): string {
    if (!value) return 'Select date';
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
    }).format(parsed);
}

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
    const reduceMotion = useReducedMotion();
    const language = useSearchUIStore((state) => state.language);
    const currency = useSearchUIStore((state) => state.currency);
    const activeMood = useSearchUIStore((state) => state.activeMood);
    const hasTrackedSearchInput = useRef(false);
    const suggestionsListId = useId();
    const { data, isFetching } = useAutocomplete(query, language);
    const suggestions = data ?? [];
    const isSuggestionsOpen = query.length > 2 && showSuggestions;
    const canSearch = query.trim().length >= 3 && checkIn.length > 0 && checkOut.length > 0 && checkOut > checkIn;
    const isCompact = variant === 'compact';
    const isHero = variant === 'default';
    const shellMotionProps = reduceMotion
        ? { initial: false, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.01 } }
        : {
            initial: { opacity: 0, y: 10, scale: 0.985 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
        };
    const panelMotionProps = reduceMotion
        ? { initial: false, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.01 } }
        : {
            initial: { opacity: 0, y: 8, scale: 0.985 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 4, scale: 0.99 },
            transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
        };

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
            {...shellMotionProps}
            data-motion-mode={reduceMotion ? 'reduced' : 'default'}
            data-shell-variant={variant}
            className={cn(
                "relative z-20 mx-auto w-full",
                variant === 'default' ? "max-w-full" : "max-w-7xl",
                className
            )}
        >
            <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="relative w-full">
                <div
                    className={cn(
                        "flex w-full flex-col transition-[background-color,border-color,box-shadow,transform,opacity] duration-300 md:flex-row md:items-stretch",
                        isCompact
                            ? "rounded-[18px] border border-border/80 bg-card px-2 py-2 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.28)] supports-[backdrop-filter]:bg-card/95 md:rounded-full"
                            : "rounded-[24px] border border-white/85 bg-white px-2 py-2 shadow-[0_32px_60px_-34px_rgba(17,12,40,0.6)] supports-[backdrop-filter]:bg-white/96 md:rounded-full"
                    )}
                >

                    {/* Destination Input */}
                    <div className="relative z-50 flex-[1.5]">
                        {isHero ? (
                            <span className="ui-label pointer-events-none absolute left-14 top-3 hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:block">
                                Where
                            </span>
                        ) : null}
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
                            isCompact ? "left-4" : "left-6"
                        )}>
                            <MapPin className={cn("text-primary/80", isCompact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={1.5} />
                        </div>
                        <Input
                            aria-activedescendant={
                                highlightedIndex >= 0 && suggestions[highlightedIndex]
                                    ? `${suggestionsListId}-option-${suggestions[highlightedIndex].id}`
                                    : undefined
                            }
                            aria-autocomplete="list"
                            aria-controls={isSuggestionsOpen ? suggestionsListId : undefined}
                            aria-expanded={isSuggestionsOpen}
                            aria-label="Destination"
                            className={cn(
                                "w-full border-0 bg-transparent text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0",
                                isCompact
                                    ? "h-10 pl-10 text-xs font-medium leading-none md:h-11 md:truncate"
                                    : "h-14 pl-14 text-sm font-medium leading-none md:h-16 md:pt-5"
                            )}
                            role="combobox"
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
                            <motion.div
                                {...panelMotionProps}
                                data-motion-mode={reduceMotion ? 'reduced' : 'default'}
                                data-testid="destination-suggestions-panel"
                                className="absolute left-0 right-0 top-full mt-2 origin-top rounded-2xl border border-border bg-card/98 p-2 shadow-[var(--surface-shadow-lg)] backdrop-blur-xl"
                                style={{ zIndex: 9999 }}
                            >
                                {isFetching ? (
                                    <div className="p-4 text-sm text-muted-foreground">Searching...</div>
                                ) : suggestions.length === 0 ? (
                                    <div className="p-4 text-sm text-muted-foreground">No destinations found.</div>
                                ) : (
                                    <ul
                                        id={suggestionsListId}
                                        role="listbox"
                                        aria-label="Destination suggestions"
                                        className="max-h-[300px] overflow-y-auto py-2"
                                    >
                                        {suggestions.map((item, idx) => (
                                            <li
                                                id={`${suggestionsListId}-option-${item.id}`}
                                                key={item.id}
                                                aria-selected={highlightedIndex === idx}
                                                className={cn(
                                                    "flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm transition-[background-color,transform] duration-200 hover:bg-accent motion-safe:hover:translate-x-0.5",
                                                    highlightedIndex === idx && "bg-accent"
                                                )}
                                                role="option"
                                                onMouseDown={(e) => { e.preventDefault(); onPickSuggestion(item.name); }}
                                                onMouseEnter={() => setHighlightedIndex(idx)}
                                            >
                                                <span className="font-medium text-foreground">{item.name}</span>
                                                <span className="text-xs capitalize text-muted-foreground">{item.source}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Dates - Split into Check-in / Check-out */}
                    <div className="flex flex-1 items-center border-t border-border/20 md:flex-[0.94] md:border-t-0 md:border-l">
                        {isHero ? (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        aria-label="Dates"
                                        type="button"
                                        className="relative grid h-14 w-full grid-cols-2 text-left md:h-16 md:pt-5"
                                    >
                                        <span className="ui-label pointer-events-none absolute left-10 top-3 hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:block">
                                            Dates
                                        </span>
                                        <span className="relative flex items-center pl-10 pr-3 text-sm font-medium text-foreground">
                                            <Calendar className="absolute left-4 h-4 w-4 text-primary/80" strokeWidth={1.5} />
                                            <span className="numeric-tight whitespace-nowrap">{formatSearchDate(checkIn)}</span>
                                        </span>
                                        <span className="relative flex items-center border-l border-border/20 pl-10 pr-3 text-sm font-medium text-foreground">
                                            <Calendar className="absolute left-4 h-4 w-4 text-primary/80" strokeWidth={1.5} />
                                            <span className="numeric-tight whitespace-nowrap">{formatSearchDate(checkOut)}</span>
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[360px] rounded-[20px] border border-border bg-card/98 p-4 shadow-[var(--surface-shadow-lg)] backdrop-blur-xl" align="center">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <label className="space-y-2 text-sm">
                                            <span className="ui-label block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Check-in</span>
                                            <input
                                                type="date"
                                                className="numeric-tight h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                                value={checkIn}
                                                min={today.toISOString().slice(0, 10)}
                                                onChange={(e) => setCheckIn(e.target.value)}
                                            />
                                        </label>
                                        <label className="space-y-2 text-sm">
                                            <span className="ui-label block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Check-out</span>
                                            <input
                                                type="date"
                                                className="numeric-tight h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                                value={checkOut}
                                                min={checkIn}
                                                onChange={(e) => setCheckOut(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        ) : (
                            <>
                                <div className="relative flex-1">
                                    <div className={cn(
                                        "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
                                        isCompact && "left-3"
                                    )}>
                                        <Calendar className={cn("text-primary/80", isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} strokeWidth={1.5} />
                                    </div>
                                    <input
                                        type="date"
                                        className={cn(
                                        "w-full cursor-pointer bg-transparent font-medium text-foreground focus:outline-none",
                                        isCompact
                                            ? "numeric-tight h-11 pl-8 pr-2 text-[10px] leading-none md:h-12 md:text-[10.5px]"
                                                : "h-14 pl-10 pr-2 text-xs leading-none md:h-16 md:pt-5"
                                        )}
                                        value={checkIn}
                                        min={today.toISOString().slice(0, 10)}
                                        onChange={(e) => setCheckIn(e.target.value)}
                                    />
                                </div>
                                <div className="relative flex-1 border-l border-border/20">
                                    <div className={cn(
                                        "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
                                        isCompact && "left-3"
                                    )}>
                                        <Calendar className={cn("text-primary/80", isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} strokeWidth={1.5} />
                                    </div>
                                    <input
                                        type="date"
                                        className={cn(
                                        "w-full cursor-pointer bg-transparent font-medium text-foreground focus:outline-none",
                                        isCompact
                                            ? "numeric-tight h-11 pl-8 pr-2 text-[10px] leading-none md:h-12 md:text-[10.5px]"
                                                : "h-14 pl-10 pr-2 text-xs leading-none md:h-16 md:pt-5"
                                        )}
                                        value={checkOut}
                                        min={checkIn}
                                        onChange={(e) => setCheckOut(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Guests & Search Button */}
                    <div className={cn(
                        "flex flex-1 items-center justify-between border-t border-border/20 md:border-t-0 md:border-l",
                        isCompact ? "pl-1 pb-1 pt-1 md:min-w-[172px] md:flex-[0.72] md:p-0" : "pl-2 pb-2 pt-2 md:p-0"
                    )}>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    aria-label="Guests and rooms"
                                    type="button"
                                    className={cn(
                                        "group relative flex flex-1 items-center text-left transition-colors outline-none focus-visible:bg-primary/5 hover:bg-primary/5",
                                        isCompact
                                            ? "h-11 gap-2 px-3 rounded-l-xl md:h-12 md:rounded-xl"
                                            : "h-14 gap-3 px-4 rounded-l-xl md:h-16 md:rounded-xl md:pt-5"
                                    )}
                                >
                                    {isHero ? (
                                        <span className="ui-label pointer-events-none absolute left-12 top-3 hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:block">
                                            Guests
                                        </span>
                                    ) : null}
                                    <Users className={cn(
                                        "text-muted-foreground transition-colors group-hover:text-primary",
                                        isCompact ? "h-4 w-4" : "h-5 w-5"
                                    )} strokeWidth={1.5} />
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "ui-label font-semibold text-foreground whitespace-nowrap",
                                            isCompact ? "text-[10px] md:text-[10.5px]" : "text-xs"
                                        )}>{rooms} Room, {adults} Guests</span>
                                    </div>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="z-[100] w-80 rounded-2xl border-border bg-card/98 p-6 shadow-[var(--surface-shadow-lg)] backdrop-blur-xl" align="end">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="block text-sm font-semibold">Adults</span>
                                            <span className="text-xs text-muted-foreground">Ages 13 or above</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button aria-label="Decrease adults" variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setAdults(Math.max(1, adults - 1))}>-</Button>
                                            <span className="w-4 text-center text-sm font-medium">{adults}</span>
                                            <Button aria-label="Increase adults" variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setAdults(Math.min(10, adults + 1))}>+</Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="block text-sm font-semibold">Rooms</span>
                                            <span className="text-xs text-muted-foreground">Max 5 per booking</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button aria-label="Decrease rooms" variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setRooms(Math.max(1, rooms - 1))}>-</Button>
                                            <span className="w-4 text-center text-sm font-medium">{rooms}</span>
                                            <Button aria-label="Increase rooms" variant="outline" size="icon" className="h-8 w-8 rounded-full border-border" onClick={() => setRooms(Math.min(5, rooms + 1))}>+</Button>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button
                            aria-label="Search stays"
                            type="submit"
                            disabled={!canSearch}
                            className={cn(
                                "flex shrink-0 items-center justify-center rounded-full bg-primary p-0 text-primary-foreground transition-[transform,box-shadow,filter] duration-200 hover:brightness-110 motion-safe:hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none",
                                isCompact
                                    ? "mr-1 h-10 w-10 shadow-[0_14px_24px_-16px_rgba(189,47,241,0.78)] md:mr-0"
                                    : "mr-2 h-12 w-12 shadow-[0_18px_30px_-18px_rgba(189,47,241,0.8)] md:mr-0"
                            )}
                        >
                            <Search className={cn(isCompact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2.5} />
                        </Button>
                    </div>
                </div>

            </form>
        </motion.div>
    );
}
