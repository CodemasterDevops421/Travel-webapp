import { ArrowUpRight } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';

const articles = [
  {
    title: 'How to spot fully refundable luxury rates',
    summary: 'A quick checklist for cancellation windows, deposits, and supplier policies.',
    tag: 'Booking playbook',
    readTime: '4 min read'
  },
  {
    title: 'Design-led stays that feel like private residences',
    summary: 'Boutique hotels that trade crowds for curated, residential comfort.',
    tag: 'Stay inspiration',
    readTime: '6 min read'
  },
  {
    title: 'Weekend itineraries built around wellness',
    summary: 'Plan a reset with spa credits, slow mornings, and scenic walks.',
    tag: 'Travel ideas',
    readTime: '5 min read'
  }
];

export function TravelArticles() {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Travel journal</p>
          <h2 className="text-2xl font-semibold">Guides from our travel editors</h2>
        </div>
        <PreferenceLink
          href="/search"
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          Browse all guides
        </PreferenceLink>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {articles.map((article) => (
          <article
            key={article.title}
            className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm"
          >
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{article.tag}</p>
              <h3 className="text-lg font-semibold">{article.title}</h3>
              <p className="text-sm text-muted-foreground">{article.summary}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{article.readTime}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                Read article
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
