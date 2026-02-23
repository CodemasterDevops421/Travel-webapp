import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { buildDestinationPath, getDestinationByLabel } from '@/features/search/lib/destination-seo';
import { parseDiscoveryQuery, serializeDiscoveryQuery } from '@/features/search/lib/discovery-query';

export const metadata: Metadata = {
  title: 'Search Results | Hostel Stays',
  description: 'Browse hotel listings with photos, ratings, and live prices.',
  alternates: {
    canonical: '/stays/dubai'
  }
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const queryState = parseDiscoveryQuery(params, { defaultDestination: 'Dubai' });
  const destination = getDestinationByLabel(queryState.destination) ?? getDestinationByLabel('Dubai');
  const canonicalQuery = serializeDiscoveryQuery({
    ...queryState,
    destination: ''
  });
  const queryString = canonicalQuery.toString();
  const destinationPath = buildDestinationPath(destination?.slug ?? 'dubai');

  redirect((queryString ? `${destinationPath}?${queryString}` : destinationPath) as Route);
}
