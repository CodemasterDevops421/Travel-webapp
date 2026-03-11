import { cache } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { withNextCache } from '@/server/cache';

const destinations = [
  {
    name: 'Dubai',
    blurb: 'Skyline luxury and beach escapes',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Bali',
    blurb: 'Wellness villas and rainforest retreats',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Zurich',
    blurb: 'Lake views, boutiques, alpine access',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Kyoto',
    blurb: 'Heritage stays and culinary routes',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80'
  }
];

const getTrendingDestinations = cache(
  withNextCache(['home-trending-destinations'], { revalidate: 3600 }, async () => destinations)
);

export async function TrendingDestinations() {
  const data = await getTrendingDestinations();

  return (
    <section className="section-reveal space-y-6" data-reveal="home-module">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Popular now</p>
          <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Trending destinations</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Updated hourly</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item, idx) => (
          <article
            key={item.name}
            className="group cursor-pointer overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-premium-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-md"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div
              className="h-44 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(11,37,69,0.05) 0%, rgba(11,37,69,0.34) 100%), url("${item.image}")`
              }}
            />
            <div className="space-y-3 p-6">
              <h3 className="text-2xl font-heading font-bold">{item.name}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.blurb}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Explore rates</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform duration-300 group-hover:translate-x-1">
                View stays
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
