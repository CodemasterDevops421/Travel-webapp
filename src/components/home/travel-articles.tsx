import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';

const articles = [
  {
    title: 'How to spot fully refundable luxury rates',
    summary: 'A quick checklist for cancellation windows, deposits, and supplier policies.',
    tag: 'Booking playbook',
    readTime: '4 min read',
    gradient: 'from-[#0B2545]/8 to-[#1F5E7A]/4'
  },
  {
    title: 'Design-led stays that feel like private residences',
    summary: 'Boutique hotels that trade crowds for curated, residential comfort.',
    tag: 'Stay inspiration',
    readTime: '6 min read',
    gradient: 'from-[#1F5E7A]/10 to-[#2C7A8F]/5'
  },
  {
    title: 'Weekend itineraries built around wellness',
    summary: 'Plan a reset with spa credits, slow mornings, and scenic walks.',
    tag: 'Travel ideas',
    readTime: '5 min read',
    gradient: 'from-[#2D8C74]/10 to-[#7FC8B2]/6'
  }
];

export function TravelArticles() {
  return (
    <section className="section-reveal space-y-6" data-reveal="home-module">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Travel journal</p>
          <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Guides from our travel editors</h2>
        </div>
        <PreferenceLink
          href="/search"
          className="text-sm font-semibold text-accent hover:underline underline-offset-4 transition-colors"
        >
          Browse all guides →
        </PreferenceLink>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {articles.map((article) => (
          <PreferenceLink
            key={article.title}
            href={`/search?q=${encodeURIComponent(article.tag)}&mode=vibe`}
            className="group block rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <article
              className={`flex h-full flex-col justify-between gap-5 rounded-[28px] border border-border/70 bg-gradient-to-br ${article.gradient} p-6 shadow-premium-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-md hover:border-accent/20`}
            >
              <div className="space-y-3">
                <span className="inline-block rounded-full border border-accent/15 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                  {article.tag}
                </span>
                <h3 className="text-lg font-bold leading-snug">{article.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-4 text-sm">
                <span className="text-muted-foreground">{article.readTime}</span>
                <span className="inline-flex items-center gap-1 font-bold text-accent transition-transform duration-300 group-hover:translate-x-1">
                  Read article
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
