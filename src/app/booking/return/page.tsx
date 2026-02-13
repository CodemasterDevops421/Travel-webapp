import { Suspense } from 'react';
import { BookingReturnClient } from '@/app/booking/return/booking-return-client';

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
