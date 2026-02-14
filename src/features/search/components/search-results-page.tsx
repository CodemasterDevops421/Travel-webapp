'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Bot, ChevronLeft, ChevronRight, Compass, Grid3X3, Map, MapPin, Send, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react';
import { usePropertyPreview } from '@/features/search/hooks/use-property-preview';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorBoundary } from '@/components/error-boundary';

type SearchResultsPageProps = {
  query: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  language: string;
  currency: string;
};

type ConciergeMessage = {
  role: 'assistant' | 'user';
  text: string;
};

type ConciergeFilters = {
  minStars?: number;
  minGuestRating?: number;
  maxPrice?: number;
  vibeTags?: string[];
  searchHint?: string;
};

const CONCIERGE_CHAT_KEY = 'tf:concierge:chat';
const CONCIERGE_FILTERS_KEY = 'tf:concierge:filters';
const SEARCH_MODE_KEY = 'tf:search-mode';

const DEFAULT_CHAT_LOG: ConciergeMessage[] = [
  {
    role: 'assistant',
    text: "Welcome! I'm your travel concierge. Tell me about your perfect stay - your preferences, vibe, or any must-haves, and I'll find you the perfect match."
  }
];

const QUICK_PROMPTS = [
  'Beach + mountains + casino',
  'Boutique city stay with jazz + food scene',
  'Family resort with water park',
  'Ski town with hot springs'
];

const DEFAULT_VIBE_TAGS = ['Oceanfront', 'Mountain access', 'Casino nearby', 'Balcony views'];

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

function snapToOption(value: number, options: number[]): number {
  const sorted = [...options].sort((a, b) => a - b);
  if (value <= sorted[0]) return sorted[0];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (value >= sorted[i]) return sorted[i];
  }
  return sorted[0];
}

function normalizeFilters(filters: ConciergeFilters | null | undefined): ConciergeFilters {
  if (!filters) return {};
  const minStarsRaw = Number.isFinite(filters.minStars) ? Math.min(5, Math.max(0, filters.minStars ?? 0)) : undefined;
  const minGuestRatingRaw = Number.isFinite(filters.minGuestRating)
    ? Math.min(10, Math.max(0, filters.minGuestRating ?? 0))
    : undefined;
  const minStars = typeof minStarsRaw === 'number' ? snapToOption(minStarsRaw, [0, 3, 4, 5]) : undefined;
  const minGuestRating = typeof minGuestRatingRaw === 'number' ? snapToOption(minGuestRatingRaw, [0, 7, 8, 9]) : undefined;
  const maxPrice = Number.isFinite(filters.maxPrice) ? Math.max(50, filters.maxPrice ?? 0) : undefined;
  const vibeTags = filters.vibeTags?.map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
  const searchHint = filters.searchHint?.trim();

  return {
    minStars,
    minGuestRating,
    maxPrice,
    vibeTags: vibeTags && vibeTags.length > 0 ? vibeTags : undefined,
    searchHint: searchHint && searchHint.length > 2 ? searchHint : undefined
  };
}

function formatMoney(currency: string, amount: number | null): string {
  if (amount === null) return 'Price on request';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function getMatchScore(hotel: { reviewScore?: number | null; starRating?: number | null }) {
  const reviewScore = hotel.reviewScore ?? 7.8;
  const starRating = hotel.starRating ?? 3.8;
  const raw = reviewScore * 7 + starRating * 6;
  return Math.max(72, Math.min(98, Math.round(raw)));
}

function getHotelBadges(hotel: { reviewScore?: number | null; starRating?: number | null; price?: number | null }) {
  const badges: string[] = [];
  if ((hotel.starRating ?? 0) >= 4.5) badges.push('Luxury finish');
  if ((hotel.reviewScore ?? 0) >= 9.0) badges.push('Exceptional reviews');
  if ((hotel.reviewScore ?? 0) >= 8.4 && (hotel.reviewScore ?? 0) < 9.0) badges.push('Guest favorite');
  if ((hotel.price ?? 0) > 0 && (hotel.price ?? 0) <= 180) badges.push('Great value');
  if ((hotel.price ?? 0) >= 350) badges.push('Premium pick');
  if (badges.length === 0) badges.push('Curated stay');
  return badges.slice(0, 3);
}

function HotelCardSkeleton() {
  return (
    <div className="grid cursor-pointer gap-4 rounded-3xl border border-border/40 bg-card/70 p-4 md:grid-cols-[260px,1fr,210px]">
      <div className="relative">
        <div className="h-56 w-full animate-pulse rounded-2xl bg-muted md:h-full" />
      </div>
      <div className="space-y-3">
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col items-start justify-between gap-4 md:items-end">
        <div className="h-20 w-28 animate-pulse rounded-2xl bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-full bg-muted md:w-24" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/50 py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <MapPin className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-semibold">No stays found</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We could not find any hotels matching your current filters. Try adjusting your preferences or exploring a different destination.
      </p>
      <Button className="mt-6" onClick={() => window.location.reload()}>
        Reset filters
      </Button>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50/50 py-16 text-center animate-fade-in dark:border-red-900/30 dark:bg-red-900/10">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <X className="h-10 w-10 text-red-500" />
      </div>
      <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">Something went wrong</h3>
      <p className="mt-2 max-w-md text-sm text-red-600 dark:text-red-300">{message}</p>
      <Button className="mt-6" variant="default" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}

export function SearchResultsPage({ query, checkin, checkout, adults, rooms, language, currency }: SearchResultsPageProps) {
  const [searchMode, setSearchMode] = useState<'traditional' | 'concierge'>('concierge');
  const [chatLog, setChatLog] = useState<ConciergeMessage[]>(DEFAULT_CHAT_LOG);
  const [chatInput, setChatInput] = useState('');
  const [isConciergeLoading, setIsConciergeLoading] = useState(false);
  const [conciergeFilters, setConciergeFilters] = useState<ConciergeFilters>({});
  const [isChatHydrated, setIsChatHydrated] = useState(false);
  const [isFiltersHydrated, setIsFiltersHydrated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const conciergeBrief =
    searchMode === 'concierge'
      ? [conciergeFilters.searchHint, ...(conciergeFilters.vibeTags ?? [])]
          .filter(Boolean)
          .join(' ')
          .trim()
      : '';
  const previewFilters =
    searchMode === 'concierge'
      ? {
          brief: conciergeBrief,
          minStars: conciergeFilters.minStars,
          minGuestRating: conciergeFilters.minGuestRating,
          maxPrice: conciergeFilters.maxPrice
        }
      : undefined;
  const { data, isFetching, isError, error } = usePropertyPreview(query, language, currency, checkin, checkout, adults, rooms, previewFilters);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating-desc'>('recommended');
  const [minRating, setMinRating] = useState(0);
  const [minStars, setMinStars] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number>(99999);
  const [mapMode, setMapMode] = useState<'list' | 'split'>('list');

  useEffect(() => {
    if (!isMounted) return;
    
    try {
      const storedMode = readStorage<'traditional' | 'concierge'>(SEARCH_MODE_KEY);
      const resolvedMode = storedMode === 'traditional' || storedMode === 'concierge' ? storedMode : 'concierge';
      setSearchMode(resolvedMode);

      const storedChat = readStorage<ConciergeMessage[]>(CONCIERGE_CHAT_KEY);
      if (storedChat && storedChat.length > 0) {
        setChatLog(storedChat);
      } else {
        setChatLog(DEFAULT_CHAT_LOG);
      }
      setIsChatHydrated(true);

      const storedFilters = readStorage<ConciergeFilters>(CONCIERGE_FILTERS_KEY);
      if (storedFilters && resolvedMode === 'concierge') {
        const normalized = normalizeFilters(storedFilters);
        setConciergeFilters(normalized);
        if (typeof normalized.minGuestRating === 'number') setMinRating(normalized.minGuestRating);
        if (typeof normalized.minStars === 'number') setMinStars(normalized.minStars);
        if (typeof normalized.maxPrice === 'number') setMaxPrice(normalized.maxPrice);
      }
      setIsFiltersHydrated(true);
    } catch (error) {
      console.error('Error hydrating search state:', error);
      setIsChatHydrated(true);
      setIsFiltersHydrated(true);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isChatHydrated) return;
    writeStorage(CONCIERGE_CHAT_KEY, chatLog);
  }, [chatLog, isChatHydrated]);

  useEffect(() => {
    if (!isFiltersHydrated) return;
    writeStorage(CONCIERGE_FILTERS_KEY, conciergeFilters);
  }, [conciergeFilters, isFiltersHydrated]);

  useEffect(() => {
    writeStorage(SEARCH_MODE_KEY, searchMode);
  }, [searchMode]);

  const listings = useMemo(() => {
    const source = [...(data ?? [])];
    const filtered = source.filter((hotel) => {
      const price = hotel.price ?? 0;
      const review = hotel.reviewScore ?? 0;
      const stars = hotel.starRating ?? 0;
      return price <= maxPrice && review >= minRating && stars >= minStars;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
      if (sortBy === 'price-desc') return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === 'rating-desc') return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
      const scoreA = (a.reviewScore ?? 0) * 10 + (a.starRating ?? 0) * 5 - (a.price ?? 0) / 100;
      const scoreB = (b.reviewScore ?? 0) * 10 + (b.starRating ?? 0) * 5 - (b.price ?? 0) / 100;
      return scoreB - scoreA;
    });

    return filtered;
  }, [data, maxPrice, minRating, minStars, sortBy]);

  const nights = useMemo(() => {
    const start = new Date(checkin);
    const end = new Date(checkout);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [checkin, checkout]);

  const vibeTags = conciergeFilters.vibeTags && conciergeFilters.vibeTags.length > 0 ? conciergeFilters.vibeTags : DEFAULT_VIBE_TAGS;

  const sendConciergeMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isConciergeLoading) return;

    const userMessage: ConciergeMessage = { role: 'user', text: trimmed };
    const nextMessages = [...chatLog, userMessage].slice(-18);
    setChatLog(nextMessages);
    setChatInput('');
    setIsConciergeLoading(true);

    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          trip: {
            destination: query,
            checkin,
            checkout,
            adults,
            rooms,
            currency,
            language
          }
        })
      });

      const payload = (await response.json()) as { reply?: string; filters?: ConciergeFilters; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Concierge request failed');
      }

      const replyText = typeof payload.reply === 'string' && payload.reply.trim().length > 0
        ? payload.reply.trim()
        : 'Got it. Tell me one more detail so I can refine your matches.';
      const normalized = normalizeFilters(payload.filters);
      if (Object.keys(normalized).length > 0) {
        setConciergeFilters((current) => ({ ...current, ...normalized }));
        if (typeof normalized.minGuestRating === 'number') setMinRating(normalized.minGuestRating);
        if (typeof normalized.minStars === 'number') setMinStars(normalized.minStars);
        if (typeof normalized.maxPrice === 'number') setMaxPrice(normalized.maxPrice);
      }

      setChatLog((current) => [...current, { role: 'assistant', text: replyText }]);
    } catch {
      setChatLog((current) => [
        ...current,
        { role: 'assistant', text: 'I am having trouble reaching the concierge right now. Try again in a moment.' }
      ]);
    } finally {
      setIsConciergeLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <section className="relative overflow-hidden rounded-[32px] border border-border/80 bg-gradient-to-br from-white/80 via-white/60 to-primary/5 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl md:p-7 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">
              {searchMode === 'concierge' ? '✨ AI Concierge Search' : 'Traditional Search'}
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              <span className="text-gradient">Curated stays</span> in {query}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {checkin} to {checkout} · {nights} night{nights > 1 ? 's' : ''} · {adults} adults · {rooms} room{rooms > 1 ? 's' : ''} · {currency}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/60 px-4 py-3 text-xs text-muted-foreground backdrop-blur">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Lite API {searchMode === 'concierge' ? '· AI-curated' : ''}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/75 p-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-background"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </button>
        <div className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/80 p-1 text-xs">
          <button
            type="button"
            onClick={() => setSearchMode('traditional')}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              searchMode === 'traditional' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Traditional
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('concierge')}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              searchMode === 'concierge' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ✨ Concierge
          </button>
        </div>
        <label className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs transition-colors hover:bg-background">
          Sort
          <select className="ml-2 bg-transparent outline-none" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
            <option value="rating-desc">Top rated</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setMapMode((current) => (current === 'list' ? 'split' : 'list'))}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
            mapMode === 'split' ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-background/80 hover:bg-background'
          }`}
        >
          {mapMode === 'list' ? <Map className="h-3.5 w-3.5" /> : <Grid3X3 className="h-3.5 w-3.5" />}
          {mapMode === 'list' ? 'Show map' : 'Hide map'}
        </button>
      </section>

      {showFilters && (
        <section className="animate-slide-up rounded-2xl border border-border/80 bg-card/90 p-4 backdrop-blur-lg">
          <div className="flex flex-wrap items-center gap-4">
            <label className="rounded-xl border border-border bg-background/80 px-4 py-2 text-xs">
              <span className="text-muted-foreground">Min guest score</span>
              <select className="ml-2 bg-transparent font-semibold outline-none" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                {[0, 7, 8, 9].map((value) => (
                  <option key={value} value={value}>
                    {value === 0 ? 'Any' : `${value}+`}
                  </option>
                ))}
              </select>
            </label>
            <label className="rounded-xl border border-border bg-background/80 px-4 py-2 text-xs">
              <span className="text-muted-foreground">Min stars</span>
              <select className="ml-2 bg-transparent font-semibold outline-none" value={minStars} onChange={(e) => setMinStars(Number(e.target.value))}>
                {[0, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value === 0 ? 'Any' : `${value}★+`}
                  </option>
                ))}
              </select>
            </label>
            <label className="rounded-xl border border-border bg-background/80 px-4 py-2 text-xs">
              <span className="text-muted-foreground">Max price</span>
              <input
                type="number"
                min={50}
                className="ml-2 w-24 bg-transparent font-semibold outline-none"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Math.max(50, Number(e.target.value) || 99999))}
              />
            </label>
            <Button variant="ghost" onClick={() => { setMinRating(0); setMinStars(0); setMaxPrice(99999); }}>
              Reset
            </Button>
          </div>
        </section>
      )}

      <section className={`grid gap-6 ${searchMode === 'concierge' ? 'lg:grid-cols-[0.95fr,1.55fr]' : ''}`}>
        {searchMode === 'concierge' ? (
        <aside className="space-y-4">
          <div className="rounded-[28px] border border-border/70 glass-card p-5 shadow-lg animate-slide-up">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary shadow-md">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Travel Concierge AI</p>
                  <p className="text-xs text-muted-foreground">Powered by OpenAI</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Online
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
              {chatLog.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm animate-fade-in ${
                    message.role === 'assistant'
                      ? 'glass bg-white/50 text-foreground'
                      : 'bg-gradient-to-r from-primary/15 to-primary/10 text-foreground border border-primary/10'
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {isConciergeLoading ? (
                <div className="flex items-center gap-2 rounded-2xl bg-background/80 px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Concierge is thinking...</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-border/50 glass p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>Trip brief</span>
                <span className="flex items-center gap-1 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Smart match
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                  <span className="text-muted-foreground">Destination</span>
                  <span className="font-semibold text-foreground">{query}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                  <span className="text-muted-foreground">Dates</span>
                  <span className="font-semibold">{checkin} → {checkout}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2">
                  <span className="text-muted-foreground">Guests</span>
                  <span className="font-semibold">{adults} adults · {rooms} room{rooms > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {vibeTags.map((tag, idx) => (
                  <span key={tag} className={`rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-semibold animate-fade-in stagger-${idx + 1}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendConciergeMessage(prompt)}
                  className="rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Input
                placeholder="Tell me your vibe or must-haves..."
                className="input-glass"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    sendConciergeMessage(chatInput);
                  }
                }}
              />
              <Button
                type="button"
                className="h-11 w-11 rounded-2xl"
                onClick={() => sendConciergeMessage(chatInput)}
                disabled={isConciergeLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The concierge learns your style and filters Lite API listings instantly.
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 glass-card p-4 animate-slide-up stagger-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Compass className="h-4 w-4 text-primary" />
              Your vibe map
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              We combine scenery, activity, and nightlife signals to surface stays that feel tailor-made.
            </p>
            <div className="mt-3 grid gap-2 text-xs">
              {[
                { label: 'Nature access', value: 'High' },
                { label: 'Waterfront feel', value: 'Strong' },
                { label: 'Nightlife radius', value: '< 20 miles' }
              ].map((item, idx) => (
                <div key={item.label} className={`flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 animate-fade-in stagger-${idx + 1}`}>
                  <span>{item.label}</span>
                  <span className="font-semibold text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
        ) : null}

        <div className="space-y-4">
          <div className="rounded-3xl border border-border/70 glass-card p-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Matches</p>
                <h2 className="mt-1 text-2xl font-semibold">Recommended stays</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  {listings.length} results curated for your vibe
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Live updates
              </div>
            </div>
          </div>

          {mapMode === 'split' && (
            <article className="overflow-hidden rounded-3xl border border-border/70 glass-card animate-scale-in">
              <iframe
                title="Map view"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=12&output=embed`}
                className="h-[320px] w-full"
                loading="lazy"
              />
            </article>
          )}

          {isFetching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <HotelCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message={error?.message || 'Failed to load hotels. Please try again.'} />
          ) : listings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {listings.map((hotel, index) => (
                <PreferenceLink
                  key={hotel.hotelId}
                  href={`/hotels/${hotel.hotelId}?checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&adults=${adults}&rooms=${rooms}&currency=${encodeURIComponent(currency)}`}
                  className={`group grid cursor-pointer gap-4 rounded-3xl border border-border/40 bg-card/70 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_25px_50px_-30px_rgba(15,23,42,0.65)] md:grid-cols-[260px,1fr,210px] animate-slide-up stagger-${Math.min(index + 1, 8)}`}
                >
                  <div className="relative overflow-hidden rounded-2xl">
                    {hotel.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={hotel.imageUrl} 
                        alt={hotel.name} 
                        className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105 md:h-full" 
                      />
                    ) : (
                      <div className="h-56 bg-gradient-to-br from-muted to-muted/50 md:h-full" />
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-black/70 backdrop-blur-md px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                      {getMatchScore(hotel)}% Match
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-xl font-semibold transition-colors group-hover:text-primary">{hotel.name}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {hotel.city}
                        {hotel.countryCode ? `, ${hotel.countryCode}` : ''}
                        {hotel.starRating ? ` · ${hotel.starRating}★` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getHotelBadges(hotel).map((badge, idx) => (
                        <span 
                          key={badge} 
                          className={`rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold transition-all hover:scale-105 stagger-${idx + 1}`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      {hotel.reviewScore ? `${hotel.reviewScore.toFixed(1)} / 10 guest rating` : 'Guest rating available on details'}
                      {hotel.reviewCount ? ` · Based on ${Math.round(hotel.reviewCount)} reviews` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-start justify-between gap-4 md:items-end">
                    <div className="rounded-2xl border border-border/50 bg-white/60 backdrop-blur-sm px-4 py-3 text-left shadow-md md:text-right transition-all hover:bg-white/80">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">From</p>
                      <p className="text-2xl font-bold text-primary md:text-3xl">{formatMoney(hotel.currency, hotel.price)}</p>
                      <p className="text-xs text-muted-foreground">per night</p>
                    </div>
                    <span className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-105">
                      View stay
                    </span>
                  </div>
                </PreferenceLink>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
