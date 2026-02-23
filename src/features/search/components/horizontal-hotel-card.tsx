'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function HorizontalHotelCard({
    hotel,
    checkin,
    checkout,
    adults,
    rooms,
    currency,
    discoveryContext
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

    return (
        <Link
            href={`/hotels/${hotel.hotelId}?${detailsParams.toString()}`}
            className="group flex flex-col md:flex-row gap-4 rounded-xl border border-border bg-white p-4 transition-all hover:shadow-lg hover:border-primary/20"
        >
            {/* Image Section */}
            <div className="relative h-48 w-full shrink-0 overflow-hidden md:h-auto md:w-72">
                {hotel.imageUrl ? (
                    <Image src={hotel.imageUrl} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, 288px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="h-full w-full bg-slate-100" />
                )}
                <button className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-muted-foreground shadow-sm hover:text-red-500 hover:scale-110 transition-all">
                    <Heart className="h-4 w-4" />
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
                        <h3 className="mt-1 text-xl font-bold text-foreground group-hover:text-primary transition-colors">{hotel.name}</h3>
                        <div className="mt-1 flex items-center gap-2 text-sm text-foreground underline underline-offset-2">
                            <span className="line-clamp-1">{hotel.city}, {hotel.countryCode}</span>
                            <span className="text-muted-foreground no-underline">•</span>
                            <span className="text-muted-foreground no-underline">Map view</span>
                        </div>

                        {/* Trust Badges */}
                        <div className="mt-3 flex flex-col gap-1 items-start">
                            <span className="rounded bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 border border-green-200">
                                Free cancellation
                            </span>
                            <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 border border-red-200 flex items-center gap-1">
                                🔥 Limited supply for your dates
                            </span>
                        </div>
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
                    <div className="text-xs text-muted-foreground max-w-[60%]">
                        <p className="font-semibold text-foreground">Top highlight:</p>
                        <p className="line-clamp-2">&quot;Guests consistently praise the incredible location and seamless check-in experience.&quot;</p>
                    </div>

                    <div className="flex flex-col items-end gap-0 w-full sm:w-auto">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">Early Booker Deal</span>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1.5">
                                <span className="text-sm text-muted-foreground line-through decoration-red-500/50">{formatMoney(hotel.currency, (hotel.price ?? 0) * 1.08)}</span>
                                <span className="text-2xl font-bold text-foreground">{formatMoney(hotel.currency, hotel.price)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Includes taxes and charges</p>
                        </div>
                        <Button className="mt-3 h-10 w-full rounded bg-primary px-8 font-bold shadow-none transition-all hover:bg-primary/90 hover:shadow-md sm:w-auto">
                            See availability
                        </Button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
