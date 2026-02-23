import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SearchResultsPage } from '@/features/search/components/search-results-page';
import { buildDestinationMetadata, getDestinationBySlug } from '@/features/search/lib/destination-seo';
import { parseListingSearchParams } from '@/features/search/lib/listing-search-params';

type DestinationPageProps = {
  params: Promise<{ destination: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MetadataProps = {
  params: Promise<{ destination: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { destination } = await params;
  const resolvedDestination = getDestinationBySlug(destination);

  if (!resolvedDestination) {
    return {
      title: 'Destination Not Found | Hostel Stays',
      description: 'The destination route is unavailable.',
      robots: {
        index: false,
        follow: false
      }
    };
  }

  return buildDestinationMetadata(resolvedDestination);
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps) {
  const { destination } = await params;
  const resolvedDestination = getDestinationBySlug(destination);

  if (!resolvedDestination) {
    notFound();
  }

  const paramsInput = await searchParams;
  const listingParams = parseListingSearchParams({
    ...paramsInput,
    q: resolvedDestination.label
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
