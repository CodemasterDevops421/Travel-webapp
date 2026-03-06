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
    const amenityHighlights = (hotel.amenities ?? []).slice(0, 4);

    return (
        <article className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-primary/25 hover:shadow-lg md:flex-row md:p-5">
            {/* Image Section */}
            <div className="relative h-52 w-full shrink-0 overflow-hidden rounded-xl md:h-auto md:w-72">
                <PreferenceLink href={hotelHref} aria-label={`View details for ${hotel.name}`}>
                    {hotel.imageUrl ? (
                        <Image src={hotel.imageUrl} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, 288px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
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

            {/* Content Section */}
            <div className="flex flex-1 flex-col justify-between py-1">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-1">
                            {[...Array(Math.floor(hotel.starRating || 0))].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-orange-400 text-orange-400" />
                            ))}
                        </div>
                        <PreferenceLink href={hotelHref} className="focus-visible:outline-none">
                            <h3 className="mt-1 text-xl font-bold text-foreground transition-colors group-hover:text-primary">{hotel.name}</h3>
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

                    {/* Rating Badge (Right Side) */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none">{getReviewLabel(reviewScore)}</p>
                                <p className="text-xs text-muted-foreground">{hotel.reviewCount} reviews</p>
                            </div>
                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-r-lg rounded-tl-lg rounded-bl-[4px] text-sm font-bold text-white shadow-sm", getReviewBadgeColor(reviewScore))}>
                                {reviewScore.toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div className="text-xs text-muted-foreground w-full max-w-full sm:max-w-[62%]">
                        <p className="font-semibold text-foreground">Top highlight:</p>
                        {reviewSnippet ? (
                            <>
                                <p className="line-clamp-2">&quot;{reviewSnippet.quote}&quot;</p>
                                <p className="mt-1 text-[11px]">
                                    {reviewSnippet.author ?? 'Verified guest'}
                                    {typeof reviewSnippet.score === 'number' ? ` · ${reviewSnippet.score.toFixed(1)}/10` : ''}
                                </p>
                            </>
                        ) : (
                            <p className="line-clamp-2">&quot;Guests consistently praise the incredible location and seamless check-in experience.&quot;</p>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-0 w-full sm:w-auto">
                        <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Actual price</p>
                            <div className="flex items-baseline justify-end gap-1.5">
                                <span className="text-2xl font-bold text-foreground">{formatMoney(hotel.currency, hotel.price)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">per night · Includes taxes and charges</p>
                            {typeof hotel.price === 'number' ? (
                                <p className="text-xs font-semibold text-foreground">Total {formatMoney(hotel.currency, hotel.price * nights)}</p>
                            ) : null}
                        </div>
                        <PreferenceLink href={hotelHref} className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-8 font-bold text-primary-foreground shadow-none transition-all hover:bg-primary/90 hover:shadow-md sm:w-auto">
                            See availability
                        </PreferenceLink>
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
