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
  title: 'Hostel Stays | Discover your perfect stay, your way.',
  description: 'Premium hostel booking for backpackers, digital nomads, and travelers worldwide.',
  alternates: {
    canonical: '/'
  }
};

export default function HomePage() {
  return (
    <main className="pb-24">
      {/* ── Full-bleed Hero ── */}
      <section className="relative overflow-hidden">
        <div className="hero-photo flex flex-col justify-end px-6 py-16 md:px-16 md:py-24 lg:py-32">
          <div className="relative z-10 mx-auto w-full max-w-7xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                Curated Premium Stays
              </p>
            </div>
            <h1 className="font-heading text-5xl font-extrabold leading-[1.1] text-white md:text-7xl drop-shadow-xl animate-fade-in stagger-1">
              Discover your <br /> next escape
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/85 drop-shadow-md animate-fade-in stagger-2">
              Experience the world&apos;s most stunning destinations with verified rates, transparent pricing, and seamless booking.
            </p>
          </div>
        </div>

        {/* ── Search bar overlaid at bottom of hero ── */}
        <div className="relative z-30 mx-auto -mt-10 w-full max-w-4xl overflow-visible rounded-2xl border border-white/20 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 md:-mt-12 md:p-4 animate-fade-in stagger-3" style={{ marginLeft: 'auto', marginRight: 'auto', left: 0, right: 0 }}>
          <Suspense fallback={<SearchSkeleton />}>
            <HeroSearchBar className="border-none shadow-none bg-transparent" />
          </Suspense>
        </div>
      </section>

      {/* ── Trust Badges ── */}
      <section className="mx-auto mt-16 grid max-w-6xl gap-0 border-y border-border/60 px-4 md:grid-cols-3 md:mt-20">
        <div className="flex flex-col items-center p-10 text-center transition-colors hover:bg-primary/[0.03] border-b md:border-b-0 md:border-r border-border/60">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-base font-semibold">Verified Rates</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">Direct supply connections ensure real-time availability and pricing accuracy.</p>
        </div>
        <div className="flex flex-col items-center p-10 text-center transition-colors hover:bg-primary/[0.03] border-b md:border-b-0 md:border-r border-border/60">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
            <Wallet className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-base font-semibold">Transparent Pricing</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">See the full total including taxes and fees before you start checkout.</p>
        </div>
        <div className="flex flex-col items-center p-10 text-center transition-colors hover:bg-primary/[0.03]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-base font-semibold">Secure Checkout</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">Bank-grade encryption and signed quote verification for peace of mind.</p>
        </div>
      </section>

      {/* ── Content Sections ── */}
      <div className="mx-auto max-w-7xl space-y-24 px-4 pt-20">
        <FeaturedDealsStrip />
        <TrendingDestinations />
        <MoodDiscovery />
        <TravelArticles />
        <NewsletterBand />
      </div>
    </main>
  );
}
