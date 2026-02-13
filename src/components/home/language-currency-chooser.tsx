'use client';

import { useEffect } from 'react';
import { Coins, Globe2 } from 'lucide-react';
import { useSearchUIStore } from '@/features/search/stores/search-ui-store';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' }
];

const CURRENCY_OPTIONS = ['USD', 'EUR', 'INR', 'GBP', 'AED'];

export function LanguageCurrencyChooser() {
  const language = useSearchUIStore((state) => state.language);
  const currency = useSearchUIStore((state) => state.currency);
  const setLanguage = useSearchUIStore((state) => state.setLanguage);
  const setCurrency = useSearchUIStore((state) => state.setCurrency);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem('tf:language');
    const savedCurrency = window.localStorage.getItem('tf:currency');

    if (savedLanguage && LANGUAGE_OPTIONS.some((item) => item.value === savedLanguage)) {
      setLanguage(savedLanguage);
    }
    if (savedCurrency && CURRENCY_OPTIONS.includes(savedCurrency)) {
      setCurrency(savedCurrency);
    }
  }, [setLanguage, setCurrency]);

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs">
        <Globe2 className="h-3.5 w-3.5 text-primary" />
        <span className="sr-only">Language</span>
        <select
          className="bg-transparent text-xs outline-none"
          value={language}
          onChange={(event) => {
            const value = event.target.value;
            setLanguage(value);
            window.localStorage.setItem('tf:language', value);
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
      <label className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs">
        <Coins className="h-3.5 w-3.5 text-primary" />
        <span className="sr-only">Currency</span>
        <select
          className="bg-transparent text-xs outline-none"
          value={currency}
          onChange={(event) => {
            const value = event.target.value;
            setCurrency(value);
            window.localStorage.setItem('tf:currency', value);
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
