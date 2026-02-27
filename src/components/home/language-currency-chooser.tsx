'use client';

import { ChangeEvent, useEffect, useRef } from 'react';
import { Coins, Globe2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  normalizeCurrency,
  normalizeLanguage,
  upsertPreferenceParams
} from '@/shared/lib/preferences';

export function LanguageCurrencyChooser() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const language = useSearchUIStore((state) => state.language);
  const currency = useSearchUIStore((state) => state.currency);
  const setLanguage = useSearchUIStore((state) => state.setLanguage);
  const setCurrency = useSearchUIStore((state) => state.setCurrency);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const queryLanguage = normalizeLanguage(searchParams.get('language'));
    const queryCurrency = normalizeCurrency(searchParams.get('currency'));
    const savedLanguage = normalizeLanguage(window.localStorage.getItem('travelapp:language'));
    const savedCurrency = normalizeCurrency(window.localStorage.getItem('travelapp:currency'));
    const nextLanguage = queryLanguage ?? savedLanguage ?? DEFAULT_LANGUAGE;
    const nextCurrency = queryCurrency ?? savedCurrency ?? DEFAULT_CURRENCY;

    if (nextLanguage !== language) {
      setLanguage(nextLanguage);
    }
    if (nextCurrency !== currency) {
      setCurrency(nextCurrency);
    }
    hydratedRef.current = true;
  }, [currency, language, searchParams, setCurrency, setLanguage]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const normalizedLanguage = normalizeLanguage(language) ?? DEFAULT_LANGUAGE;
    const normalizedCurrency = normalizeCurrency(currency) ?? DEFAULT_CURRENCY;
    window.localStorage.setItem('travelapp:language', normalizedLanguage);
    window.localStorage.setItem('travelapp:currency', normalizedCurrency);

    const nextParams = upsertPreferenceParams(new URLSearchParams(searchParams.toString()), {
      language: normalizedLanguage,
      currency: normalizedCurrency
    });
    const current = searchParams.toString();
    const next = nextParams.toString();
    if (current !== next) {
      router.replace((next ? `${pathname}?${next}` : pathname) as never, { scroll: false });
    }
  }, [currency, language, pathname, router, searchParams]);

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs">
        <Globe2 className="h-3.5 w-3.5 text-primary" />
        <span className="sr-only">Language</span>
        <select
          className="w-[72px] bg-transparent text-xs font-semibold outline-none"
          value={language}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const value = normalizeLanguage(event.target.value) ?? DEFAULT_LANGUAGE;
            setLanguage(value);
          }}
          aria-label="Language"
        >
          {LANGUAGE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs">
        <Coins className="h-3.5 w-3.5 text-primary" />
        <span className="sr-only">Currency</span>
        <select
          className="w-[64px] bg-transparent text-xs font-semibold outline-none"
          value={currency}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const value = normalizeCurrency(event.target.value) ?? DEFAULT_CURRENCY;
            setCurrency(value);
          }}
          aria-label="Currency"
        >
          {CURRENCY_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
