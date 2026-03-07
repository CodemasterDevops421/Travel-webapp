'use client';

import { Heart, MapPin, Star } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { HotelPhotoGallery } from '@/features/hotels/components/hotel-photo-gallery';
import { cn } from '@/shared/lib/utils';

type PropertyHeroProps = {
  browseHotelsHref: string;
  hotelName: string;
  starRating: number | null | undefined;
  reviewScore: number | null | undefined;
  reviewCount: number | null | undefined;
  address: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency: string;
  lowestRate: number | null;
  photos: string[];
  lightboxIndex: number | null;
  onOpenLightbox: (index: number) => void;
  onCloseLightbox: () => void;
  isHotelSaved: boolean;
  authRequired: boolean;
  loginHref: string;
  onToggleSave: () => void;
  formatMoney: (currency: string, amount: number | null, compact?: boolean) => string;
};

export function PropertyHero({
  browseHotelsHref,
  hotelName,
  starRating,
  reviewScore,
  reviewCount,
  address,
  checkin,
  checkout,
  adults,
  rooms,
  currency,
  lowestRate,
  photos,
  lightboxIndex,
  onOpenLightbox,
  onCloseLightbox,
  isHotelSaved,
  authRequired,
  loginHref,
  onToggleSave,
  formatMoney
}: PropertyHeroProps) {
  return (
    <section className="space-y-3 rounded-[22px] border border-border/70 bg-card px-4 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.5)] md:px-5">
      <PreferenceLink href={browseHotelsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
        &larr; See all properties
      </PreferenceLink>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
            {starRating ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">
                <Star className="h-3.5 w-3.5 fill-current" />
                {starRating}-star stay
              </span>
            ) : null}
            {reviewScore ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-2.5 py-1 text-foreground">
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {reviewScore.toFixed(1)}
                </span>
                {reviewScore >= 9 ? 'Excellent' : reviewScore >= 8 ? 'Very good' : 'Good'}
                {reviewCount ? ` · ${Math.round(reviewCount)} reviews` : ''}
              </span>
            ) : null}
          </div>
          <h1 className="max-w-3xl font-heading text-[1.9rem] font-bold leading-tight tracking-tight text-foreground md:text-[2.25rem]">{hotelName}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary/80" />
            <p className="max-w-2xl">{address}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">
              {checkin} to {checkout}
            </span>
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">{adults} guests</span>
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">{rooms} room{rooms > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="w-full rounded-[18px] border border-border/70 bg-background px-4 py-3 text-left sm:min-w-[210px] md:w-auto md:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Best available rate</p>
          <p className="mt-1 text-[1.9rem] font-bold leading-none text-foreground">{formatMoney(currency, lowestRate, true)}</p>
          <p className="mt-1 text-xs text-muted-foreground">per night · taxes and fees included</p>
          <a href="#rooms" className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            See rooms
          </a>
        </div>
      </div>
      <HotelPhotoGallery
        photos={photos}
        hotelName={hotelName}
        lightboxIndex={lightboxIndex}
        onOpen={onOpenLightbox}
        onClose={onCloseLightbox}
      />
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onToggleSave}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold transition-colors',
            isHotelSaved ? 'bg-rose-50 text-rose-600' : 'bg-background text-foreground hover:bg-muted'
          )}
        >
          <Heart className={cn('h-4 w-4', isHotelSaved ? 'fill-current' : '')} />
          {isHotelSaved ? 'Saved to wishlist' : 'Save stay'}
        </button>
        {authRequired ? (
          <PreferenceLink href={loginHref} className="text-sm font-semibold text-amber-700 underline underline-offset-2">
            Sign in to save
          </PreferenceLink>
        ) : null}
      </div>
    </section>
  );
}
