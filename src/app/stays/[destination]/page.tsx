import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SearchResultsPage } from '@/features/search/components/search-results-page';
import { buildDestinationMetadata, getDestinationBySlug, normalizeDestinationSlug } from '@/features/search/lib/destination-seo';
import { parseListingSearchParams } from '@/features/search/lib/listing-search-params';

type DestinationPageProps = {
  params: Promise<{ destination: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MetadataProps = {
  params: Promise<{ destination: string }>;
};

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { destination } = await params;
  const resolvedDestination = getDestinationBySlug(destination);

  if (resolvedDestination) {
    return buildDestinationMetadata(resolvedDestination);
  }

  // For non-hardcoded destinations, generate generic metadata
  const normalized = normalizeDestinationSlug(destination);
  if (!normalized) {
    return {
      title: 'Destination Not Found | Hostel Stays',
      description: 'The destination route is unavailable.',
      robots: { index: false, follow: false }
    };
  }

  const label = slugToLabel(normalized);
  return {
    title: `Stays in ${label} | Hostel Stays`,
    description: `Compare prices, ratings, and amenities for stays in ${label}.`,
    alternates: { canonical: `/stays/${normalized}` },
    robots: { index: false, follow: false }
  };
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps) {
  const { destination } = await params;
  const normalized = normalizeDestinationSlug(destination);

  if (!normalized) {
    notFound();
  }

  // Use the SEO label if it's a known destination, otherwise title-case the slug
  const resolvedDestination = getDestinationBySlug(destination);
  const queryLabel = resolvedDestination?.label ?? slugToLabel(normalized);

  const paramsInput = await searchParams;
  const listingParams = parseListingSearchParams({
    ...paramsInput,
    q: queryLabel
  });

  return (
    <SearchResultsPage
      query={listingParams.query}
      checkin={listingParams.checkin}
      checkout={listingParams.checkout}
      adults={listingParams.adults}
      rooms={listingParams.rooms}
      language={listingParams.language}
      currency={listingParams.currency}
    />
  );
}
