import { Suspense } from 'react';
import { Moon, Sun } from 'lucide-react';
import { HeroSearch } from '@/features/search/components/hero-search';
import { SearchSkeleton } from '@/features/search/components/search-skeleton';
import { TrendingDestinations } from '@/components/home/trending-destinations';
import { MoodDiscovery } from '@/components/home/mood-discovery';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">TravelForge AI</p>
          <h1 className="text-4xl font-bold">Book premium stays with transparent pricing.</h1>
        </div>
        <div className="rounded-full border border-border p-2" aria-label="Theme icons">
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="hidden h-5 w-5 dark:block" />
        </div>
      </header>

      <Suspense fallback={<SearchSkeleton />}>
        <HeroSearch />
      </Suspense>

      <TrendingDestinations />
      <MoodDiscovery />
    </main>
  );
}
