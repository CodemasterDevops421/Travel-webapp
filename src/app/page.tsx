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
      <section className="relative px-4 pt-4 md:px-8 md:pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl">
          <div
            className="relative flex flex-col items-center justify-center px-6 py-20 text-center md:py-32 lg:py-40"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(17,12,40,0.08) 0%, rgba(17,12,40,0.28) 38%, rgba(17,12,40,0.52) 100%), url("/images/hero-bg.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/8" />
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold leading-[1.1] text-white md:text-7xl drop-shadow-lg animate-fade-in relative z-20">
              Same Stays. Better Prices.
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base font-medium text-white/90 md:text-lg animate-fade-in stagger-2 relative z-20">
              2 Million Hotels Worldwide.
            </p>
            <div className="relative z-30 mt-10 md:mt-12 w-full max-w-4xl px-2 md:px-0 animate-fade-in stagger-3">
              <Suspense fallback={<SearchSkeleton />}>
                <HeroSearchBar className="" />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

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
