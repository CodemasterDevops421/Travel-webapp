import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('search results card behavior regression coverage', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/search/components/horizontal-hotel-card.tsx'),
    'utf8'
  );

  it('routes hotel-card navigation through PreferenceLink so stored preferences survive navigation', () => {
    expect(source).toContain("import { PreferenceLink } from '@/components/navigation/preference-link';");
    expect(source).toContain('<PreferenceLink href={hotelHref}>');
    expect(source).toContain('<PreferenceLink href={hotelHref} className="mt-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">');
    expect(source).toContain('<PreferenceLink href={hotelHref} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-8 font-bold text-primary-foreground shadow-premium-sm transition-all hover:bg-primary/95 hover:shadow-premium-md sm:w-auto">');
    expect(source).not.toContain('<a href={hotelHref}>');
  });

  it('does not advertise unsupported booking-benefit pills by default', () => {
    expect(source).not.toContain('Free cancellation');
    expect(source).not.toContain('Reserve now, pay later');
    expect(source).not.toContain('Limited supply for your dates');
    expect(source).not.toContain('Early booker deal');
  });
});
