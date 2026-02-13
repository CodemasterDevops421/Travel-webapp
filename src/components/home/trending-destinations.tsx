import { cache } from 'react';
import { withNextCache } from '@/server/cache';

const destinations = [
  { name: 'Dubai', blurb: 'Skyline luxury and beach escapes' },
  { name: 'Bali', blurb: 'Wellness villas and rainforest retreats' },
  { name: 'Zurich', blurb: 'Lake views, boutiques, alpine access' },
  { name: 'Kyoto', blurb: 'Heritage stays and culinary routes' }
];

const getTrendingDestinations = cache(
  withNextCache(['home-trending-destinations'], { revalidate: 3600 }, async () => destinations)
);

export async function TrendingDestinations() {
  const data = await getTrendingDestinations();

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-semibold">Trending destinations</h2>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated hourly</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {data.map((item, idx) => (
          <article
            key={item.name}
            className="group animate-soft-rise cursor-pointer rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured</p>
            <h3 className="mt-2 text-lg font-semibold">{item.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.blurb}</p>
            <p className="mt-3 text-xs font-semibold text-primary">Explore rates</p>
          </article>
        ))}
      </div>
    </section>
  );
}
