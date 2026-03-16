import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('homepage discovery card navigation contract', () => {
  const featuredDealsSource = readFileSync(
    resolve(process.cwd(), 'src/components/home/featured-deals-strip.tsx'),
    'utf8'
  );
  const travelArticlesSource = readFileSync(
    resolve(process.cwd(), 'src/components/home/travel-articles.tsx'),
    'utf8'
  );
  const trendingDestinationsSource = readFileSync(
    resolve(process.cwd(), 'src/components/home/trending-destinations.tsx'),
    'utf8'
  );

  it('routes featured deals cards through PreferenceLink with the restored city search href', () => {
    expect(featuredDealsSource).toContain("import { PreferenceLink } from '@/components/navigation/preference-link';");
    expect(featuredDealsSource).toContain('href={`/search?q=${encodeURIComponent(deal.city)}`}');
    expect(featuredDealsSource).toContain('className="group block rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"');
    expect(featuredDealsSource).toContain('<article className="flex h-full flex-col justify-between gap-4 overflow-hidden rounded-[28px] border border-border/70 bg-card p-6 shadow-premium-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-premium-md">');
    expect(featuredDealsSource).not.toContain('<article\n            key={deal.city}\n            className="group flex h-full cursor-pointer');
  });

  it('routes travel journal cards through PreferenceLink with vibe-mode search hrefs', () => {
    expect(travelArticlesSource).toContain("import { PreferenceLink } from '@/components/navigation/preference-link';");
    expect(travelArticlesSource).toContain('href={`/search?q=${encodeURIComponent(article.tag)}&mode=vibe`}');
    expect(travelArticlesSource).toContain('className="group block rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"');
    expect(travelArticlesSource).toContain('group-hover:translate-x-1');
    expect(travelArticlesSource).not.toContain('<article\r\n            key={article.title}\r\n            className={`group flex h-full cursor-pointer');
  });

  it('routes trending destination cards through PreferenceLink with the restored destination search href', () => {
    expect(trendingDestinationsSource).toContain("import { PreferenceLink } from '@/components/navigation/preference-link';");
    expect(trendingDestinationsSource).toContain('href={`/search?q=${encodeURIComponent(item.name)}`}');
    expect(trendingDestinationsSource).toContain('className="group block rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"');
    expect(trendingDestinationsSource).toContain('style={{ animationDelay: `${idx * 80}ms` }}');
    expect(trendingDestinationsSource).not.toContain('className="group cursor-pointer overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-premium-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-md"');
  });
});
