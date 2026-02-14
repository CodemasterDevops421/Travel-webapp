import type { Metadata } from 'next';
import { getHotelDetails, getHotelRates } from '@/server/liteapi';
import { HotelDetailExperience } from '@/features/hotels/components/hotel-detail-experience';
import { DEFAULT_CURRENCY, normalizeCurrency } from '@/shared/lib/preferences';

type PageProps = {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{
    checkin?: string;
    checkout?: string;
    adults?: string;
    rooms?: string;
    currency?: string;
  }>;
};

export async function generateMetadata({ params }: Pick<PageProps, 'params'>): Promise<Metadata> {
  const { hotelId } = await params;
  return {
    title: `Hotel Details | ${hotelId} | TravelForge`,
    description: `Compare rates, reviews, and full stay details for hotel ${hotelId}.`,
    openGraph: {
      title: `Hotel Details | ${hotelId} | TravelForge`,
      description: `Compare rates, reviews, and full stay details for hotel ${hotelId}.`,
      url: `/hotels/${hotelId}`,
      type: 'website'
    },
    alternates: {
      canonical: `/hotels/${hotelId}`
    }
  };
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

export default async function HotelRatesPage({ params, searchParams }: PageProps) {
  const { hotelId } = await params;
  const qs = await searchParams;
  const dates = defaultDates();
  const checkin = qs.checkin ?? dates.checkin;
  const checkout = qs.checkout ?? dates.checkout;
  const adults = Math.max(1, Number(qs.adults ?? '2') || 2);
  const rooms = Math.max(1, Number(qs.rooms ?? '1') || 1);
  const currency = normalizeCurrency(qs.currency) ?? DEFAULT_CURRENCY;

  const [hotel, rates] = await Promise.all([
    getHotelDetails(hotelId),
    getHotelRates({
      hotelId,
      checkin,
      checkout,
      adults,
      currency
    })
  ]);

  const lowestRate = rates.reduce<number | null>((min, rate) => (min === null || rate.amount < min ? rate.amount : min), null);
  const jsonLd = hotel
    ? {
        '@context': 'https://schema.org',
        '@type': 'Hotel',
        name: hotel.name,
        address: hotel.address ?? `${hotel.city}${hotel.countryCode ? `, ${hotel.countryCode}` : ''}`,
        image: hotel.photos?.length ? hotel.photos : hotel.mainPhoto ? [hotel.mainPhoto] : undefined,
        starRating: hotel.starRating
          ? {
              '@type': 'Rating',
              ratingValue: hotel.starRating
            }
          : undefined,
        aggregateRating:
          hotel.reviewScore && hotel.reviewCount
            ? {
                '@type': 'AggregateRating',
                ratingValue: hotel.reviewScore,
                reviewCount: hotel.reviewCount
              }
            : undefined,
        offers:
          lowestRate !== null
            ? {
                '@type': 'Offer',
                price: lowestRate,
                priceCurrency: rates[0]?.currency ?? 'USD',
                availability: 'https://schema.org/InStock',
                validFrom: new Date().toISOString()
              }
            : undefined
      }
    : null;

  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
      <HotelDetailExperience hotelId={hotelId} checkin={checkin} checkout={checkout} adults={adults} rooms={rooms} hotel={hotel} rates={rates} />
    </>
  );
}
