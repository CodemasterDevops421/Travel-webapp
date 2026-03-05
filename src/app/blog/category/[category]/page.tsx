import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogCard } from '@/features/blog/components/blog-card';
import { getAllCategories, getPostsByCategory, slugToParam } from '@/features/blog/lib/content';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((category) => ({ category: slugToParam(category) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category).replace(/-/g, ' ');
  return {
    title: `${decodedCategory} Travel Articles | Travel Blog`,
    description: `Browse all travel content in the ${decodedCategory} category.`,
    alternates: {
      canonical: `/blog/category/${category}`
    }
  };
}

export default async function BlogCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const normalizedCategory = decodeURIComponent(category).replace(/-/g, ' ').toLowerCase();
  const posts = await getPostsByCategory(normalizedCategory);

  if (posts.length === 0) {
    notFound();
  }

  const displayCategory = posts[0]?.category ?? normalizedCategory;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">{displayCategory}</h1>
      <p className="mt-3 text-base text-muted-foreground">Practical guides organized by editorial category.</p>
      <div className="mt-4">
        <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">
          Back to all articles
        </Link>
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </section>
    </main>
  );
}

