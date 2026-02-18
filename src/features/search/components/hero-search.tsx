'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, Search, Shield, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAutocomplete } from '@/features/search/hooks/use-autocomplete';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { trackFunnelEvent } from '@/shared/lib/analytics';

export function HeroSearch() {
  const today = new Date();
  const defaultCheckIn = new Date(today);
  defaultCheckIn.setDate(defaultCheckIn.getDate() + 14);
  const defaultCheckOut = new Date(defaultCheckIn);
  defaultCheckOut.setDate(defaultCheckOut.getDate() + 2);

  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [checkIn, setCheckIn] = useState(defaultCheckIn.toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(defaultCheckOut.toISOString().slice(0, 10));
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const router = useRouter();
  const language = useSearchUIStore((state) => state.language);
  const currency = useSearchUIStore((state) => state.currency);
  const hasTrackedSearchInput = useRef(false);
  const suggestionsListId = useId();
  const { data, isFetching } = useAutocomplete(query, language);
  const suggestions = data ?? [];
  const isSuggestionsOpen = query.length > 2 && showSuggestions;
  const {
    data: propertyPreview,
    isFetching: isPreviewLoading
  } = usePropertyPreview(activeQuery, language, currency, checkIn, checkOut, adults, rooms);
  const selectedNights = (() => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query, suggestions.length, showSuggestions]);

  const onSearch = (queryOverride?: string) => {
    const nextQuery = (queryOverride ?? query).trim();
    if (nextQuery.length < 3) return;
    setActiveQuery(nextQuery);
    setShowSuggestions(false);
    trackFunnelEvent({
      name: 'search_submitted',
      step: 'search',
      properties: {
        queryLength: nextQuery.length
      }
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
    setActiveQuery(name);
    setShowSuggestions(false);
    trackFunnelEvent({
      name: 'autocomplete_suggestion_selected',
      step: 'search',
      properties: {
        suggestionLength: name.length
      }
    });
    onSearch(name);
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

      setHighlightedIndex((currentIndex) => {
        if (currentIndex < 0) return 0;
        return Math.min(currentIndex + 1, suggestions.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!isSuggestionsOpen || suggestions.length === 0) return;
      event.preventDefault();
      setHighlightedIndex((currentIndex) => {
        if (currentIndex <= 0) return 0;
        return currentIndex - 1;
      });
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

    if (event.key === 'Tab') {
      setShowSuggestions(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-[28px] border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur md:p-7"
    >
      <div className="mb-5 space-y-2">
        <h2 className="text-2xl font-semibold">Find your next signature stay</h2>
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Secure checkout with trusted payment protection
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            role="combobox"
            aria-label="Search destination"
            aria-autocomplete="list"
            aria-expanded={isSuggestionsOpen}
            aria-controls={suggestionsListId}
            aria-activedescendant={
              highlightedIndex >= 0 ? `${suggestionsListId}-option-${highlightedIndex}` : undefined
            }
            placeholder="Where to? city, hotel, landmark"
            className="h-14 pl-10 text-base"
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (!hasTrackedSearchInput.current && nextValue.trim().length > 0) {
                hasTrackedSearchInput.current = true;
                trackFunnelEvent({
                  name: 'search_input_started',
                  step: 'discovery'
                });
              }
              setQuery(nextValue);
              setHighlightedIndex(-1);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
            onKeyDown={onAutocompleteKeyDown}
          />
          {isSuggestionsOpen && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-card p-2 shadow-xl">
              {isFetching ? (
                <p className="p-2 text-sm text-muted-foreground">Fetching destinations...</p>
              ) : (
                <ul
                  id={suggestionsListId}
                  className="space-y-1"
                  role="listbox"
                  aria-label="Autocomplete suggestions"
                >
                  {suggestions.length === 0 ? (
                    <li
                      role="status"
                      aria-live="polite"
                      className="rounded-lg px-2 py-2 text-sm text-muted-foreground"
                    >
                      No destinations found.
                    </li>
                  ) : (
                    suggestions.map((item, idx) => (
                      <li
                        key={item.id}
                        id={`${suggestionsListId}-option-${idx}`}
                        role="option"
                        aria-selected={highlightedIndex === idx}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                      >
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => onPickSuggestion(item.name)}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{item.source === 'maps' ? 'maps' : 'inventory'}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
        <label className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
          <Calendar className="h-4 w-4" />
          <div className="flex w-full items-center gap-2 text-sm sm:w-auto">
            <input
              type="date"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              aria-label="Check-in date"
            />
            <span>to</span>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              aria-label="Check-out date"
            />
          </div>
        </label>
        <label className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
          <Users className="h-4 w-4" />
          <div className="flex w-full items-center gap-2 text-sm sm:w-auto">
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value))}
              aria-label="Adults"
            >
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={count}>
                  {count} adults
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={rooms}
              onChange={(event) => setRooms(Number(event.target.value))}
              aria-label="Rooms"
            >
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count} room{count > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="lg" onClick={onSearch}>Search stays</Button>
      </div>
      <p className="mt-2 text-right text-xs text-muted-foreground">
        {selectedNights > 0 ? `${selectedNights} night${selectedNights > 1 ? 's' : ''} · ${adults} adult${adults > 1 ? 's' : ''} · ${rooms} room${rooms > 1 ? 's' : ''}` : 'Select valid dates'}
      </p>

      {activeQuery && (
        <section className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live rate preview</h3>
          {isPreviewLoading ? (
            <p className="text-sm text-muted-foreground">Loading properties...</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {(propertyPreview ?? []).map((hotel, idx) => (
                <PreferenceLink
                  key={hotel.hotelId}
                  href={`/hotels/${hotel.hotelId}?checkin=${encodeURIComponent(checkIn)}&checkout=${encodeURIComponent(checkOut)}&adults=${adults}&rooms=${rooms}&currency=${encodeURIComponent(currency)}`}
                  className="animate-soft-rise overflow-hidden rounded-xl border border-border bg-background/80 shadow-sm"
                  style={{ animationDelay: `${idx * 45}ms` }}
                  onClick={() =>
                    trackFunnelEvent({
                      name: 'preview_card_opened',
                      step: 'consideration',
                      properties: {
                        hotelId: hotel.hotelId
                      }
                    })
                  }
                >
                  {hotel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-40 w-full bg-[linear-gradient(120deg,hsl(var(--muted))_0%,hsl(var(--card))_55%,hsl(var(--muted))_100%)]" />
                  )}
                  <div className="space-y-2 p-4">
                    <h4 className="line-clamp-2 text-base font-semibold">{hotel.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {hotel.city}
                      {hotel.countryCode ? `, ${hotel.countryCode}` : ''}
                      {hotel.starRating ? ` · ${hotel.starRating}★` : ''}
                    </p>
                    {hotel.reviewScore ? (
                      <p className="text-xs font-medium text-foreground/90">
                        {hotel.reviewScore.toFixed(1)} / 10 guest rating
                        {hotel.reviewCount ? ` · ${Math.round(hotel.reviewCount)} reviews` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Guest reviews available on details page</p>
                    )}
                    <p className="text-base font-semibold text-primary">
                      {hotel.price ? `${hotel.currency} ${hotel.price} total/night` : 'Price on request'}
                    </p>
                    <span className="inline-flex text-xs font-semibold underline underline-offset-4">
                      View details and rates
                    </span>
                  </div>
                </PreferenceLink>
              ))}
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
}
