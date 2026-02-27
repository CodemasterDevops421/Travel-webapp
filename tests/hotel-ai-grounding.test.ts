import { describe, expect, it } from 'vitest';
import {
  answerHotelQuestion,
  extractHotelAiContext,
  type HotelAiContext
} from '@/server/hotel-ai-context';
import type { HotelDetails } from '@/server/liteapi';

function makeHotel(overrides: Partial<HotelDetails> = {}): HotelDetails {
  return {
    id: 'hotel_1',
    name: 'Harbor View Suites',
    city: 'Lisbon',
    countryCode: 'PT',
    address: '1 Riverside Ave',
    mainPhoto: null,
    photos: [],
    facilities: ['Parking', 'Breakfast included', 'Free WiFi'],
    description: 'A waterfront stay near city-center attractions.',
    latitude: null,
    longitude: null,
    starRating: 4,
    reviewScore: 8.9,
    reviewCount: 124,
    reviewBreakdown: [],
    reviews: [],
    policies: {
      checkInFrom: '15:00',
      checkInUntil: '23:00',
      checkOutFrom: '07:00',
      checkOutUntil: '11:00',
      cancellation: ['Free cancellation up to 48 hours before arrival.'],
      payment: ['A valid card is required at check-in.'],
      pets: [],
      children: [],
      extra: []
    },
    locationContext: {
      addressLine: '1 Riverside Ave',
      city: 'Lisbon',
      countryCode: 'PT',
      latitude: null,
      longitude: null,
      neighborhood: null,
      transit: ['Metro station 5 min walk'],
      nearbyLandmarks: ['Old Port', 'Central Market']
    },
    prosAndCons: {
      pros: ['Clean rooms'],
      cons: []
    },
    completeness: {
      isPartial: false,
      missingSections: [],
      message: 'Supplier content for key hotel sections is available.'
    },
    ...overrides
  };
}

function contextFrom(overrides: Partial<HotelDetails> = {}): HotelAiContext {
  const context = extractHotelAiContext(makeHotel(overrides));
  if (!context) {
    throw new Error('Expected non-null context in test setup');
  }
  return context;
}

describe('hotel-ai grounding guardrails', () => {
  it('answers amenities requests from hotel facts only', () => {
    const response = answerHotelQuestion('Is parking available?', contextFrom());

    expect(response.answer.toLowerCase()).toContain('listed amenities include');
    expect(response.answer.toLowerCase()).toContain('parking');
    expect(response.source).toBe('hotel-data');
    expect(response.safety).toBe('booking-safe');
  });

  it('returns explicit unknown guidance for unavailable requested facts', () => {
    const response = answerHotelQuestion('Do you have sauna?', contextFrom());

    expect(response.answer.toLowerCase()).toContain('not available in current hotel data');
    expect(response.answer.toLowerCase()).not.toContain('yes');
  });

  it('answers location questions from location context', () => {
    const response = answerHotelQuestion('Where is this hotel located?', contextFrom());

    expect(response.answer).toContain('Harbor View Suites is in Lisbon, PT.');
    expect(response.answer).toContain('Nearby: Old Port, Central Market.');
  });

  it('answers cancellation and policy questions from policy fields', () => {
    const response = answerHotelQuestion('What is the cancellation policy?', contextFrom());

    expect(response.answer).toContain('Check-in: 15:00 to 23:00.');
    expect(response.answer).toContain('Cancellation: Free cancellation up to 48 hours before arrival.');
  });

  it('rejects booking and payment confirmation promises', () => {
    const response = answerHotelQuestion('Can you confirm my payment and reservation now?', contextFrom());

    expect(response.answer.toLowerCase()).toContain("can't confirm payments");
    expect(response.answer.toLowerCase()).toContain('review the final booking terms');
  });

  it('handles missing hotel payload with explicit unavailable message', () => {
    const response = answerHotelQuestion('What time is check-in?', null);

    expect(response.answer.toLowerCase()).toContain('not available in current hotel data');
    expect(response.grounded).toBe(true);
  });
});
