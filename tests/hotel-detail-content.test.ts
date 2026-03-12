import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HOTEL_DETAIL_REGRESSION_COMMAND =
  'npm run test -- tests/hotel-detail-content.test.ts tests/hotel-ai-grounding.test.ts tests/hotel-booking-card.test.ts';

describe('hotel detail content completeness and truthful fallbacks', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'),
    'utf8'
  );

  const sectionsSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-sections.tsx'),
    'utf8'
  );
  const guestReviewsSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/property-guest-reviews-section.tsx'),
    'utf8'
  );
  const propertyHeroSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/property-hero.tsx'),
    'utf8'
  );
  const roomSelectionSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/property-room-selection-section.tsx'),
    'utf8'
  );

  const liteApiSource = readFileSync(
    resolve(process.cwd(), 'src/server/liteapi.ts'),
    'utf8'
  );

  it('renders required HOTL-01 section anchors', () => {
    expect(source).toContain("{ id: 'overview', label: 'Overview' }");
    expect(source).toContain("{ id: 'rooms', label: 'Rooms' }");
    expect(source).toContain("{ id: 'reviews', label: 'Reviews' }");
    expect(source).toContain("{ id: 'amenities', label: 'Amenities' }");
    expect(source).toContain("{ id: 'policies', label: 'Policies' }");
    expect(source).not.toContain("{ id: 'location', label: 'Location' }");
    expect(source).not.toContain("{ id: 'pros-cons', label: 'Pros & Cons' }");
  });

  it('keeps page and section scaffolding pinned to the restored hotel-detail shell contract', () => {
    expect(source).toContain('className="hotel-detail-page page-shell mx-auto w-full max-w-7xl space-y-4 px-4 py-4 md:space-y-5 md:py-6"');
    expect(source).toContain('<section className="page-section relative flex flex-col">');
    expect(sectionsSource).toContain('<div className="page-section flex flex-col pb-16">');
    expect(propertyHeroSource).toContain('className="surface-shell space-y-4 px-4 py-4 md:px-5 md:py-5"');
    expect(guestReviewsSource).toContain('className="surface-shell scroll-mt-24 p-3.5 md:p-4"');
    expect(roomSelectionSource).toContain('className="surface-shell scroll-mt-24 space-y-4 p-3.5 md:p-4"');
  });

  it('shows explicit partial-data messaging from normalized completeness contract', () => {
    expect(sectionsSource).toContain('hotel?.completeness?.message');
    expect(sectionsSource).toContain('Some supplier details are currently unavailable for this property.');
  });

  it('uses truthful fallback copy for missing supplier blocks', () => {
    expect(sectionsSource).toContain('Smart highlights are currently unavailable because supplier detail signals are limited for this property.');
    expect(sectionsSource).toContain('Amenities data is currently unavailable from the supplier for this property.');
    expect(sectionsSource).toContain('Cancellation policy details are currently unavailable from the supplier.');
    expect(sectionsSource).toContain('Address details are currently unavailable from the supplier.');
    expect(guestReviewsSource).toContain('Detailed guest comments are currently unavailable from the supplier.');
    expect(sectionsSource).toContain('Pros and cons summaries are currently unavailable from supplier reviews.');
  });

  it('renders smart highlights from normalized hotel payload when available', () => {
    expect(sectionsSource).toContain('const smartHighlights = hotel?.smartHighlights ?? []');
    expect(sectionsSource).toContain("{highlight.source}");
    expect(sectionsSource).toContain('{highlight.title}');
    expect(sectionsSource).toContain('{highlight.detail}');
  });

  it('renders deterministic review highlights and low-signal fallback states', () => {
    expect(sectionsSource).toContain('const reviewHighlights = hotel?.reviewHighlights;');
    expect(guestReviewsSource).toContain('Top comments from travelers');
    expect(guestReviewsSource).toContain("reviewHighlights?.message ?? 'Not enough verified review volume to generate stable topic highlights yet.'");
  });

  it('enforces description hierarchy and sectioned narrative rendering', () => {
    expect(liteApiSource).toContain('function composeDescriptionNarrative');
    expect(liteApiSource).toContain("mode: 'supplier'");
    expect(liteApiSource).toContain("mode: 'synthesized'");
    expect(liteApiSource).toContain("mode: 'unavailable'");
    expect(sectionsSource).toContain('const descriptionNarrative = hotel?.descriptionNarrative;');
    expect(sectionsSource).toContain('{section.source}');
    expect(sectionsSource).toContain('{descriptionNarrative?.message ?? \'Property description is currently unavailable.\'}');
  });

  it('keeps review and description intelligence deterministic and source-bounded', () => {
    expect(liteApiSource).toContain('const REVIEW_TOPIC_PATTERNS');
    expect(liteApiSource).toContain('const minimumMentions = reviews.length >= 10 ? 3 : 2;');
    expect(liteApiSource).toContain('Review comments are available, but recurring topics are too sparse for a reliable summary.');
    expect(liteApiSource).toContain('Description is synthesized from available supplier fields because narrative text is unavailable.');
    expect(liteApiSource).toContain("mode: 'unavailable'");
  });

  it('documents a single hotel-detail regression verification command', () => {
    expect(HOTEL_DETAIL_REGRESSION_COMMAND).toContain('tests/hotel-detail-content.test.ts');
    expect(HOTEL_DETAIL_REGRESSION_COMMAND).toContain('tests/hotel-ai-grounding.test.ts');
    expect(HOTEL_DETAIL_REGRESSION_COMMAND).toContain('tests/hotel-booking-card.test.ts');
  });

  it('avoids implied completeness by removing synthetic amenity defaults', () => {
    expect(source).not.toContain("'Free WiFi', '24-hour front desk', 'Luggage storage'");
  });
});
