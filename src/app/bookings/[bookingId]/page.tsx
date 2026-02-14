import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookingById } from '@/server/booking/repository';
import { verifyBookingViewToken } from '@/server/booking-view-token';
import { PreferenceLink } from '@/components/navigation/preference-link';

type BookingConfirmationPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Booking Confirmation | TravelForge',
  description: 'View your confirmed booking details securely.',
  robots: {
    index: false,
    follow: false
  }
};

function pickParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) ? value[0] : undefined;
}

export default async function BookingConfirmationPage({ params, searchParams }: BookingConfirmationPageProps) {
  const { bookingId } = await params;
  const qs = await searchParams;
  const viewToken = pickParam(qs, 'viewToken');
  if (!viewToken || !verifyBookingViewToken({ bookingId, token: viewToken })) {
    notFound();
  }

  const booking = await getBookingById(bookingId);

  if (!booking) {
    notFound();
  }

  const transactionId = typeof booking.metadata?.transactionId === 'string' ? booking.metadata.transactionId : null;
  const prebookId = typeof booking.metadata?.prebookId === 'string' ? booking.metadata.prebookId : null;

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/85 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Booking Confirmed</p>
        <h1 className="mt-2 text-3xl font-bold">Your stay is secured</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use the references below for support, amendments, and operational tracking.</p>
      </section>

      <article className="rounded-2xl border border-border bg-card/85 p-5">
        <p className="text-sm text-muted-foreground">Local Booking ID</p>
        <p className="font-mono text-sm">{booking.id}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-semibold">{booking.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Supplier Booking ID</p>
            <p>{booking.liteapi_booking_id ?? 'Pending'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Transaction ID</p>
            <p className="font-mono text-xs">{transactionId ?? 'Unavailable'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Prebook ID</p>
            <p className="font-mono text-xs">{prebookId ?? 'Unavailable'}</p>
          </div>
        </div>
      </article>

      <PreferenceLink href="/" className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Back to search
      </PreferenceLink>
    </main>
  );
}
