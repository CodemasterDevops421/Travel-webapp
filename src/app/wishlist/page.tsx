import type { Metadata } from 'next';
import { WishlistPage } from '@/features/wishlist/components/wishlist-page';

export const metadata: Metadata = {
  title: 'Saved Stays | Hostel Stays',
  description: 'Review and manage your saved hotels and shortlist premium stays.',
  alternates: {
    canonical: '/wishlist'
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function SavedStaysPage() {
  return <WishlistPage />;
}
