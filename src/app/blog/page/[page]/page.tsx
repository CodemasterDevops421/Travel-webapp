import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogCard } from '@/features/blog/components/blog-card';
import { BLOG_PAGE_SIZE, getAllPosts, searchPosts } from '@/features/blog/lib/content';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateStaticParams() {
  const all = await getAllPosts();
  const totalPages = Math.max(1, Math.ceil(all.length / BLOG_PAGE_SIZE));
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
    page: String(index + 2)
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `Travel Blog Page ${page} | Guides and Tips`,
    description: `Explore more travel guides and planning articles (page ${page}).`,
    alternates: {
      canonical: `/blog/page/${page}`
    }
  };
}

export default async function BlogPaginationPage({ params, searchParams }: PageProps) {
  const { page } = await params;
  const parsedPage = Number(page);
  if (!Number.isInteger(parsedPage) || parsedPage < 2) {
    notFound();
  }

  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  const all = query ? await searchPosts(query) : await getAllPosts();
  const totalPages = Math.max(1, Math.ceil(all.length / BLOG_PAGE_SIZE));

  if (parsedPage > totalPages) {
    notFound();
  }

  const offset = (parsedPage - 1) * BLOG_PAGE_SIZE;
  const pagePosts = all.slice(offset, offset + BLOG_PAGE_SIZE);
  const previousPath = parsedPage === 2 ? '/blog' : `/blog/page/${parsedPage - 1}`;
  const nextPath = parsedPage < totalPages ? `/blog/page/${parsedPage + 1}` : null;
  const querySuffix = query ? `?q=${encodeURIComponent(query)}` : '';

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Travel articles - page {parsedPage}</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Browse older stories, destination guides, and practical booking advice.
      </p>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pagePosts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </section>

      <div className="mt-10 flex items-center justify-center gap-3">
        <Link
          href={`${previousPath}${querySuffix}` as never}
          className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
        >
          Previous
        </Link>
        <span className="text-sm text-muted-foreground">
          {parsedPage} / {totalPages}
        </span>
        {nextPath ? (
          <Link
            href={`${nextPath}${querySuffix}` as never}
            className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
          >
            Next
          </Link>
        ) : null}
      </div>
    </main>
  );
}
