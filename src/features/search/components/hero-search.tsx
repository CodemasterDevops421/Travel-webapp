'use client';

import { useState } from 'react';
import { Calendar, Search, Shield, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAutocomplete } from '@/features/search/hooks/use-autocomplete';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function HeroSearch() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { data, isFetching } = useAutocomplete(query);
  const {
    data: propertyPreview,
    isFetching: isPreviewLoading
  } = usePropertyPreview(activeQuery);

  const onSearch = () => {
    if (query.trim().length < 3) return;
    setActiveQuery(query.trim());
    setShowSuggestions(false);
  };

  const onPickSuggestion = (name: string) => {
    setQuery(name);
    setActiveQuery(name);
    setShowSuggestions(false);
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
            aria-label="Search destination"
            placeholder="Where to? city, hotel, landmark"
            className="h-12 pl-10"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSearch();
              }
            }}
          />
          {query.length > 2 && showSuggestions && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-card p-2 shadow-xl">
              {isFetching ? (
                <p className="p-2 text-sm text-muted-foreground">Fetching destinations...</p>
              ) : (
                <ul className="space-y-1" role="listbox" aria-label="Autocomplete suggestions">
                  {(data ?? []).length === 0 ? (
                    <li className="rounded-lg px-2 py-2 text-sm text-muted-foreground">No destinations found.</li>
                  ) : (
                    (data ?? []).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
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
