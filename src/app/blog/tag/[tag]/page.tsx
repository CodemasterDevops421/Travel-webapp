import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogCard } from '@/features/blog/components/blog-card';
import { getAllTags, getPostsByTag, slugToParam } from '@/features/blog/lib/content';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag: slugToParam(tag) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag).replace(/-/g, ' ');
  return {
    title: `${decodedTag} Travel Guides | Travel Blog`,
    description: `Explore travel articles tagged with ${decodedTag}.`,
    alternates: {
      canonical: `/blog/tag/${tag}`
    }
  };
}

export default async function BlogTagPage({ params }: PageProps) {
  const { tag } = await params;
  const normalizedTag = decodeURIComponent(tag).replace(/-/g, ' ').toLowerCase();
  const posts = await getPostsByTag(normalizedTag);

  if (posts.length === 0) {
    notFound();
  }

  const displayTag = posts[0]?.tags.find((item) => item.toLowerCase() === normalizedTag) ?? normalizedTag;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8 md:pt-12">
      <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">#{displayTag}</h1>
      <p className="mt-3 text-base text-muted-foreground">Stories and tactical guides under this topic cluster.</p>
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

