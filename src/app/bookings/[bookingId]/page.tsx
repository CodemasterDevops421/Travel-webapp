import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookingById } from '@/server/booking/repository';
import { verifyBookingViewToken } from '@/server/booking-view-token';
import { PreferenceLink } from '@/components/navigation/preference-link';
import { BookingCancelAction } from '@/features/booking/components/booking-cancel-action';
import { BookingSupportHandoffAction } from '@/features/booking/components/booking-support-handoff-action';

type BookingConfirmationPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ItineraryMetadata = {
  hotelId: string;
  roomId: string;
  baseAmount: number;
  totalAmount: number;
  currency: string;
  quoteSignature: string;
};

type HolderMetadata = {
  firstName: string;
  lastName: string;
  email: string;
};

type GuestMetadata = {
  occupancyNumber: number;
  firstName: string;
  lastName: string;
};

export const metadata: Metadata = {
  title: 'Booking Confirmation | Hostel Stays',
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

function pickItinerary(metadata: Record<string, unknown> | null): ItineraryMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const itinerary = metadata.itinerary as Partial<ItineraryMetadata> | undefined;
  if (!itinerary || typeof itinerary !== 'object') return null;
  if (typeof itinerary.hotelId !== 'string') return null;
  if (typeof itinerary.roomId !== 'string') return null;
  if (typeof itinerary.baseAmount !== 'number') return null;
  if (typeof itinerary.totalAmount !== 'number') return null;
  if (typeof itinerary.currency !== 'string') return null;
  if (typeof itinerary.quoteSignature !== 'string') return null;
  return itinerary as ItineraryMetadata;
}

function pickHolder(metadata: Record<string, unknown> | null): HolderMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const holder = metadata.holder as Partial<HolderMetadata> | undefined;
  if (!holder || typeof holder !== 'object') return null;
  if (typeof holder.firstName !== 'string') return null;
  if (typeof holder.lastName !== 'string') return null;
  if (typeof holder.email !== 'string') return null;
  return holder as HolderMetadata;
}

function pickGuests(metadata: Record<string, unknown> | null): GuestMetadata[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const guests = metadata.guests as Array<Partial<GuestMetadata>> | undefined;
  if (!Array.isArray(guests)) return [];
  return guests
    .filter((guest) => typeof guest?.occupancyNumber === 'number' && typeof guest?.firstName === 'string' && typeof guest?.lastName === 'string')
    .map((guest) => guest as GuestMetadata);
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
  const itinerary = pickItinerary(booking.metadata);
  const holder = pickHolder(booking.metadata);
  const guests = pickGuests(booking.metadata);
  const totalGuests = guests.reduce((count, guest) => count + guest.occupancyNumber, 0);

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/85 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Booking Confirmed</p>
        <h1 className="mt-2 text-3xl font-bold">Your stay is secured</h1>
        <p className="mt-2 text-sm text-muted-foreground">Keep this page for itinerary details, payment references, and support requests.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <article className="rounded-2xl border border-border bg-card/85 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Itinerary</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Hotel ID</p>
              <p className="font-medium">{itinerary?.hotelId ?? 'Unavailable'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Room ID</p>
              <p className="font-medium">{itinerary?.roomId ?? 'Unavailable'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{booking.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Guests</p>
              <p className="font-medium">{totalGuests > 0 ? totalGuests : 'Unavailable'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background/50 p-4">
            <p className="text-sm text-muted-foreground">Payment summary</p>
            <p className="mt-1 text-lg font-semibold">
              {itinerary?.currency ?? 'USD'} {itinerary?.totalAmount ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">Base: {itinerary?.currency ?? 'USD'} {itinerary?.baseAmount ?? '—'}</p>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background/50 p-4">
            <p className="text-sm font-semibold">Primary guest</p>
            <p className="mt-1 text-sm text-muted-foreground">{holder ? `${holder.firstName} ${holder.lastName}` : 'Unavailable'}</p>
            <p className="text-sm text-muted-foreground">{holder?.email ?? 'Unavailable'}</p>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-border bg-card/85 p-5">
            <p className="text-sm text-muted-foreground">Booking reference</p>
            <p className="font-mono text-sm">{booking.id}</p>
            <p className="mt-3 text-sm text-muted-foreground">Supplier booking ID</p>
            <p className="font-medium">{booking.liteapi_booking_id ?? 'Pending'}</p>
            <p className="mt-3 text-sm text-muted-foreground">Transaction ID</p>
            <p className="font-mono text-xs">{transactionId ?? 'Unavailable'}</p>
            <p className="mt-3 text-sm text-muted-foreground">Prebook ID</p>
            <p className="font-mono text-xs">{prebookId ?? 'Unavailable'}</p>
          </article>

          <article className="rounded-2xl border border-border bg-card/85 p-5">
            <p className="text-sm font-semibold">Support</p>
            <p className="mt-2 text-sm text-muted-foreground">Need to cancel? Use the in-app action below. For other changes, include booking, transaction, and prebook references.</p>
            <p className="mt-2 text-sm text-muted-foreground">Email: support@hostelstays.com</p>
            <BookingCancelAction bookingId={booking.id} viewToken={viewToken} bookingStatus={booking.status} />
            <BookingSupportHandoffAction bookingId={booking.id} viewToken={viewToken} />
          </article>
        </aside>
      </section>

      <PreferenceLink href="/" className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Back to search
      </PreferenceLink>
    </main>
  );
}
