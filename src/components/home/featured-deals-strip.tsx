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
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Featured deals</p>
          <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Limited-time rates curated by our concierge</h2>
        </div>
        <PreferenceLink
          href="/search"
          className="text-sm font-semibold text-primary hover:underline underline-offset-4 transition-colors"
        >
          View all deals →
        </PreferenceLink>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {deals.map((deal) => (
          <article
            key={deal.city}
            className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  <BadgePercent className="h-3.5 w-3.5" />
                  {deal.tag}
                </span>
              </div>
              <h3 className="text-xl font-bold">{deal.city}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{deal.detail}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border/40 pt-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPinned className="h-4 w-4 text-primary/70" />
                {deal.dates}
              </div>
              <span className="text-lg font-bold text-foreground">{deal.price}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
