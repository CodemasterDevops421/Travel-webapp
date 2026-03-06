import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('search results truthfulness guardrails', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/search/components/horizontal-hotel-card.tsx'),
    'utf8'
  );

  it('removes fabricated comparison pricing from hotel cards', () => {
    expect(source).not.toContain('line-through');
    expect(source).not.toContain('(hotel.price ?? 0) * 1.08');
    expect(source).toContain('Actual price');
  });

  it('does not promise listing-level trust pills without supplier-backed data', () => {
    expect(source).not.toContain('Free cancellation');
    expect(source).not.toContain('Reserve now, pay later');
  });
});
