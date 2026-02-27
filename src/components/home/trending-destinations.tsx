import { cache } from 'react';
import { withNextCache } from '@/server/cache';

const destinations = [
  { name: 'Dubai', blurb: 'Skyline luxury and beach escapes', emoji: '🏙️', gradient: 'from-amber-500/20 to-orange-500/10' },
  { name: 'Bali', blurb: 'Wellness villas and rainforest retreats', emoji: '🌴', gradient: 'from-emerald-500/20 to-green-500/10' },
  { name: 'Zurich', blurb: 'Lake views, boutiques, alpine access', emoji: '🏔️', gradient: 'from-sky-500/20 to-blue-500/10' },
  { name: 'Kyoto', blurb: 'Heritage stays and culinary routes', emoji: '⛩️', gradient: 'from-rose-500/20 to-pink-500/10' }
];

const getTrendingDestinations = cache(
  withNextCache(['home-trending-destinations'], { revalidate: 3600 }, async () => destinations)
);

export async function TrendingDestinations() {
  const data = await getTrendingDestinations();

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Popular now</p>
          <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Trending destinations</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Updated hourly</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item, idx) => (
          <article
            key={item.name}
            className={`group animate-soft-rise cursor-pointer rounded-2xl border border-border/60 bg-gradient-to-br ${item.gradient} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <span className="text-3xl">{item.emoji}</span>
            <h3 className="mt-4 text-2xl font-heading font-bold">{item.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.blurb}</p>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Explore rates</p>
              <span className="text-primary transition-transform duration-300 group-hover:translate-x-2">→</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
