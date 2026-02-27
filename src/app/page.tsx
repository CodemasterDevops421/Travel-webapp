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
      <section className="mx-auto max-w-7xl px-4 pt-4 pb-8 md:pb-16">
        <div className="hero-photo flex flex-col justify-center px-6 py-20 md:px-16 md:py-32">
          <div className="relative z-10 w-full max-w-3xl space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-white" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                Curated Premium Stays
              </p>
            </div>
            <h1 className="font-heading text-5xl font-extrabold leading-tight text-white md:text-7xl drop-shadow-xl animate-fade-in stagger-1">
              Discover your <br /> next escape
            </h1>
            <p className="max-w-xl text-lg text-white/90 drop-shadow-md animate-fade-in stagger-2">
              Experience the world&apos;s most stunning destinations with verified rates, transparent pricing, and seamless booking.
            </p>
          </div>
        </div>

        <div className="hero-search-float animate-fade-in stagger-3">
          <Suspense fallback={<SearchSkeleton />}>
            <div className="glass-panel p-2 md:p-3">
              <HeroSearchBar className="border-none shadow-none bg-transparent" />
            </div>
          </Suspense>
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
