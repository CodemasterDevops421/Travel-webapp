import type { Metadata } from 'next';
import { SearchResultsPage } from '@/features/search/components/search-results-page';

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

function pickParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  if (typeof value === 'string') return value;
  return Array.isArray(value) ? value[0] : undefined;
}

function defaultDates() {
  const checkinDate = new Date();
  checkinDate.setDate(checkinDate.getDate() + 14);
  const checkoutDate = new Date(checkinDate);
  checkoutDate.setDate(checkoutDate.getDate() + 2);
  return {
    checkin: checkinDate.toISOString().slice(0, 10),
    checkout: checkoutDate.toISOString().slice(0, 10)
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const defaults = defaultDates();
  const query = pickParam(params, 'q') ?? '';
  const checkin = pickParam(params, 'checkin') ?? defaults.checkin;
  const checkout = pickParam(params, 'checkout') ?? defaults.checkout;
  const adults = Number(pickParam(params, 'adults') ?? '2') || 2;
  const rooms = Number(pickParam(params, 'rooms') ?? '1') || 1;
  const currency = (pickParam(params, 'currency') ?? 'USD').toUpperCase();

  return (
    <SearchResultsPage
      query={query}
      checkin={checkin}
      checkout={checkout}
      adults={adults}
      rooms={rooms}
      currency={currency}
    />
  );
}
