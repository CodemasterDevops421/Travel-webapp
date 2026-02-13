import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LockKeyhole, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { HeroSearch } from '@/features/search/components/hero-search';
import { SearchSkeleton } from '@/features/search/components/search-skeleton';
import { TrendingDestinations } from '@/components/home/trending-destinations';
import { MoodDiscovery } from '@/components/home/mood-discovery';
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
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-6 md:py-8">
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">TravelForge Signature Stays</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Luxury booking with transparent pricing and zero checkout surprises.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            Discover curated hotels, review full cancellation terms upfront, and complete secure payment in one smooth flow.
          </p>
        </div>
        <div className="hidden md:block" />
      </header>

      <div className="grid gap-3 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm md:grid-cols-4">
        <article className="flex items-center gap-3 rounded-xl bg-background/70 p-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="text-sm">Verified rates direct from supply APIs</p>
        </article>
        <article className="flex items-center gap-3 rounded-xl bg-background/70 p-3">
          <Wallet className="h-5 w-5 text-primary" />
          <p className="text-sm">Total-first pricing with tax visibility</p>
        </article>
        <article className="flex items-center gap-3 rounded-xl bg-background/70 p-3">
          <LockKeyhole className="h-5 w-5 text-primary" />
          <p className="text-sm">Secure payment SDK and signed quote checks</p>
        </article>
        <article className="flex items-center gap-3 rounded-xl bg-background/70 p-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm">Premium curation for business and leisure</p>
        </article>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/75 px-4 py-3">
        <p className="text-sm text-muted-foreground">Already selected a rate and ready to pay?</p>
        <PreferenceLink href="/booking" className="text-sm font-semibold text-primary underline underline-offset-4">
          Open secure checkout
        </PreferenceLink>
      </div>

      <Suspense fallback={<SearchSkeleton />}>
        <HeroSearch />
      </Suspense>

      <TrendingDestinations />
      <MoodDiscovery />
    </main>
  );
}
