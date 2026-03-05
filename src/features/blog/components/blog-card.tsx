import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import type { BlogPostSummary } from '@/features/blog/lib/content';

function formatPublishedDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function BlogCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="relative h-52 w-full">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(max-width: 1024px) 100vw, 33vw"
          className="object-cover"
          priority={Boolean(post.featured)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 to-slate-900/45" />
      </div>
      <article className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <span className="rounded-full bg-primary/10 px-3 py-1">{post.category}</span>
          <span className="text-muted-foreground">{post.readingTime}</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold leading-tight">{post.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{post.description}</p>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
          <span className="text-muted-foreground">{formatPublishedDate(post.publishedAt)}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary transition-transform duration-300 group-hover:translate-x-1">
            Read article
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </article>
    </Link>
  );
}
