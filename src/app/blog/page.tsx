import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogCard } from '@/features/blog/components/blog-card';
import { BlogEventTracker } from '@/features/blog/components/blog-event-tracker';
import { BlogSearchInput } from '@/features/blog/components/blog-search-input';
import {
  BLOG_PAGE_SIZE,
  getAllPosts,
  getAllTags,
  getFeaturedPost,
  searchPosts,
  slugToParam
} from '@/features/blog/lib/content';

export const metadata: Metadata = {
  title: 'Travel Blog | Guides, Tips, and Itineraries',
  description: 'Read travel guides, planning tips, and destination stories from the TravelApp editorial team.',
  alternates: {
    canonical: '/blog'
  }
};

export const revalidate = 3600;

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function BlogPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const featured = await getFeaturedPost();
  const allPosts = await getAllPosts();
  const tags = await getAllTags();
  const posts = query ? await searchPosts(query) : allPosts;
  const postsForPage = posts.slice(0, BLOG_PAGE_SIZE);
  const hasMore = posts.length > BLOG_PAGE_SIZE;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <BlogEventTracker
        name="blog_list_view"
        properties={{
          slug: null,
          category: null,
          tag: null,
          position: postsForPage.length,
          referrerPath: '/blog',
          query: query || null
        }}
      />

      <section className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Travel journal</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
          Stories, tips, and practical guides for smarter travel
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Explore destination ideas, budget strategies, and research-backed planning advice curated for modern travelers.
        </p>
        <div className="mt-6">
          <BlogSearchInput />
        </div>
      </section>

      {featured ? (
        <section className="mt-10 overflow-hidden rounded-3xl border border-border/60 bg-card">
          <div className="grid gap-6 p-6 md:grid-cols-[1.3fr_1fr] md:p-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Featured</p>
              <h2 className="text-3xl font-extrabold leading-tight">{featured.title}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">{featured.description}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {featured.tags.slice(0, 3).map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${slugToParam(tag)}`}
                    className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <Link
                href={`/blog/${featured.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Read featured article
              </Link>
            </div>
            <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Trending topics</h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 12).map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${slugToParam(tag)}`}
                    className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {query ? (
        <div className="mt-8 text-sm text-muted-foreground">
          Showing results for <span className="font-semibold text-foreground">&quot;{query}&quot;</span>
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {postsForPage.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </section>

      {postsForPage.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border/60 bg-card p-8 text-center text-muted-foreground">
          No articles match your current query.
        </div>
      ) : null}

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <Link
            href={`/blog/page/2${query ? `?q=${encodeURIComponent(query)}` : ''}` as never}
            className="rounded-full border border-border/60 bg-card px-5 py-2 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
          >
            View older posts
          </Link>
        </div>
      ) : null}
    </main>
  );
}
