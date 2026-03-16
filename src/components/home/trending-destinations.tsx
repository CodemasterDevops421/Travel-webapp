import React, { cache } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { withNextCache } from '@/server/cache';

const destinations = [
  {
    name: 'Dubai',
    blurb: 'Skyline luxury and beach escapes',
    image: '/images/trending-dubai.png'
  },
  {
    name: 'Bali',
    blurb: 'Wellness villas and rainforest retreats',
    image: '/images/trending-bali.jpg'
  },
  {
    name: 'Zurich',
    blurb: 'Lake views, boutiques, alpine access',
    image: '/images/trending-zurich.png'
  },
  {
    name: 'Kyoto',
    blurb: 'Heritage stays and culinary routes',
    image: '/images/trending-kyoto.jpg'
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
          <PreferenceLink
            key={item.name}
            href={`/search?q=${encodeURIComponent(item.name)}`}
            className="group block rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <article
              className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-premium-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-md"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={item.image}
                  alt={`${item.name} destination`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,37,69,0.05)_0%,rgba(11,37,69,0.34)_100%)]" />
              </div>
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
          </PreferenceLink>
        ))}
      </div>
    </section>
  );
}
