import { BookingConsole } from '@/features/booking/components/booking-console';

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

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;
  const amountRaw = pickParam(params, 'amount');
  const parsedAmount = amountRaw ? Number(amountRaw) : undefined;
  const amount = parsedAmount && Number.isFinite(parsedAmount) ? parsedAmount : undefined;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/80 p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Checkout</p>
        <h1 className="mt-2 text-3xl font-semibold">Complete your secure booking</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          We lock your selected rate, collect payment in LiteAPI secure widget, and confirm booking with signed quote integrity.
        </p>
      </section>
      <BookingConsole
        initialValues={{
          hotelId: pickParam(params, 'hotelId'),
          roomId: pickParam(params, 'roomId'),
          offerId: pickParam(params, 'offerId'),
          currency: pickParam(params, 'currency')?.toUpperCase(),
          checkIn: pickParam(params, 'checkIn'),
          checkOut: pickParam(params, 'checkOut'),
          amount
        }}
      />
    </main>
  );
}
