import { BadgePercent, MapPinned } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';

const deals = [
  {
    city: 'Santorini',
    tag: 'Suite escape',
    detail: 'Cliffside views + private plunge pool',
    price: '$420/night',
    dates: 'Mar 18 - Mar 23'
  },
  {
    city: 'Tokyo',
    tag: 'City reset',
    detail: '5-star Ginza tower with breakfast',
    price: '$310/night',
    dates: 'Apr 2 - Apr 6'
  },
  {
    city: 'Vancouver',
    tag: 'Harbor stay',
    detail: 'Waterfront suites with spa credit',
    price: '$265/night',
    dates: 'Mar 27 - Mar 31'
  }
];

export function FeaturedDealsStrip() {
  return (
    <section className="space-y-4 glass-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured deals</p>
          <h2 className="text-2xl font-semibold">Limited-time rates curated by our concierge</h2>
        </div>
        <PreferenceLink
          href="/search"
          className="text-sm font-semibold text-primary underline underline-offset-4 premium-hover"
        >
          View all deals
        </PreferenceLink>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {deals.map((deal) => (
          <article
            key={deal.city}
            className="flex h-full flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-white/60 dark:bg-slate-900/60 p-4 shadow-sm card-hover cursor-pointer backdrop-blur-md"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <BadgePercent className="h-4 w-4 text-primary" />
                {deal.tag}
              </div>
              <h3 className="text-lg font-semibold">{deal.city}</h3>
              <p className="text-sm text-muted-foreground">{deal.detail}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPinned className="h-4 w-4 text-primary" />
                {deal.dates}
              </div>
              <span className="font-semibold text-foreground">{deal.price}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
