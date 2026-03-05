import { ArrowUpRight } from 'lucide-react';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { getAllPosts } from '@/features/blog/lib/content';

const gradients = [
  'from-violet-500/10 to-purple-500/5',
  'from-sky-500/10 to-indigo-500/5',
  'from-emerald-500/10 to-teal-500/5'
];

export async function TravelArticles() {
  const articles = (await getAllPosts()).slice(0, 3);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Travel journal</p>
          <h2 className="mt-1 text-3xl font-heading font-bold tracking-tight">Guides from our travel editors</h2>
        </div>
        <PreferenceLink
          href="/blog"
          className="text-sm font-semibold text-primary transition-colors hover:underline underline-offset-4"
        >
          Browse all guides →
        </PreferenceLink>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {articles.map((article, index) => (
          <PreferenceLink
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <article
              className={`flex h-full flex-col justify-between gap-5 rounded-2xl border border-border/60 bg-gradient-to-br ${gradients[index % gradients.length]} p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10`}
            >
              <div className="space-y-3">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  {article.category}
                </span>
                <h3 className="text-lg font-bold leading-snug">{article.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{article.description}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-4 text-sm">
                <span className="text-muted-foreground">{article.readingTime}</span>
                <span className="inline-flex items-center gap-1 font-bold text-primary transition-transform duration-300 group-hover:translate-x-1">
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

