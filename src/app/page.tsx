import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LockKeyhole, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { HeroSearchBar } from '@/features/search/components/hero-search-bar';
import { SearchSkeleton } from '@/features/search/components/search-skeleton';
import { TrendingDestinations } from '@/components/home/trending-destinations';
import { MoodDiscovery } from '@/components/home/mood-discovery';
import { FeaturedDealsStrip } from '@/components/home/featured-deals-strip';
import { TravelArticles } from '@/components/home/travel-articles';
import { NewsletterBand } from '@/components/home/newsletter-band';

export const metadata: Metadata = {
  title: 'TravelApp | Same Stays. Better Prices.',
  description: 'Discover premium hotels with transparent total pricing and secure checkout.',
  alternates: {
    canonical: '/'
  }
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl space-y-24 px-4 pb-24 pt-8 md:pt-12">
      {/* Hero Section */}
      <section className="relative flex min-h-[500px] flex-col justify-center overflow-visible rounded-[2rem] bg-gradient-to-br from-[#1a0b2e] to-[#2d1b4e] p-8 text-center text-white shadow-2xl md:p-16">
        <div className="absolute inset-0 z-0 overflow-hidden rounded-[2rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Luxury Hotel Pool"
            className="h-full w-full object-cover opacity-40 mix-blend-overlay transition-transform duration-1000 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl space-y-6">
          <h1 className="font-heading text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Same Stays. <br />
            <span className="bg-gradient-to-r from-[#A4B6EA] via-[#C99DDB] to-[#F28A9B] bg-clip-text text-transparent">
              Better Prices.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/90 md:text-xl">
            2 Million Hotels Worldwide. Compare rates, review full terms upfront, and book with confidence.
          </p>
        </div>

        <div className="relative z-20 mt-12 w-full">
          <Suspense fallback={<SearchSkeleton />}>
            <HeroSearchBar />
          </Suspense>
        </div>
      </section>

      {/* Value Props */}
      <section className="mx-auto grid max-w-5xl gap-8 text-center md:grid-cols-3">
        <div className="group rounded-3xl border border-border/50 bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Verified Rates</h3>
          <p className="text-sm text-muted-foreground">Direct supply connections ensure real-time availability and pricing accuracy.</p>
        </div>
        <div className="group rounded-3xl border border-border/50 bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Transparent Pricing</h3>
          <p className="text-sm text-muted-foreground">See the full total including taxes and fees before you start checkout.</p>
        </div>
        <div className="group rounded-3xl border border-border/50 bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Secure Checkout</h3>
          <p className="text-sm text-muted-foreground">Bank-grade encryption and signed quote verification for peace of mind.</p>
        </div>
      </section>

      <FeaturedDealsStrip />
      <TrendingDestinations />
      <MoodDiscovery />
      <TravelArticles />
      <NewsletterBand />
    </main>
  );
}
