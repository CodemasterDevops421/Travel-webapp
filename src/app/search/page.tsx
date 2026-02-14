import type { Metadata } from 'next';
import { SearchResultsPage } from '@/features/search/components/search-results-page';
import { parseListingSearchParams } from '@/features/search/lib/listing-search-params';

export const metadata: Metadata = {
  title: 'Search Results | TravelForge',
  description: 'Browse hotel listings with photos, ratings, and live prices.',
  alternates: {
    canonical: '/search'
  }
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const listingParams = parseListingSearchParams(params);

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
