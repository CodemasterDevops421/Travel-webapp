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
    <section className="surface-shell space-y-4 px-4 py-4 md:px-5 md:py-5">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 md:flex-row md:items-center md:justify-between">
        <PreferenceLink href={browseHotelsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          &larr; See all properties
        </PreferenceLink>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            From {formatMoney(currency, lowestRate, true)} / night
          </span>
          <button
            type="button"
            onClick={onToggleSave}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-sm font-semibold transition-colors',
              isHotelSaved ? 'bg-rose-50 text-rose-600' : 'bg-background text-foreground hover:bg-muted'
            )}
          >
            <Heart className={cn('h-4 w-4', isHotelSaved ? 'fill-current' : '')} />
            {isHotelSaved ? 'Saved' : 'Save stay'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
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

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Property overview</p>
            <h1 className="max-w-4xl font-heading text-[1.7rem] font-bold leading-tight tracking-tight text-foreground md:text-[2.2rem]">
              {hotelName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary/80" />
              <p className="max-w-3xl">{address}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:max-w-[360px] md:justify-end">
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">
              {checkin} to {checkout}
            </span>
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">{adults} guests</span>
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1">{rooms} room{rooms > 1 ? 's' : ''}</span>
            <a href="#rooms" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Select a room
            </a>
          </div>
        </div>
      </div>

      <HotelPhotoGallery
        photos={photos}
        hotelName={hotelName}
        lightboxIndex={lightboxIndex}
        onOpen={onOpenLightbox}
        onClose={onCloseLightbox}
      />

      {authRequired ? (
        <PreferenceLink href={loginHref} className="text-sm font-semibold text-amber-700 underline underline-offset-2">
          Sign in to save this stay
        </PreferenceLink>
      ) : null}
    </section>
  );
}
