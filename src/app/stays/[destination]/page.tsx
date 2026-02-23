import { notFound } from 'next/navigation';
import { SearchResultsPage } from '@/features/search/components/search-results-page';
import { parseListingSearchParams } from '@/features/search/lib/listing-search-params';

type DestinationPageProps = {
  params: Promise<{ destination: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DESTINATION_BY_SLUG: Record<string, string> = {
  bali: 'Bali',
  dubai: 'Dubai',
  kyoto: 'Kyoto',
  tokyo: 'Tokyo',
  zurich: 'Zurich'
};

const DESTINATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function resolveDestination(slug: string): string | null {
  if (!DESTINATION_SLUG_PATTERN.test(slug)) {
    return null;
  }

  return DESTINATION_BY_SLUG[slug] ?? null;
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps) {
  const { destination } = await params;
  const destinationName = resolveDestination(destination.trim().toLowerCase());

  if (!destinationName) {
    notFound();
  }

  const paramsInput = await searchParams;
  const listingParams = parseListingSearchParams({
    ...paramsInput,
    q: destinationName
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
