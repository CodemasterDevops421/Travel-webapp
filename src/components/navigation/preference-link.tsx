'use client';

import React from 'react';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';
import { normalizeCurrency, normalizeLanguage, withPreferenceParams } from '@/shared/lib/preferences';

type PreferenceLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

export function PreferenceLink({ href, ...props }: PreferenceLinkProps) {
  const storeLanguage = useSearchUIStore((state) => state.language);
  const storeCurrency = useSearchUIStore((state) => state.currency);

  const resolvedHref = useMemo(() => {
    const language = normalizeLanguage(storeLanguage);
    const currency = normalizeCurrency(storeCurrency);
    return withPreferenceParams(href, { language, currency });
  }, [href, storeLanguage, storeCurrency]);

  return <Link href={resolvedHref as never} {...props} />;
}
