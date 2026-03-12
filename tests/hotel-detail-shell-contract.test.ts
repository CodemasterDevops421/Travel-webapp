import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsSource = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

const hotelDetailCallers = [
  'src/features/hotels/components/hotel-booking-sidebar.tsx',
  'src/features/hotels/components/hotel-detail-experience.tsx',
  'src/features/hotels/components/hotel-detail-sections.tsx',
  'src/features/hotels/components/property-guest-reviews-section.tsx',
  'src/features/hotels/components/property-hero.tsx',
  'src/features/hotels/components/property-room-selection-section.tsx'
] as const;

const callerSources = hotelDetailCallers.map((file) => ({
  file,
  source: readFileSync(resolve(process.cwd(), file), 'utf8')
}));

describe('hotel detail shell utility regression contract', () => {
  it('restores the legacy hotel-detail shell utility blocks in globals.css', () => {
    expect(globalsSource).toMatch(/\.surface-shell\s*\{\s*border:\s*1px solid hsl\(var\(--border\) \/ 0\.72\);/);
    expect(globalsSource).toContain('background: hsl(var(--card) / 0.92);');
    expect(globalsSource).toContain('border-radius: var(--surface-radius);');
    expect(globalsSource).toContain('box-shadow: var(--surface-shadow);');

    expect(globalsSource).toMatch(/\.surface-shell-subtle\s*\{\s*border:\s*1px solid hsl\(var\(--border\) \/ 0\.72\);/);
    expect(globalsSource).toContain('background: hsl(var(--card));');
    expect(globalsSource).toContain('border-radius: var(--surface-radius-sm);');

    expect(globalsSource).toContain('.page-shell {');
    expect(globalsSource).toContain('width: min(var(--page-max-width), calc(100vw - (var(--page-gutter) * 2)));');
    expect(globalsSource).toContain('margin-inline: auto;');

    expect(globalsSource).toContain('.page-section {');
    expect(globalsSource).toContain('gap: var(--section-gap);');
  });

  it('keeps active hotel-detail callers on the restored shell utility contract', () => {
    expect(callerSources.find((entry) => entry.file.endsWith('hotel-booking-sidebar.tsx'))?.source).toContain(
      'className="surface-shell overflow-hidden"'
    );
    expect(callerSources.find((entry) => entry.file.endsWith('hotel-booking-sidebar.tsx'))?.source).toContain(
      'className="surface-shell-subtle px-3 py-3"'
    );

    expect(callerSources.find((entry) => entry.file.endsWith('hotel-detail-experience.tsx'))?.source).toContain(
      'className="hotel-detail-page page-shell mx-auto w-full max-w-7xl'
    );
    expect(callerSources.find((entry) => entry.file.endsWith('hotel-detail-experience.tsx'))?.source).toContain(
      '<section className="page-section relative flex flex-col">'
    );

    expect(callerSources.find((entry) => entry.file.endsWith('hotel-detail-sections.tsx'))?.source).toContain(
      '<div className="page-section flex flex-col pb-16">'
    );
    expect(callerSources.find((entry) => entry.file.endsWith('hotel-detail-sections.tsx'))?.source).toContain(
      'className="surface-shell scroll-mt-24 p-3.5 md:p-4"'
    );

    expect(callerSources.find((entry) => entry.file.endsWith('property-guest-reviews-section.tsx'))?.source).toContain(
      'className="surface-shell scroll-mt-24 p-3.5 md:p-4"'
    );
    expect(callerSources.find((entry) => entry.file.endsWith('property-hero.tsx'))?.source).toContain(
      'className="surface-shell space-y-4 px-4 py-4 md:px-5 md:py-5"'
    );
    expect(callerSources.find((entry) => entry.file.endsWith('property-room-selection-section.tsx'))?.source).toContain(
      'className="surface-shell scroll-mt-24 space-y-4 p-3.5 md:p-4"'
    );
  });
});
