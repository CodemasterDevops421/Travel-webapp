import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { BlogEventTracker } from '@/features/blog/components/blog-event-tracker';
import { BlogMarkdown } from '@/features/blog/components/blog-markdown';
import { BlogTrackLink } from '@/features/blog/components/blog-track-link';
import { getAuthorById } from '@/features/blog/lib/authors';
import {
  getAllPosts,
  getPostBySlug,
  getRedirectForSlug,
  getRelatedPosts,
  slugToParam
} from '@/features/blog/lib/content';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatPublishedDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return {
      title: 'Article Not Found',
      description: 'This travel article could not be found.'
    };
  }

  const canonical = post.canonicalUrl ?? `/blog/${post.slug}`;
  const robots = post.noindex ? { index: false, follow: false } : undefined;

  return {
    title: `${post.title} | Travel Blog`,
    description: post.description,
    alternates: {
      canonical
    },
    robots,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: `/blog/${post.slug}`,
      images: [{ url: post.coverImage }]
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.coverImage]
    }
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    const redirectedSlug = await getRedirectForSlug(slug);
    if (redirectedSlug) {
      redirect(`/blog/${redirectedSlug}`);
    }
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.slug, 3);
  const author = getAuthorById(post.author);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const absoluteUrl = `${appUrl}/blog/${post.slug}`;
  const encodedUrl = encodeURIComponent(absoluteUrl);
  const encodedTitle = encodeURIComponent(post.title);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: post.coverImage,
    author: {
      '@type': 'Person',
      name: author?.name ?? post.author
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `/blog/${post.slug}`
    }
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: '/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `/blog/${post.slug}` }
    ]
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <BlogEventTracker
        name="blog_post_view"
        properties={{
          slug: post.slug,
          category: post.category,
          referrerPath: `/blog/${post.slug}`
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
          <div className="relative h-64 md:h-96">
            <Image src={post.coverImage} alt={post.title} fill priority sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 to-slate-900/45" />
          </div>
          <div className="space-y-7 p-6 md:p-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link
                  href={`/blog/category/${slugToParam(post.category)}`}
                  className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary hover:bg-primary/20"
                >
                  {post.category}
                </Link>
                <span className="text-muted-foreground">{formatPublishedDate(post.publishedAt)}</span>
                <span className="text-muted-foreground">{post.readingTime}</span>
              </div>
              <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">{post.title}</h1>
              <p className="text-base text-muted-foreground">{post.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${slugToParam(tag)}`}
                  className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium transition hover:border-primary/40 hover:text-primary"
                >
                  #{tag}
                </Link>
              ))}
            </div>

            <BlogMarkdown content={post.content} />

            {author ? (
              <section className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">About the author</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image src={author.avatar} alt={author.name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold">{author.name}</p>
                    <p className="text-sm text-muted-foreground">{author.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{author.bio}</p>
              </section>
            ) : null}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">On this page</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {post.headings.map((heading) => (
                <li key={heading.id} className={heading.level === 3 ? 'pl-3' : ''}>
                  <a href={`#${heading.id}`} className="text-muted-foreground hover:text-primary">
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Plan your stay</h2>
            <p className="mt-3 text-sm text-muted-foreground">Apply this guide to a real booking flow with live rates and flexible filters.</p>
            <div className="mt-4 flex flex-col gap-2">
              <BlogTrackLink
                href="/search?query=trending"
                eventName="blog_cta_click"
                slug={post.slug}
                category={post.category}
                referrerPath={`/blog/${post.slug}`}
                className="rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Explore stays
              </BlogTrackLink>
              <BlogTrackLink
                href="/hotels"
                eventName="blog_cta_click"
                slug={post.slug}
                category={post.category}
                referrerPath={`/blog/${post.slug}`}
                className="rounded-full border border-border/60 px-4 py-2 text-center text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
              >
                View hotels
              </BlogTrackLink>
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Share</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold hover:border-primary/40 hover:text-primary"
              >
                LinkedIn
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold hover:border-primary/40 hover:text-primary"
              >
                X
              </a>
              <a
                href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
                className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold hover:border-primary/40 hover:text-primary"
              >
                Email
              </a>
            </div>
          </section>
        </aside>
      </article>

      {relatedPosts.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Related articles</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {relatedPosts.map((related, index) => (
              <BlogTrackLink
                key={related.slug}
                href={`/blog/${related.slug}`}
                eventName="blog_related_click"
                slug={post.slug}
                category={post.category}
                position={index + 1}
                referrerPath={`/blog/${post.slug}`}
                className="rounded-2xl border border-border/60 bg-card p-4 transition hover:border-primary/30 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{related.category}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{related.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{related.description}</p>
              </BlogTrackLink>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
