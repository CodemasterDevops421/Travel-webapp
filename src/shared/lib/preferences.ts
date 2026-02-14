export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_CURRENCY = 'USD';

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' }
] as const;

export const CURRENCY_OPTIONS = ['USD', 'EUR', 'INR', 'GBP', 'AED'] as const;

type PreferenceInput = string | null | undefined;

export function normalizeLanguage(value: PreferenceInput): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return LANGUAGE_OPTIONS.some((option) => option.value === normalized) ? normalized : undefined;
}

export function normalizeCurrency(value: PreferenceInput): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return undefined;
  return CURRENCY_OPTIONS.includes(normalized as (typeof CURRENCY_OPTIONS)[number]) ? normalized : undefined;
}

export function withPreferenceParams(
  href: string,
  preferences: {
    language?: string;
    currency?: string;
  }
): string {
  if (!href.startsWith('/')) {
    return href;
  }

  const [base, hash = ''] = href.split('#', 2);
  const parsed = new URL(base, 'http://localhost');
  const language = normalizeLanguage(preferences.language);
  const currency = normalizeCurrency(preferences.currency);

  if (language && !parsed.searchParams.has('language')) {
    parsed.searchParams.set('language', language);
  }
  if (currency && !parsed.searchParams.has('currency')) {
    parsed.searchParams.set('currency', currency);
  }

  const query = parsed.searchParams.toString();
  const suffix = hash ? `#${hash}` : '';
  return query ? `${parsed.pathname}?${query}${suffix}` : `${parsed.pathname}${suffix}`;
}

export function upsertPreferenceParams(
  source: URLSearchParams,
  preferences: {
    language?: string;
    currency?: string;
  }
): URLSearchParams {
  const next = new URLSearchParams(source.toString());
  const language = normalizeLanguage(preferences.language);
  const currency = normalizeCurrency(preferences.currency);

  if (language) {
    next.set('language', language);
  }
  if (currency) {
    next.set('currency', currency);
  }

  return next;
}
