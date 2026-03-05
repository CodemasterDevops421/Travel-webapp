'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackBlogEvent } from '@/shared/lib/analytics';

type BlogTrackLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  eventName: 'blog_related_click' | 'blog_cta_click';
  slug: string;
  category?: string;
  tag?: string;
  position?: number;
  referrerPath?: string;
  onClick?: () => void;
};

export function BlogTrackLink({
  eventName,
  slug,
  category,
  tag,
  position,
  referrerPath,
  onClick,
  className,
  children,
  ...props
}: BlogTrackLinkProps) {
  return (
    <Link
      href={props.href as never}
      className={className}
      onClick={(event) => {
        trackBlogEvent({
          name: eventName,
          properties: {
            slug,
            category: category ?? null,
            tag: tag ?? null,
            position: position ?? null,
            referrerPath: referrerPath ?? null,
            targetPath: props.href
          }
        });
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
