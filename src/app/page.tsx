import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { LockKeyhole, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { HeroSearchBar } from '@/features/search/components/hero-search-bar';
import { SearchSkeleton } from '@/features/search/components/search-skeleton';
import { TrendingDestinations } from '@/components/home/trending-destinations';
import { MoodDiscovery } from '@/components/home/mood-discovery';
import { FeaturedDealsStrip } from '@/components/home/featured-deals-strip';
import { TravelArticles } from '@/components/home/travel-articles';
import { NewsletterBand } from '@/components/home/newsletter-band';

export const metadata: Metadata = {
  title: 'Hostel Stays | Discover your perfect stay, your way.',
  description: 'Premium hostel booking for backpackers, digital nomads, and travelers worldwide.',
  alternates: {
    canonical: '/'
  }
};

export default function HomePage() {
  return (
    <main className="space-y-20 pb-24">
      <section className="bg-[#003b95] pb-14 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative z-10 w-full max-w-5xl space-y-6 pb-10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
              Curated Stays Worldwide
            </p>
            <h1 className="font-heading text-5xl font-bold leading-tight md:text-7xl">
              Find your next stay
            </h1>
            <p className="max-w-3xl text-base text-blue-100 md:text-lg">
              Compare hotels, apartments, and resorts with transparent pricing, verified rates, and secure checkout.
            </p>
          </div>
        </div>

        <div className="relative z-20 mx-auto -mb-10 w-full max-w-7xl px-4">
          <Suspense fallback={<SearchSkeleton />}>
            <HeroSearchBar className="border-4 border-[#ffb700]" />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto mt-2 max-w-7xl px-4">
        <div className="relative h-[520px] w-full overflow-hidden rounded-2xl bg-muted">
          <Image
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Luxury Hotel Pool"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-0 border-y border-border px-4 md:grid-cols-3">
        <div className="p-12 transition-colors hover:bg-muted/50 border-b md:border-b-0 md:border-r border-border text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Verified Rates</h3>
          <p className="text-sm text-muted-foreground">Direct supply connections ensure real-time availability and pricing accuracy.</p>
        </div>
        <div className="p-12 transition-colors hover:bg-muted/50 border-b md:border-b-0 md:border-r border-border text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Transparent Pricing</h3>
          <p className="text-sm text-muted-foreground">See the full total including taxes and fees before you start checkout.</p>
        </div>
        <div className="p-12 transition-colors hover:bg-muted/50 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Secure Checkout</h3>
          <p className="text-sm text-muted-foreground">Bank-grade encryption and signed quote verification for peace of mind.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4">
        <FeaturedDealsStrip />
        <TrendingDestinations />
        <MoodDiscovery />
        <TravelArticles />
        <NewsletterBand />
      </div>
    </main>
  );
}
