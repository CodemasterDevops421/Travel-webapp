'use client';

import Image from 'next/image';
import { Heart, MapPin, Star } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PropertyPreview } from '@/features/search/hooks/use-property-preview';

interface HorizontalHotelCardProps {
    hotel: PropertyPreview;
    checkin: string;
    checkout: string;
    adults: number;
    rooms: number;
    currency: string;
    discoveryContext?: string;
    saved?: boolean;
    onToggleSave?: (hotel: {
        hotelId: string;
        hotelName?: string;
        hotelImage?: string;
        starRating?: number;
        city?: string;
    }) => void;
    showAuthPrompt?: boolean;
    reviewSnippet?: {
        quote: string;
        author: string | null;
        score: number | null;
    } | null;
}

function formatMoney(currency: string, amount: number | null): string {
    if (amount === null) return 'Price on request';
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${currency} ${amount}`;
    }
}

function getReviewBadgeColor(score: number): string {
    if (score >= 9) return 'bg-emerald-600';
    if (score >= 8) return 'bg-[#2D8C74]';
    return 'bg-[#F4B544]';
}

function getReviewLabel(score: number): string {
    if (score >= 9.5) return 'Exceptional';
    if (score >= 9.0) return 'Superb';
    if (score >= 8.5) return 'Fabulous';
    if (score >= 8.0) return 'Very Good';
    return 'Good';
}

function getNights(checkin: string, checkout: string): number {
    const start = new Date(checkin);
    const end = new Date(checkout);
    const diff = end.getTime() - start.getTime();
    if (!Number.isFinite(diff) || diff <= 0) return 1;
    return Math.max(1, Math.round(diff / 86400000));
}

export function HorizontalHotelCard({
    hotel,
    checkin,
    checkout,
    adults,
    rooms,
    currency,
    discoveryContext,
    saved = false,
    onToggleSave,
    showAuthPrompt = false,
    reviewSnippet = null
}: HorizontalHotelCardProps) {
    const reviewScore = hotel.reviewScore ?? 7.5;
    const detailsParams = new URLSearchParams({
        checkin,
        checkout,
        adults: String(adults),
        rooms: String(rooms),
        currency
    });

    if (discoveryContext) {
        detailsParams.set('returnTo', discoveryContext);
    }

    const hotelHref = `/hotels/${hotel.hotelId}?${detailsParams.toString()}`;
    const loginHref = `/auth/login?redirect=${encodeURIComponent(hotelHref)}`;
    const nights = getNights(checkin, checkout);
    const amenityHighlights = (hotel.amenities ?? []).slice(0, 4);

    return (
        <article className="group flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card p-4 shadow-premium-sm transition-all hover:-translate-y-[2px] hover:border-accent/18 hover:shadow-premium-md md:flex-row md:gap-5">
            <div className="relative h-52 w-full shrink-0 overflow-hidden rounded-[24px] md:h-auto md:w-[308px]">
                <a href={hotelHref}>
                    {hotel.imageUrl ? (
                        <Image src={hotel.imageUrl} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, 288px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <div className="h-full w-full bg-slate-100" />
                    )}
                </a>
                <button
                    type="button"
                    onClick={() => {
                        onToggleSave?.({
                            hotelId: hotel.hotelId,
                            hotelName: hotel.name,
                            hotelImage: hotel.imageUrl,
                            starRating: hotel.starRating ?? undefined,
                            city: hotel.city
                        });
                    }}
                    className={cn(
                        'absolute right-3 top-3 rounded-full bg-white/92 p-2.5 text-muted-foreground shadow-sm transition-all hover:scale-105',
                        saved ? 'text-rose-500' : 'hover:text-rose-500'
                    )}
                    aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                    <Heart className={cn('h-4 w-4', saved ? 'fill-current' : '')} />
                </button>
            </div>

            <div className="flex flex-1 flex-col justify-between py-1">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-1">
                            {[...Array(Math.floor(hotel.starRating || 0))].map((_, i) => (
                                <Star key={i} className="h-3.5 w-3.5 fill-[#F4B544] text-[#F4B544]" />
                            ))}
                        </div>
                        <a href={hotelHref}>
                            <h3 className="mt-2 text-[22px] font-bold leading-tight text-foreground transition-colors group-hover:text-accent">{hotel.name}</h3>
                        </a>
                        <a href={hotelHref} className="mt-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                            <MapPin className="h-4 w-4 text-accent/75" />
                            <span className="line-clamp-1">{hotel.city}, {hotel.countryCode}</span>
                            <span className="text-muted-foreground no-underline">•</span>
                            <span className="text-accent no-underline">Map view</span>
                        </a>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-600/15 bg-emerald-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                                Free cancellation
                            </span>
                            <span className="rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                                Reserve now, pay later
                            </span>
                            <span className="rounded-full border border-[#F4B544]/30 bg-[#F4B544]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A5A00]">
                                Limited supply for your dates
                            </span>
                        </div>
                        {amenityHighlights.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {amenityHighlights.map((amenity) => (
                                    <span key={amenity} className="rounded-full border border-border/70 bg-secondary/55 px-3 py-1 text-[11px] text-foreground/90">
                                        {amenity}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none">{getReviewLabel(reviewScore)}</p>
                                <p className="text-xs text-muted-foreground">{hotel.reviewCount} reviews</p>
                            </div>
                            <div className={cn("flex h-11 min-w-11 items-center justify-center rounded-[14px] px-2 text-sm font-bold text-white shadow-sm", getReviewBadgeColor(reviewScore), reviewScore < 8 ? 'text-[#102A43]' : '')}>
                                {reviewScore.toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
                    <div className="max-w-[60%] rounded-[20px] border border-border/70 bg-secondary/45 px-4 py-4 text-xs text-muted-foreground">
                        <p className="font-semibold uppercase tracking-[0.16em] text-foreground">Top highlight</p>
                        {reviewSnippet ? (
                            <>
                                <p className="mt-2 line-clamp-2 leading-relaxed">&quot;{reviewSnippet.quote}&quot;</p>
                                <p className="mt-1 text-[11px]">
                                    {reviewSnippet.author ?? 'Verified guest'}
                                    {typeof reviewSnippet.score === 'number' ? ` · ${reviewSnippet.score.toFixed(1)}/10` : ''}
                                </p>
                            </>
                        ) : (
                            <p className="mt-2 line-clamp-2 leading-relaxed">&quot;Guests consistently praise the incredible location and seamless check-in experience.&quot;</p>
                        )}
                    </div>

                    <div className="w-full sm:w-auto">
                        <div className="mb-2 flex items-center justify-end gap-2">
                            <span className="rounded-full border border-[#F4B544]/30 bg-[#F4B544]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A5A00]">
                                Early booker deal
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1.5">
                                <span className="text-sm text-muted-foreground line-through decoration-primary/40">{formatMoney(hotel.currency, (hotel.price ?? 0) * 1.08)}</span>
                                <span className="text-2xl font-bold text-foreground">{formatMoney(hotel.currency, hotel.price)}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{nights} night{nights > 1 ? 's' : ''} · Includes taxes and charges</p>
                            {typeof hotel.price === 'number' ? (
                                <p className="text-xs font-semibold text-foreground">Total {formatMoney(hotel.currency, hotel.price * nights)}</p>
                            ) : null}
                        </div>
                        <a href={hotelHref} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-8 font-bold text-primary-foreground shadow-premium-sm transition-all hover:bg-primary/95 hover:shadow-premium-md sm:w-auto">
                            See availability
                        </a>
                    </div>
                </div>
                {showAuthPrompt ? (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Sign in to save stays. <a href={loginHref} className="font-semibold underline underline-offset-2">Go to login</a>
                    </p>
                ) : null}
            </div>
        </article>
    );
}
