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
    <main className="pb-24" data-home-motion="safe">
      <section className="relative px-4 pt-4 md:px-8 md:pt-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-white/20 shadow-premium-lg">
          <div className="relative overflow-hidden px-6 py-14 md:px-10 md:py-18 lg:px-14 lg:py-20">
            <Image
              src="/images/hero-bg.png"
              alt="Mountain valley stay inspiration"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,37,69,0.28)_0%,rgba(11,37,69,0.6)_48%,rgba(11,37,69,0.9)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_28%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0B2545] via-[#0B2545]/55 to-transparent" />

            <div className="relative z-10 mx-auto max-w-4xl">
              <div className="max-w-3xl space-y-6 text-left text-white">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/88 animate-fade-in">
                  <Sparkles className="h-3.5 w-3.5" />
                  Discovery-first stays. Transparent totals.
                </div>
                <div className="space-y-4">
                  <h1 className="font-heading text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl md:text-6xl animate-fade-in">
                    Plan stays with
                    <span className="mt-3 block min-h-[1.15em] text-[#F8E7C5]">
                      <span className="hero-accent-emphasis inline-block">clarity, calm, and real totals.</span>
                    </span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-white/82 sm:text-base md:text-lg animate-fade-in stagger-2">
                    Search millions of rates worldwide, compare total value with confidence, and move from inspiration to
                    checkout through one clean discovery flow built to stay readable on every screen.
                  </p>
                </div>
                <div className="pt-2 animate-fade-in stagger-3">
                  <div className="surface-panel overflow-visible rounded-[32px] px-4 py-4 md:rounded-[36px] md:px-5 md:py-5">
                    <Suspense fallback={<SearchSkeleton />}>
                      <HeroSearchBar className="border-none bg-transparent shadow-none" />
                    </Suspense>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-white/88 animate-fade-in stagger-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2">
                    <ShieldCheck className="h-4 w-4 text-[#F8E7C5]" />
                    Verified rate sources
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2">
                    <Wallet className="h-4 w-4 text-[#F8E7C5]" />
                    Full totals before checkout
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2">
                    <LockKeyhole className="h-4 w-4 text-[#F8E7C5]" />
                    Secure checkout handoff
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-reveal mx-auto mt-16 max-w-6xl px-4 md:mt-20" data-reveal="home-module">
        <div className="surface-panel grid gap-0 overflow-hidden rounded-[32px] md:grid-cols-3">
          <div className="flex flex-col items-center border-b border-border/60 p-10 text-center transition-colors hover:bg-secondary/55 md:border-b-0 md:border-r">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-base font-semibold">Verified Rates</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">Direct supply connections ensure real-time availability and pricing accuracy.</p>
          </div>
          <div className="flex flex-col items-center border-b border-border/60 p-10 text-center transition-colors hover:bg-secondary/55 md:border-b-0 md:border-r">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4B544]/15 text-[#8A5A00]">
              <Wallet className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-base font-semibold">Transparent Pricing</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">See the full total including taxes and fees before you start checkout.</p>
          </div>
          <div className="flex flex-col items-center p-10 text-center transition-colors hover:bg-secondary/55">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-base font-semibold">Secure Checkout</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">Bank-grade encryption and signed quote verification for peace of mind.</p>
          </div>
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
