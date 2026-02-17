import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BookingReturnClient } from '@/app/booking/return/booking-return-client';

export const metadata: Metadata = {
  title: 'Payment Return | TravelApp',
  description: 'Finalizing your payment and confirming your TravelApp booking.',
  alternates: {
    canonical: '/booking/return'
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function BookingReturnPage() {
  return (
    <Suspense
      fallback={(
        <main className="mx-auto max-w-2xl px-4 py-12">
          <section className="rounded-2xl border border-border bg-card/85 p-6 shadow-sm">
            <h1 className="text-2xl font-semibold">Payment Return</h1>
            <p className="mt-2 text-sm text-muted-foreground">Loading payment status...</p>
          </section>
        </main>
      )}
    >
      <BookingReturnClient />
    </Suspense>
  );
}
