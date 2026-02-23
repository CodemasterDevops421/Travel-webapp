import 'server-only';

import { z } from 'zod';
import type { HotelDetails } from '@/server/liteapi';

const MAX_TEXT = 280;

const hotelAiContextSchema = z.object({
  hotelName: z.string().trim().min(1),
  city: z.string().trim().min(1),
  countryCode: z.string().trim().min(1).nullable(),
  address: z.string().trim().min(1).nullable(),
  amenities: z.array(z.string().trim().min(1)).max(40),
  cancellationPolicies: z.array(z.string().trim().min(1)).max(12),
  paymentPolicies: z.array(z.string().trim().min(1)).max(12),
  checkInFrom: z.string().trim().min(1).nullable(),
  checkInUntil: z.string().trim().min(1).nullable(),
  checkOutFrom: z.string().trim().min(1).nullable(),
  checkOutUntil: z.string().trim().min(1).nullable(),
  nearbyLandmarks: z.array(z.string().trim().min(1)).max(12),
  transit: z.array(z.string().trim().min(1)).max(12),
  pros: z.array(z.string().trim().min(1)).max(8),
  cons: z.array(z.string().trim().min(1)).max(8),
  description: z.string().trim().min(1).nullable(),
  reviewScore: z.number().nullable(),
  reviewCount: z.number().nullable()
});

export type HotelAiContext = z.infer<typeof hotelAiContextSchema>;

type HotelAiAnswer = {
  answer: string;
  grounded: true;
  source: 'hotel-data';
  safety: 'booking-safe';
};

export type HotelAiContextDigest = {
  knownFactSections: string[];
  amenityCount: number;
  policyCount: number;
  locationSignalCount: number;
};

function clampText(input: string, max = MAX_TEXT): string {
  const text = input.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function uniq(list: string[]): string[] {
  return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function unavailableGuidance(topic: string): string {
  return `That ${topic} is not available in current hotel data. Please confirm final details in the booking terms before payment.`;
}

function isAmenityQuestion(text: string): boolean {
  return /amenit|parking|breakfast|wifi|pool|gym|spa|restaurant|bar|pet/.test(text);
}

function isLocationQuestion(text: string): boolean {
  return /location|near|distance|airport|station|address|neighbo[u]?rhood|area/.test(text);
}

function isPolicyQuestion(text: string): boolean {
  return /cancell|refund|refundable|check[ -]?in|check[ -]?out|policy|policies|pet|children/.test(text);
}

function isBookingSafetyQuestion(text: string): boolean {
  return /payment|pay|card|charged|charge|confirm|confirmation|guarantee|book.*now|reservation/.test(text);
}

function answerAmenities(question: string, context: HotelAiContext): string {
  if (context.amenities.length === 0) {
    return unavailableGuidance('amenity information');
  }

  const q = question.toLowerCase();
  const matched = context.amenities.filter((item) => q.includes(item.toLowerCase()));
  if (matched.length > 0) {
    return `Yes, the listed amenities include: ${matched.slice(0, 4).join(', ')}. Availability can vary by room and stay dates.`;
  }

  return `The property lists these amenities: ${context.amenities.slice(0, 8).join(', ')}.`;
}

function answerLocation(context: HotelAiContext): string {
  const cityLine = `${context.hotelName} is in ${context.city}${context.countryCode ? `, ${context.countryCode}` : ''}.`;
  const detailParts = [
    context.address ? `Address: ${context.address}.` : null,
    context.nearbyLandmarks.length > 0
      ? `Nearby: ${context.nearbyLandmarks.slice(0, 3).join(', ')}.`
      : null,
    context.transit.length > 0 ? `Transit notes: ${context.transit.slice(0, 2).join(', ')}.` : null
  ].filter(Boolean);

  if (detailParts.length === 0) {
    return `${cityLine} ${unavailableGuidance('location details')}`;
  }
  return [cityLine, ...detailParts].join(' ');
}

function answerPolicy(context: HotelAiContext): string {
  const policyParts = [
    context.checkInFrom || context.checkInUntil
      ? `Check-in: ${context.checkInFrom ?? 'not available'} to ${context.checkInUntil ?? 'not available'}.`
      : null,
    context.checkOutFrom || context.checkOutUntil
      ? `Check-out: ${context.checkOutFrom ?? 'not available'} to ${context.checkOutUntil ?? 'not available'}.`
      : null,
    context.cancellationPolicies.length > 0
      ? `Cancellation: ${context.cancellationPolicies.slice(0, 2).join(' ')}`
      : null,
    context.paymentPolicies.length > 0
      ? `Payment terms: ${context.paymentPolicies.slice(0, 2).join(' ')}`
      : null
  ].filter(Boolean);

  if (policyParts.length === 0) {
    return unavailableGuidance('policy and cancellation details');
  }

  return policyParts.join(' ');
}

function answerFallback(context: HotelAiContext): string {
  if (context.description) {
    return `Here is what is available in current hotel data: ${clampText(context.description)}.`;
  }
  if (context.pros.length > 0 || context.cons.length > 0) {
    const parts = [
      context.pros.length > 0 ? `Guests often liked: ${context.pros.slice(0, 2).join('; ')}.` : null,
      context.cons.length > 0 ? `Reported drawbacks: ${context.cons.slice(0, 2).join('; ')}.` : null
    ].filter(Boolean);
    return parts.join(' ');
  }
  return unavailableGuidance('answer context');
}

export function extractHotelAiContext(hotel: HotelDetails | null): HotelAiContext | null {
  if (!hotel) return null;

  const parsed = hotelAiContextSchema.safeParse({
    hotelName: hotel.name,
    city: hotel.city,
    countryCode: normalizeOptionalString(hotel.countryCode),
    address: normalizeOptionalString(hotel.address),
    amenities: uniq(hotel.facilities ?? []).slice(0, 40),
    cancellationPolicies: uniq(hotel.policies?.cancellation ?? []).slice(0, 12),
    paymentPolicies: uniq(hotel.policies?.payment ?? []).slice(0, 12),
    checkInFrom: normalizeOptionalString(hotel.policies?.checkInFrom),
    checkInUntil: normalizeOptionalString(hotel.policies?.checkInUntil),
    checkOutFrom: normalizeOptionalString(hotel.policies?.checkOutFrom),
    checkOutUntil: normalizeOptionalString(hotel.policies?.checkOutUntil),
    nearbyLandmarks: uniq(hotel.locationContext?.nearbyLandmarks ?? []).slice(0, 12),
    transit: uniq(hotel.locationContext?.transit ?? []).slice(0, 12),
    pros: uniq(hotel.prosAndCons?.pros ?? []).slice(0, 8),
    cons: uniq(hotel.prosAndCons?.cons ?? []).slice(0, 8),
    description: normalizeOptionalString(hotel.description),
    reviewScore: typeof hotel.reviewScore === 'number' ? hotel.reviewScore : null,
    reviewCount: typeof hotel.reviewCount === 'number' ? hotel.reviewCount : null
  });

  return parsed.success ? parsed.data : null;
}

export function buildHotelAiContextDigest(context: HotelAiContext | null): HotelAiContextDigest {
  if (!context) {
    return {
      knownFactSections: [],
      amenityCount: 0,
      policyCount: 0,
      locationSignalCount: 0
    };
  }

  const knownFactSections = [
    context.amenities.length > 0 ? 'amenities' : null,
    context.cancellationPolicies.length > 0 || context.paymentPolicies.length > 0 ? 'policies' : null,
    context.address || context.nearbyLandmarks.length > 0 || context.transit.length > 0 ? 'location' : null,
    context.description || context.pros.length > 0 || context.cons.length > 0 ? 'descriptive' : null,
    typeof context.reviewScore === 'number' || typeof context.reviewCount === 'number' ? 'reviews' : null
  ].filter((value): value is string => Boolean(value));

  return {
    knownFactSections,
    amenityCount: context.amenities.length,
    policyCount: context.cancellationPolicies.length + context.paymentPolicies.length,
    locationSignalCount: Number(Boolean(context.address)) + context.nearbyLandmarks.length + context.transit.length
  };
}

export function answerHotelQuestion(question: string, context: HotelAiContext | null): HotelAiAnswer {
  const normalizedQuestion = question.trim().toLowerCase();

  if (isBookingSafetyQuestion(normalizedQuestion)) {
    return {
      answer:
        "I can't confirm payments, reservations, policy exceptions, or final booking outcomes. Please continue through checkout and review the final booking terms for authoritative details.",
      grounded: true,
      source: 'hotel-data',
      safety: 'booking-safe'
    };
  }

  if (!context) {
    return {
      answer:
        'Current hotel data is unavailable right now, so the requested detail is not available in current hotel data. Please try again shortly or review booking terms before payment.',
      grounded: true,
      source: 'hotel-data',
      safety: 'booking-safe'
    };
  }

  if (isAmenityQuestion(normalizedQuestion)) {
    return {
      answer: answerAmenities(normalizedQuestion, context),
      grounded: true,
      source: 'hotel-data',
      safety: 'booking-safe'
    };
  }

  if (isLocationQuestion(normalizedQuestion)) {
    return {
      answer: answerLocation(context),
      grounded: true,
      source: 'hotel-data',
      safety: 'booking-safe'
    };
  }

  if (isPolicyQuestion(normalizedQuestion)) {
    return {
      answer: answerPolicy(context),
      grounded: true,
      source: 'hotel-data',
      safety: 'booking-safe'
    };
  }

  return {
    answer: answerFallback(context),
    grounded: true,
    source: 'hotel-data',
    safety: 'booking-safe'
  };
}
