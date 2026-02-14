import type { Metadata } from 'next';
import { HeroSearch } from '@/features/search/components/hero-search';
import { TravelDeals } from '@/components/home/travel-deals';
import { TravelPlanning } from '@/components/home/travel-planning';
import { TravelArticles } from '@/components/home/travel-articles';
import { NewsletterSignup } from '@/components/home/newsletter-signup';
import { TrustedBy, Stats } from '@/components/home/trust-section';

export const metadata: Metadata = {
  title: 'BabyBoomerTrips | the fun starts now',
  description: 'The world\'s first travel portal for baby boomers. Find hand-selected travel deals with discounts on vacations, hotels, resorts, cruises, airfare, escorted tours and more.',
  alternates: {
    canonical: '/'
  }
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section with Search */}
      <section className="relative pt-16">
        <HeroSearch />
      </section>

      {/* Trust Stats */}
      <Stats />

      {/* Welcome Section */}
      <section className="py-16 px-4 text-center bg-gradient-to-b from-white to-slate-50 relative">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Welcome to BabyBoomerTrips.com
          </h2>
          <p className="text-lg font-semibold bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent mb-4">
            the world&apos;s first travel portal for baby boomers!
          </p>
          <p className="text-slate-600 leading-relaxed">
            Here, you&apos;ll find hand-selected travel deals for the Baby Boomer generation, including 
            senior travel deals with discounts on vacations, hotels, resorts, cruises, airfare, escorted tours and more.
          </p>
        </div>
      </section>

      {/* Trusted By Section */}
      <TrustedBy />

      {/* Today's Best Travel Deals */}
      <TravelDeals />

      {/* Start Your Travel Planning */}
      <TravelPlanning />

      {/* Travel Articles */}
      <TravelArticles />

      {/* Newsletter Signup */}
      <NewsletterSignup />
    </main>
  );
}
