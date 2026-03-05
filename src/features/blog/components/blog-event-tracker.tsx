'use client';

import { useEffect } from 'react';
import { trackBlogEvent, type BlogEventProperties } from '@/shared/lib/analytics';

type BlogEventTrackerProps = {
  name: 'blog_list_view' | 'blog_post_view';
  properties: BlogEventProperties;
};

export function BlogEventTracker({ name, properties }: BlogEventTrackerProps) {
  useEffect(() => {
    trackBlogEvent({
      name,
      properties
    });
  }, [name, properties]);

  return null;
}
