'use client';

import Link from 'next/link';
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

export function HorizontalHotelCard({ hotel, checkin, checkout, adults, rooms, currency }: HorizontalHotelCardProps) {
    const reviewScore = hotel.reviewScore ?? 7.5;

    return (
        <Link
            href={`/hotels/${hotel.hotelId}?checkin=${checkin}&checkout=${checkout}&adults=${adults}&rooms=${rooms}&currency=${currency}`}
            className="group flex flex-col md:flex-row gap-4 rounded-xl border border-border bg-white p-4 transition-all hover:shadow-lg hover:border-primary/20"
        >
            {/* Image Section */}
            <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-lg md:h-auto md:w-72">
                {hotel.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hotel.imageUrl} alt={hotel.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="h-full w-full bg-slate-100" />
                )}
                <button className="absolute left-3 top-3 rounded-full bg-white p-2 text-muted-foreground shadow-sm hover:text-red-500 hover:scale-110 transition-all">
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
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="line-clamp-1">{hotel.city}, {hotel.countryCode}</span>
                            <span>•</span>
                            <span>2 km from centre</span>
                        </div>

                        {/* Badges/Facilities (Mocked for now based on screenshot) */}
                        <div className="mt-3 flex flex-wrap gap-2">
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

                {/* Bottom Section: Price & Action */}
                <div className="mt-4 flex items-end justify-between">
                    <div className="hidden sm:block">
                        {/* Optional descriptive text or location specifics can go here */}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">8% off</span>
                        </div>
                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-xs text-muted-foreground line-through">{formatMoney(hotel.currency, (hotel.price ?? 0) * 1.08)}</span>
                                <span className="text-2xl font-bold">{formatMoney(hotel.currency, hotel.price)}</span>
                                <span className="text-xs font-medium text-muted-foreground">/ night</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">1 night, 1 room, incl. taxes & fees</p>
                        </div>
                        <Button className="mt-2 h-10 rounded-full bg-[#aa15ef] px-6 font-semibold shadow-md hover:bg-[#9013cb] hover:shadow-lg">
                            See availability &gt;
                        </Button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
