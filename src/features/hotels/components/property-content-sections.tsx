'use client';

import type { HotelDetails } from '@/server/liteapi';
import { HotelDetailSections } from '@/features/hotels/components/hotel-detail-sections';
import type { HotelRateWithCancellationContext } from '@/features/hotels/hooks/use-hotel-rates';

type CancellationCopy = {
  status: string;
  detail: string;
};

type PropertyContentSectionsProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPartialDetail: boolean;
  hotel: HotelDetails | null;
  mapUrl: string | null;
  amenities: string[];
  policies: HotelDetails['policies'] | undefined;
  locationContext: HotelDetails['locationContext'] | undefined;
  rates: HotelRateWithCancellationContext[];
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  selectedRate: HotelRateWithCancellationContext | null;
  recommendedRateKey: string | null;
  setSelectedRateKey: (key: string) => void;
  onChooseRate: (rate: HotelRateWithCancellationContext) => void;
  buildRateKey: (rate: Pick<HotelRateWithCancellationContext, 'offerId' | 'roomId'>) => string;
  getCancellationCopy: (rate: HotelRateWithCancellationContext) => CancellationCopy;
  formatMoney: (currency: string, amount: number | null, compact?: boolean) => string;
  reviewBreakdown: NonNullable<HotelDetails['reviewBreakdown']>;
  reviews: NonNullable<HotelDetails['reviews']>;
  prosAndCons: HotelDetails['prosAndCons'] | undefined;
  question: string;
  setQuestion: (value: string) => void;
  askLoading: boolean;
  askAnswer: string;
  askHotelAI: (question?: string) => Promise<void>;
};

export function PropertyContentSections(props: PropertyContentSectionsProps) {
  return <HotelDetailSections {...props} />;
}
