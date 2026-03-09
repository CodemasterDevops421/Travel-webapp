'use client';

import Image from 'next/image';
import { Heart, Star } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';
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
    if (score >= 9) return 'bg-emerald-500';
    if (score >= 8) return 'bg-emerald-400';
    return 'bg-yellow-400';
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
    const amenityHighlights = (hotel.amenities ?? []).slice(0, 3);

    return (
        <article className="group rounded-[22px] border border-border/70 bg-card px-3 py-3 transition-all hover:border-primary/20 hover:shadow-[var(--surface-shadow)] md:grid md:grid-cols-[220px,minmax(0,1fr),176px] md:items-stretch md:gap-4 md:px-3.5 md:py-3.5">
            <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-[18px] md:h-full md:min-h-[188px] md:w-[220px]">
                <PreferenceLink href={hotelHref} aria-label={`View details for ${hotel.name}`}>
                    {hotel.imageUrl ? (
                        <Image src={hotel.imageUrl} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, 220px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                        <div className="h-full w-full bg-muted" />
                    )}
                </PreferenceLink>
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
                        'absolute right-3 top-3 rounded-full bg-background/95 p-2 text-muted-foreground shadow-sm transition-all hover:scale-110',
                        saved ? 'text-rose-500' : 'hover:text-rose-500'
                    )}
                    aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                    <Heart className={cn('h-4 w-4', saved ? 'fill-current' : '')} />
                </button>
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            {[...Array(Math.floor(hotel.starRating || 0))].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-orange-400 text-orange-400" />
                            ))}
                        </div>
                        <PreferenceLink href={hotelHref} className="focus-visible:outline-none">
                            <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-6 text-foreground transition-colors group-hover:text-primary">{hotel.name}</h3>
                        </PreferenceLink>
                        <PreferenceLink href={hotelHref} className="mt-1 flex items-center gap-2 text-sm text-foreground underline underline-offset-2">
                            <span className="line-clamp-1">{hotel.city}, {hotel.countryCode}</span>
                            <span className="text-muted-foreground no-underline">•</span>
                            <span className="text-muted-foreground no-underline">Map view</span>
                        </PreferenceLink>

                        {amenityHighlights.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {amenityHighlights.map((amenity) => (
                                    <span key={amenity} className="rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] text-foreground/90">
                                        {amenity}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <div className="hidden text-right sm:block">
                                <p className="text-sm font-bold leading-none">{getReviewLabel(reviewScore)}</p>
                                <p className="text-xs text-muted-foreground">{hotel.reviewCount} reviews</p>
                            </div>
                            <div className={cn('flex h-10 w-10 items-center justify-center rounded-[14px] text-sm font-bold text-white shadow-sm', getReviewBadgeColor(reviewScore))}>
                                {reviewScore.toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground">
                    <p className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top review</p>
                    {reviewSnippet ? (
                        <>
                            <p className="mt-1 line-clamp-1 text-sm text-foreground/80">&quot;{reviewSnippet.quote}&quot;</p>
                            <p className="mt-1 text-[11px]">
                                {reviewSnippet.author ?? 'Verified guest'}
                                {typeof reviewSnippet.score === 'number' ? ` · ${reviewSnippet.score.toFixed(1)}/10` : ''}
                            </p>
                        </>
                    ) : (
                        <p className="mt-1 line-clamp-1 text-sm text-foreground/80">&quot;Guests consistently praise the incredible location and seamless check-in experience.&quot;</p>
                    )}
                </div>

                {showAuthPrompt ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Sign in to save stays. <a href={loginHref} className="font-semibold underline underline-offset-2">Go to login</a>
                    </p>
                ) : null}
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-border/70 pt-4 md:border-l md:border-t-0 md:pl-1 md:pt-1">
                <div className="space-y-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Actual price</p>
                    <div className="flex items-baseline justify-end gap-1.5">
                        <span className="text-[1.75rem] font-bold leading-none text-foreground">{formatMoney(hotel.currency, hotel.price)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">per night · taxes and charges included</p>
                    {typeof hotel.price === 'number' ? (
                        <p className="text-sm font-semibold text-foreground">Total {formatMoney(hotel.currency, hotel.price * nights)}</p>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <PreferenceLink href={hotelHref} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90">
                        See availability
                    </PreferenceLink>
                    <p className="text-center text-[11px] text-muted-foreground">Flexible comparison, live supplier-backed rates.</p>
                </div>
            </div>
        </article>
    );
}
