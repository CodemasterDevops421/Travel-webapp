import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
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
          <div
            className="relative overflow-hidden px-6 py-16 md:px-10 md:py-20 lg:px-14 lg:py-24"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(11,37,69,0.14) 0%, rgba(11,37,69,0.48) 52%, rgba(11,37,69,0.88) 100%), url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2200&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center 42%'
            }}
          >
            <div className="hero-spotlight pointer-events-none absolute left-[-8%] top-[6%] h-56 w-56 rounded-full bg-[#7FC8B2]/22 blur-3xl md:h-80 md:w-80" />
            <div className="hero-orbit pointer-events-none absolute right-[-10%] top-[18%] h-48 w-48 rounded-full border border-white/14 bg-white/6 blur-2xl md:h-72 md:w-72" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0B2545] via-[#0B2545]/45 to-transparent" />

            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr,0.85fr] lg:items-end">
              <div className="max-w-3xl space-y-6 text-left text-white">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/88 animate-fade-in">
                  <Sparkles className="h-3.5 w-3.5" />
                  Discovery-first stays. Transparent totals.
                </div>
                <div className="space-y-5">
                  <h1 className="font-heading text-4xl font-extrabold leading-[0.96] tracking-[-0.05em] text-white sm:text-5xl md:text-7xl animate-fade-in">
                    Plan stays that feel
                    <span className="mt-2 block min-h-[1.05em] text-[#F8E7C5]">
                      <span className="relative inline-flex">
                        <span className="motion-reduce:inline">editorial, verified, and route-aware.</span>
                        <span className="hero-word absolute inset-0 hidden motion-safe:inline-block">editorial and easy to trust.</span>
                        <span className="hero-word hero-word-delay-2 absolute inset-0 hidden motion-safe:inline-block">
                          tailored to the trip you are actually planning.
                        </span>
                        <span className="hero-word hero-word-delay-3 absolute inset-0 hidden motion-safe:inline-block">
                          premium without the booking guesswork.
                        </span>
                      </span>
                    </span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-white/82 sm:text-base md:text-lg animate-fade-in stagger-2">
                    Search millions of rates worldwide, compare total value with confidence, and move from inspiration to
                    checkout through one calm, polished discovery shell.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-white/88 animate-fade-in stagger-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2">
                    <ShieldCheck className="h-4 w-4 text-[#F8E7C5]" />
                    Verified rate sources
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2">
                    <Wallet className="h-4 w-4 text-[#F8E7C5]" />
                    Full totals before checkout
                  </span>
                </div>
                <div className="grid gap-3 pt-2 text-sm text-white/76 sm:grid-cols-3 animate-fade-in stagger-4">
                  <div className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
                    190+ countries searchable
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
                    Flexible-rate cues surfaced early
                  </div>
                  <div className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
                    Mobile-safe motion only
                  </div>
                </div>
              </div>

              <div className="hidden justify-end lg:flex">
                <div className="hero-orbit w-full max-w-sm rounded-[32px] border border-white/14 bg-white/12 p-6 text-white shadow-[0_28px_65px_-38px_rgba(8,25,47,0.95)] backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">This week’s focus</p>
                    <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      calm motion
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-heading font-bold leading-tight">
                    Coastal escapes, wellness weekends, and city stays with flexible terms.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/72">
                    Discovery cards, proof points, and search now read like one editorial travel system instead of isolated blocks.
                  </p>
                  <div className="mt-6 grid gap-3 rounded-[24px] border border-white/12 bg-[#0B2545]/30 p-4">
                    <div className="flex items-center justify-between text-sm text-white/72">
                      <span>Flexible-booking routes</span>
                      <span className="font-semibold text-white">67%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[67%] rounded-full bg-[#F8E7C5]" />
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#F8E7C5]">
                      Explore editor picks
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-30 mx-auto -mt-10 w-full max-w-6xl px-4 md:-mt-14 animate-fade-in stagger-3">
          <div className="surface-panel overflow-visible rounded-[32px] px-4 py-4 md:rounded-[36px] md:px-5 md:py-5">
            <Suspense fallback={<SearchSkeleton />}>
              <HeroSearchBar className="border-none bg-transparent shadow-none" />
            </Suspense>
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
