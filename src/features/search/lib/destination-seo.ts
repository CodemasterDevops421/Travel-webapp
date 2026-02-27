import type { Metadata } from 'next';

export type SupportedDestination = {
  slug: string;
  label: string;
};

export const SUPPORTED_DESTINATIONS: SupportedDestination[] = [
  { slug: 'bali', label: 'Bali' },
  { slug: 'dubai', label: 'Dubai' },
  { slug: 'kyoto', label: 'Kyoto' },
  { slug: 'tokyo', label: 'Tokyo' },
  { slug: 'zurich', label: 'Zurich' }
];

const DESTINATION_BY_SLUG = new Map(SUPPORTED_DESTINATIONS.map((item) => [item.slug, item]));
const DESTINATION_BY_LABEL = new Map(SUPPORTED_DESTINATIONS.map((item) => [item.label.toLowerCase(), item]));
const DESTINATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeDestinationSlug(value: string): string | null {
  const slug = value.trim().toLowerCase();
  if (!slug || !DESTINATION_SLUG_PATTERN.test(slug)) return null;
  return slug;
}

export function getDestinationBySlug(value: string) {
  const slug = normalizeDestinationSlug(value);
  if (!slug) return null;
  return DESTINATION_BY_SLUG.get(slug) ?? null;
}

export function getDestinationByLabel(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return DESTINATION_BY_LABEL.get(normalized) ?? null;
}

export function buildDestinationPath(slug: string): string {
  return `/stays/${slug}`;
}

export function buildDestinationMetadata(destination: SupportedDestination): Metadata {
  const title = `Stays in ${destination.label} | Hostel Stays`;
  const description = `Compare prices, ratings, and amenities for stays in ${destination.label}.`;
  const canonical = buildDestinationPath(destination.slug);

  return {
    title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website'
    }
  };
}
