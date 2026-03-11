import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('hotel photo gallery mobile layout regression coverage', () => {
  const gallerySource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-photo-gallery.tsx'),
    'utf8'
  );

  it('removes the base fixed-height container that clipped mobile thumbnails', () => {
    expect(gallerySource).not.toContain('grid h-[400px] gap-2 overflow-hidden rounded-[32px]');
    expect(gallerySource).toContain('grid gap-2 rounded-[32px] md:h-[520px] md:grid-cols-[2fr,1fr] md:overflow-hidden');
  });

  it('uses mobile-safe aspect ratios before switching back to the desktop mosaic', () => {
    expect(gallerySource).toContain('aspect-[4/3] min-h-[240px] w-full overflow-hidden rounded-[28px] bg-muted md:h-full md:min-h-0 md:aspect-auto');
    expect(gallerySource).toContain('grid grid-cols-2 gap-2 md:h-full md:grid-rows-2');
    expect(gallerySource).toContain('aspect-square w-full overflow-hidden rounded-[24px] bg-muted md:h-full md:aspect-auto');
  });

  it('keeps the empty-state gallery card visible on mobile without a clipped fixed row', () => {
    expect(gallerySource).toContain('col-span-2 flex min-h-[180px] items-center justify-center rounded-2xl border border-border bg-card/70 md:h-[210px] md:min-h-0');
    expect(gallerySource).not.toContain('col-span-2 flex h-[210px] items-center justify-center');
  });
});
