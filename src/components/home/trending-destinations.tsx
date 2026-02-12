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
        <p className="text-sm text-muted-foreground">Updated hourly</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {data.map((item) => (
          <article key={item.name} className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold">{item.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.blurb}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
