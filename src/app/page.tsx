import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LockKeyhole, ShieldCheck, Wallet } from 'lucide-react';
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
      {/* ── Hero with rounded card look ── */}
      <section className="relative px-4 pt-4 md:px-8 md:pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl">
          {/* Background image + overlay */}
          <div
            className="flex flex-col items-center justify-center px-6 py-20 text-center md:py-28 lg:py-36"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(15,10,40,0.35) 0%, rgba(15,10,40,0.75) 60%, rgba(15,10,40,0.92) 100%), url("https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center 40%'
            }}
          >
            <h1 className="font-heading text-5xl font-extrabold leading-[1.1] text-white md:text-7xl drop-shadow-xl animate-fade-in">
              Same Stays.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
                Better Prices.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg animate-fade-in stagger-2">
              2 Million Hotels Worldwide. Compare rates, review full terms upfront,
              and book with confidence.
            </p>
          </div>
        </div>

        {/* ── Search bar overlapping the hero bottom ── */}
        <div className="relative z-30 mx-auto -mt-8 w-full max-w-3xl px-4 md:-mt-10 animate-fade-in stagger-3">
          <div className="overflow-visible rounded-full border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:p-2.5">
            <Suspense fallback={<SearchSkeleton />}>
              <HeroSearchBar className="border-none shadow-none bg-transparent" />
            </Suspense>
          </div>
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
