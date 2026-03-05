'use client';

import { useEffect } from 'react';
import { trackBlogEvent } from '@/shared/lib/analytics';

type BlogEventTrackerProps = {
  name: 'blog_list_view' | 'blog_post_view';
  properties?: Record<string, string | number | boolean | null>;
};

export function BlogEventTracker({ name, properties }: BlogEventTrackerProps) {
  useEffect(() => {
    trackBlogEvent({
      name,
      properties: properties ?? {}
    });
  }, [name, properties]);

  return null;
}

