import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('hotel detail content completeness and truthful fallbacks', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'),
    'utf8'
  );

  const sectionsSource = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-sections.tsx'),
    'utf8'
  );

  it('renders required HOTL-01 section anchors', () => {
    expect(source).toContain("{ id: 'amenities', label: 'Amenities' }");
    expect(source).toContain("{ id: 'policies', label: 'Policies' }");
    expect(source).toContain("{ id: 'location', label: 'Location' }");
    expect(source).toContain("{ id: 'reviews', label: 'Reviews' }");
    expect(source).toContain("{ id: 'pros-cons', label: 'Pros & Cons' }");
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
    expect(sectionsSource).toContain('Detailed guest comments are currently unavailable from the supplier.');
    expect(sectionsSource).toContain('Pros and cons summaries are currently unavailable from supplier reviews.');
  });

  it('renders smart highlights from normalized hotel payload when available', () => {
    expect(sectionsSource).toContain('const smartHighlights = hotel?.smartHighlights ?? []');
    expect(sectionsSource).toContain("{highlight.source}");
    expect(sectionsSource).toContain('{highlight.title}');
    expect(sectionsSource).toContain('{highlight.detail}');
  });

  it('avoids implied completeness by removing synthetic amenity defaults', () => {
    expect(source).not.toContain("'Free WiFi', '24-hour front desk', 'Luggage storage'");
  });
});
