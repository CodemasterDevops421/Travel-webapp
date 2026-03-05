'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { trackBlogEvent } from '@/shared/lib/analytics';

export function BlogSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
          params.set('q', value.trim());
          trackBlogEvent({
            name: 'blog_search',
            properties: {
              slug: null,
              category: null,
              tag: null,
              position: null,
              query: value.trim(),
              referrerPath: pathname
            }
          });
        } else {
          params.delete('q');
        }
        router.push(`/blog?${params.toString()}`);
      }}
      className="relative w-full md:max-w-md"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by topic, city, or travel style"
        className="h-11 w-full rounded-full border border-border/60 bg-background pl-10 pr-4 text-sm outline-none ring-ring transition focus-visible:ring-2"
      />
    </form>
  );
}
