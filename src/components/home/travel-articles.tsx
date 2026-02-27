import { ArrowUpRight } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';

const articles = [
  {
    title: 'How to spot fully refundable luxury rates',
    summary: 'A quick checklist for cancellation windows, deposits, and supplier policies.',
    tag: 'Booking playbook',
    readTime: '4 min read',
    gradient: 'from-violet-500/10 to-purple-500/5'
  },
  {
    title: 'Design-led stays that feel like private residences',
    summary: 'Boutique hotels that trade crowds for curated, residential comfort.',
    tag: 'Stay inspiration',
    readTime: '6 min read',
    gradient: 'from-sky-500/10 to-indigo-500/5'
  },
  {
    title: 'Weekend itineraries built around wellness',
    summary: 'Plan a reset with spa credits, slow mornings, and scenic walks.',
    tag: 'Travel ideas',
    readTime: '5 min read',
    gradient: 'from-emerald-500/10 to-teal-500/5'
  }
];

export function TravelArticles() {
  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Travel journal</p>
          <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Guides from our travel editors</h2>
        </div>
        <PreferenceLink
          href="/search"
          className="text-sm font-semibold text-primary hover:underline underline-offset-4 transition-colors"
        >
          Browse all guides →
        </PreferenceLink>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {articles.map((article) => (
          <article
            key={article.title}
            className={`group flex h-full flex-col justify-between gap-5 rounded-2xl border border-border/60 bg-gradient-to-br ${article.gradient} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 cursor-pointer`}
          >
            <div className="space-y-3">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                {article.tag}
              </span>
              <h3 className="text-lg font-bold leading-snug">{article.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border/40 pt-4 text-sm">
              <span className="text-muted-foreground">{article.readTime}</span>
              <span className="inline-flex items-center gap-1 font-bold text-primary transition-transform duration-300 group-hover:translate-x-1">
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
