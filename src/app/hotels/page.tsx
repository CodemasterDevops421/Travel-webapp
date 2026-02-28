import type { Metadata } from 'next';
import { SearchResultsPage } from '@/features/search/components/search-results-page';
import { parseListingSearchParams } from '@/features/search/lib/listing-search-params';

export const metadata: Metadata = {
  title: 'Hotels | TravelApp',
  description: 'Browse hotels with live rates, ratings, and flexible stay filters.',
  alternates: {
    canonical: '/hotels'
  }
};

type HotelsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const params = await searchParams;
  const listingParams = parseListingSearchParams(params, {
    defaultQuery: 'Dubai'
  });

  return (
    <SearchResultsPage
      query={listingParams.query}
      mode={listingParams.mode}
      checkin={listingParams.checkin}
      checkout={listingParams.checkout}
      adults={listingParams.adults}
      rooms={listingParams.rooms}
      language={listingParams.language}
      currency={listingParams.currency}
    />
  );
}
