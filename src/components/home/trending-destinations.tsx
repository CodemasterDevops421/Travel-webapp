import { cache } from 'react';
import { Building2, Landmark, Mountain, Palmtree } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { withNextCache } from '@/server/cache';

const destinations = [
  { name: 'Dubai', blurb: 'Skyline luxury and beach escapes', icon: Building2, gradient: 'from-amber-500/20 to-orange-500/10' },
  { name: 'Bali', blurb: 'Wellness villas and rainforest retreats', icon: Palmtree, gradient: 'from-emerald-500/20 to-green-500/10' },
  { name: 'Zurich', blurb: 'Lake views, boutiques, alpine access', icon: Mountain, gradient: 'from-sky-500/20 to-blue-500/10' },
  { name: 'Kyoto', blurb: 'Heritage stays and culinary routes', icon: Landmark, gradient: 'from-rose-500/20 to-pink-500/10' }
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
          <PreferenceLink
            key={item.name}
            href={`/search?q=${encodeURIComponent(item.name)}`}
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <article
              className={`animate-soft-rise rounded-2xl border border-border/60 bg-gradient-to-br ${item.gradient} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-2xl font-heading font-bold">{item.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.blurb}</p>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Explore rates</p>
                <span className="text-primary transition-transform duration-300 group-hover:translate-x-2">→</span>
              </div>
            </article>
          </PreferenceLink>
        ))}
      </div>
    </section>
  );
}
