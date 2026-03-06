import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('language currency chooser URL sync', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/home/language-currency-chooser.tsx'),
    'utf8'
  );

  it('subscribes to search params changes and avoids overriding deep links', () => {
    expect(source).toContain('useSearchParams');
    expect(source).toContain('const searchParams = useSearchParams()');
    expect(source).toContain('const currentParams = new URLSearchParams(searchParams.toString())');
    expect(source).toContain('(queryLanguage && queryLanguage !== normalizedLanguage)');
    expect(source).toContain('(queryCurrency && queryCurrency !== normalizedCurrency)');
  });
});
