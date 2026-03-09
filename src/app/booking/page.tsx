import { BookingConsole } from '@/features/booking/components/booking-console';
import type { Metadata } from 'next';
import { normalizeCurrency, normalizeLanguage } from '@/shared/lib/preferences';

export const metadata: Metadata = {
  title: 'Secure Checkout | TravelApp',
  description: 'Securely complete your hotel booking with signed quote integrity and secure payment.',
  alternates: {
    canonical: '/booking'
  },
  openGraph: {
    title: 'Secure Checkout | TravelApp',
    description: 'Securely complete your hotel booking with signed quote integrity and secure payment.',
    url: '/booking',
    type: 'website'
  },
  robots: {
    index: false,
    follow: false
  }
};

type BookingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) ? value[0] : undefined;
}

function pickPositiveInt(params: Record<string, string | string[] | undefined>, key: string): number | undefined {
  const raw = pickParam(params, key);
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  const intValue = Math.floor(parsed);
  return intValue > 0 ? intValue : undefined;
}

function pickRefundableState(
  params: Record<string, string | string[] | undefined>,
  key: string
): 'true' | 'false' | 'unknown' | undefined {
  const raw = pickParam(params, key);
  return raw === 'true' || raw === 'false' || raw === 'unknown' ? raw : undefined;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;
  const amountRaw = pickParam(params, 'amount');
  const parsedAmount = amountRaw ? Number(amountRaw) : undefined;
  const amount = parsedAmount && Number.isFinite(parsedAmount) ? parsedAmount : undefined;
  const preferredLanguage = normalizeLanguage(pickParam(params, 'language'));
  const preferredCurrency = normalizeCurrency(pickParam(params, 'currency'));

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/80 p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Checkout</p>
        <h1 className="mt-2 text-3xl font-semibold">Complete your secure booking</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          We lock your selected rate, securely process your payment, and confirm booking with signed quote integrity.
        </p>
      </section>
      <BookingConsole
        initialValues={{
          hotelId: pickParam(params, 'hotelId'),
          roomId: pickParam(params, 'roomId'),
          offerId: pickParam(params, 'offerId'),
          currency: preferredCurrency,
          adults: pickPositiveInt(params, 'adults'),
          rooms: pickPositiveInt(params, 'rooms'),
          checkIn: pickParam(params, 'checkIn'),
          checkOut: pickParam(params, 'checkOut'),
          cancellationNote: pickParam(params, 'cancellationNote'),
          isRefundable: pickRefundableState(params, 'isRefundable'),
          amount
        }}
        preferredLanguage={preferredLanguage}
        preferredCurrency={preferredCurrency}
      />
    </main>
  );
}
