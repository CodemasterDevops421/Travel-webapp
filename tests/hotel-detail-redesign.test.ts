import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('hotel detail redesign regression coverage', () => {
  const experienceSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'),
    'utf8'
  );
  const sectionsSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-sections.tsx'),
    'utf8'
  );
  const gallerySource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-photo-gallery.tsx'),
    'utf8'
  );

  it('keeps the tab order aligned to the redesigned hotel detail flow', () => {
    expect(experienceSource.indexOf("{ id: 'reviews', label: 'Reviews' }")).toBeLessThan(
      experienceSource.indexOf("{ id: 'rooms', label: 'Rooms' }")
    );
    expect(experienceSource.indexOf("{ id: 'travelers-asking', label: 'FAQs' }")).toBeLessThan(
      experienceSource.indexOf("{ id: 'amenities', label: 'Amenities' }")
    );
  });

  it('uses six reviews in collapsed rail mode and respects reduced-motion preferences', () => {
    expect(sectionsSource).toContain('const visibleReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 6);');
    expect(sectionsSource).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(sectionsSource).toContain('const [isReviewRailPaused, setIsReviewRailPaused] = useState(false);');
  });

  it('removes the legacy hardcoded blue booking colors from review actions and score bars', () => {
    expect(sectionsSource).not.toContain('bg-[#006ce4]');
    expect(sectionsSource).not.toContain('bg-[#003b95]');
    expect(sectionsSource).not.toContain('text-[#006ce4]');
  });

  it('keeps gallery overlays and premium motion hooks for the tiled media layout', () => {
    expect(gallerySource).toContain('group-hover:scale-110');
    expect(gallerySource).toContain('Main view');
    expect(gallerySource).toContain('View photo');
  });
});
