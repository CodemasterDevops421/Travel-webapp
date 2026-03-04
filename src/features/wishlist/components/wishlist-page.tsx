'use client';

import Image from 'next/image';
import { Heart, Loader2, MapPin, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { useAuth } from '@/shared/hooks/use-auth';
import { useWishlist } from '@/shared/hooks/use-wishlist';

function buildHotelHref(hotelId: string) {
  return `/hotels/${encodeURIComponent(hotelId)}`;
}

export function WishlistPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { savedHotels, isLoading, toggleSave, error, authRequired, clearAuthRequired } = useWishlist();

  if (authLoading) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center px-4 py-8">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!user || authRequired) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Saved stays</p>
          <h1 className="mt-2 text-3xl font-heading font-bold">Sign in to view your wishlist</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Save hotels while browsing and return anytime to compare your top picks.
          </p>
          <PreferenceLink
            href="/auth/login?redirect=%2Fwishlist"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </PreferenceLink>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Saved stays</p>
        <h1 className="mt-2 text-3xl font-heading font-bold">Your hotel shortlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {savedHotels.length > 0
            ? `You currently have ${savedHotels.length} saved ${savedHotels.length === 1 ? 'stay' : 'stays'}.`
            : 'Save properties from search and hotel pages to build your shortlist.'}
        </p>
      </section>

      {error ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{error}</p>
        </section>
      ) : null}

      {isLoading ? (
        <section className="flex items-center justify-center rounded-2xl border border-border bg-card p-14">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </section>
      ) : savedHotels.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No saved stays yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore destinations and tap the heart icon on properties you want to compare later.
          </p>
          <PreferenceLink
            href="/search"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Explore stays
          </PreferenceLink>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {savedHotels.map((hotel) => (
            <article key={hotel.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <PreferenceLink href={buildHotelHref(hotel.hotel_id)} className="block">
                <div className="relative h-52 w-full bg-muted">
                  {hotel.hotel_image ? (
                    <Image
                      src={hotel.hotel_image}
                      alt={hotel.hotel_name ?? 'Saved hotel'}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : null}
                </div>
              </PreferenceLink>
              <div className="space-y-3 p-5">
                <div>
                  <PreferenceLink href={buildHotelHref(hotel.hotel_id)}>
                    <h3 className="text-xl font-semibold">{hotel.hotel_name ?? 'Unnamed hotel'}</h3>
                  </PreferenceLink>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {hotel.city ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {hotel.city}
                      </span>
                    ) : null}
                    {typeof hotel.star_rating === 'number' ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {hotel.star_rating.toFixed(1)} stars
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <PreferenceLink
                    href={buildHotelHref(hotel.hotel_id)}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    View stay
                  </PreferenceLink>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    onClick={() => {
                      clearAuthRequired();
                      void toggleSave({
                        hotelId: hotel.hotel_id,
                        hotelName: hotel.hotel_name ?? undefined,
                        hotelImage: hotel.hotel_image ?? undefined,
                        starRating: hotel.star_rating ?? undefined,
                        city: hotel.city ?? undefined
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
