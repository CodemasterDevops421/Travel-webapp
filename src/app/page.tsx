import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LockKeyhole, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { HeroSearch } from '@/features/search/components/hero-search';
import { SearchSkeleton } from '@/features/search/components/search-skeleton';
import { TrendingDestinations } from '@/components/home/trending-destinations';
import { MoodDiscovery } from '@/components/home/mood-discovery';
import { FeaturedDealsStrip } from '@/components/home/featured-deals-strip';
import { PlanningGrid } from '@/components/home/planning-grid';
import { TravelArticles } from '@/components/home/travel-articles';
import { NewsletterBand } from '@/components/home/newsletter-band';
import { PreferenceLink } from '@/components/navigation/preference-link';

export const metadata: Metadata = {
  title: 'TravelForge | Luxury Hotel Search & Booking',
  description: 'Discover premium hotels with transparent total pricing and secure checkout.',
  alternates: {
    canonical: '/'
  }
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-16 px-4 pb-16 pt-6 md:pt-8">
      <section className="relative overflow-visible rounded-[32px] border border-border/80 bg-card/75 p-5 md:p-8 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <header className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">TravelForge Signature Stays</p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Luxury booking with transparent pricing and zero checkout surprises.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Discover curated hotels, review full cancellation terms upfront, and complete secure payment in one smooth flow.
            </p>
            <div className="grid gap-3 rounded-2xl border border-border/80 bg-background/70 p-4 shadow-sm sm:grid-cols-2">
              <article className="flex items-center gap-3 rounded-xl bg-card/80 p-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-sm">Verified rates direct from supply APIs</p>
              </article>
              <article className="flex items-center gap-3 rounded-xl bg-card/80 p-3">
                <Wallet className="h-5 w-5 text-primary" />
                <p className="text-sm">Total-first pricing with tax visibility</p>
              </article>
              <article className="flex items-center gap-3 rounded-xl bg-card/80 p-3">
                <LockKeyhole className="h-5 w-5 text-primary" />
                <p className="text-sm">Secure payment SDK and signed quote checks</p>
              </article>
              <article className="flex items-center gap-3 rounded-xl bg-card/80 p-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-sm">Premium curation for business and leisure</p>
              </article>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-background/70 px-4 py-3">
              <p className="text-sm text-muted-foreground">Already selected a rate and ready to pay?</p>
              <PreferenceLink href="/booking" className="text-sm font-semibold text-primary underline underline-offset-4">
                Open secure checkout
              </PreferenceLink>
            </div>
          </header>

          <div className="relative">
            <div className="hero-photo" />
            <div className="hero-search-float">
              <Suspense fallback={<SearchSkeleton />}>
                <HeroSearch />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <FeaturedDealsStrip />
      <PlanningGrid />
      <TravelArticles />
      <NewsletterBand />
      <TrendingDestinations />
      <MoodDiscovery />
    </main>
  );
}
