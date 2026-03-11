import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('booking layout chrome suppression', () => {
  const headerSource = readFileSync(resolve(process.cwd(), 'src/components/layout/header.tsx'), 'utf8');

  it('suppresses the global header for checkout routes', () => {
    expect(headerSource).toContain("const isBookingFlow = pathname.startsWith('/booking');");
    expect(headerSource).toContain('if (isBookingFlow) {');
    expect(headerSource).toContain('return null;');
  });

  it('keeps the compact hero search outside the checkout boundary', () => {
    const bookingFlowGuardIndex = headerSource.indexOf("const isBookingFlow = pathname.startsWith('/booking');");
    const compactSearchIndex = headerSource.indexOf("<HeroSearchBar variant=\"compact\"");
    const nullReturnIndex = headerSource.indexOf('return null;');

    expect(bookingFlowGuardIndex).toBeGreaterThanOrEqual(0);
    expect(nullReturnIndex).toBeGreaterThan(bookingFlowGuardIndex);
    expect(compactSearchIndex).toBeGreaterThan(nullReturnIndex);
  });
});
