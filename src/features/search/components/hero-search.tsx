'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, Search, Shield, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAutocomplete } from '@/features/search/hooks/use-autocomplete';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackFunnelEvent } from '@/shared/lib/analytics';

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const hasTrackedSearchInput = useRef(false);
  const suggestionsListId = useId();
  const { data, isFetching } = useAutocomplete(query);
  const suggestions = data ?? [];
  const isSuggestionsOpen = query.length > 2 && showSuggestions;
  const {
    data: propertyPreview,
    isFetching: isPreviewLoading
  } = usePropertyPreview(activeQuery);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query, suggestions.length, showSuggestions]);

  const onSearch = () => {
    if (query.trim().length < 3) return;
    const nextQuery = query.trim();
    setActiveQuery(nextQuery);
    setShowSuggestions(false);
    trackFunnelEvent({
      name: 'search_submitted',
      step: 'search',
      properties: {
        queryLength: nextQuery.length
      }
    });
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
      className="rounded-3xl border border-border/80 bg-card/90 p-5 shadow-xl backdrop-blur md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Find your next signature stay</h2>
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Secure checkout with LiteAPI payment SDK
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
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
            className="h-12 pl-10"
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
                          <span className="text-muted-foreground">{item.source}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background/70 px-3">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Dates</span>
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background/70 px-3">
          <Users className="h-4 w-4" />
          <span className="text-sm">2 adults · 1 room</span>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="lg" onClick={onSearch}>Search stays</Button>
      </div>

      {activeQuery && (
        <section className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live rate preview</h3>
          {isPreviewLoading ? (
            <p className="text-sm text-muted-foreground">Loading properties...</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {(propertyPreview ?? []).map((hotel, idx) => (
                <article
                  key={hotel.hotelId}
                  className="animate-soft-rise rounded-xl border border-border bg-background/80 p-4 shadow-sm"
                  style={{ animationDelay: `${idx * 45}ms` }}
                >
                  <h4 className="text-base font-semibold">{hotel.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {hotel.city}
                    {hotel.countryCode ? `, ${hotel.countryCode}` : ''}
                    {hotel.starRating ? ` · ${hotel.starRating}★` : ''}
                  </p>
                  <p className="mt-3 text-base font-semibold text-primary">
                    {hotel.price ? `${hotel.currency} ${hotel.price} total/night` : 'Price on request'}
                  </p>
                  <Link
                    href={`/hotels/${hotel.hotelId}`}
                    className="mt-2 inline-flex text-xs font-semibold underline underline-offset-4"
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
                    View details and rates
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </motion.div>
  );
}
