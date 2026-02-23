import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('hotel detail content completeness and truthful fallbacks', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/features/hotels/components/hotel-detail-experience.tsx'),
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
    expect(source).toContain('hotel?.completeness.message');
    expect(source).toContain('Some supplier details are currently unavailable for this property.');
  });

  it('uses truthful fallback copy for missing supplier blocks', () => {
    expect(source).toContain('Amenities data is currently unavailable from the supplier for this property.');
    expect(source).toContain('Cancellation policy details are currently unavailable from the supplier.');
    expect(source).toContain('Address details are currently unavailable from the supplier.');
    expect(source).toContain('Detailed guest comments are currently unavailable from the supplier.');
    expect(source).toContain('Pros and cons summaries are currently unavailable from supplier reviews.');
  });

  it('avoids implied completeness by removing synthetic amenity defaults', () => {
    expect(source).not.toContain("'Free WiFi', '24-hour front desk', 'Luggage storage'");
  });
});
