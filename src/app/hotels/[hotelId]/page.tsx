import Link from 'next/link';
import { getHotelDetails, getHotelRates } from '@/server/liteapi';

type PageProps = {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{
    checkin?: string;
    checkout?: string;
    adults?: string;
  }>;
};

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
  const adults = Number(qs.adults ?? '2') || 2;

  const [hotel, rates] = await Promise.all([
    getHotelDetails(hotelId),
    getHotelRates({
      hotelId,
      checkin,
      checkout,
      adults
    })
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="rounded-3xl border border-border/80 bg-card/75 p-5 shadow-sm md:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Hotel Detail + Rates</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">{hotel?.name ?? 'Hotel'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hotel?.city ?? 'Unknown city'}
          {hotel?.countryCode ? `, ${hotel.countryCode}` : ''}
          {hotel?.starRating ? ` · ${hotel.starRating}★` : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border bg-background px-3 py-1">Total price first</span>
          <span className="rounded-full border border-border bg-background px-3 py-1">Clear cancellation policy</span>
          <span className="rounded-full border border-border bg-background px-3 py-1">Secure payment SDK</span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {hotel?.mainPhoto ? (
          <article className="relative overflow-hidden rounded-3xl border border-border/70 md:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hotel.mainPhoto} alt={hotel.name} className="h-72 w-full object-cover shadow-md md:h-[420px]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/80">Signature Property</p>
              <p className="mt-1 text-lg font-semibold">{hotel?.name}</p>
            </div>
          </article>
        ) : (
          <article className="flex h-72 items-center justify-center rounded-3xl border border-border bg-card/70 md:col-span-2 md:h-[420px]">
            <p className="text-sm text-muted-foreground">Image unavailable</p>
          </article>
        )}

        <aside className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stay Highlights</p>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="rounded-xl border border-border bg-background/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{hotel?.city ?? 'Unknown city'}{hotel?.countryCode ? `, ${hotel.countryCode}` : ''}</p>
            </li>
            <li className="rounded-xl border border-border bg-background/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-medium">{hotel?.starRating ? `${hotel.starRating} Star` : 'Premium Selection'}</p>
            </li>
            <li className="rounded-xl border border-border bg-background/70 px-3 py-2">
              <p className="text-xs text-muted-foreground">Trust Signals</p>
              <p className="font-medium">Transparent total pricing</p>
              <p className="font-medium">Clear cancellation policy</p>
            </li>
          </ul>
        </aside>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Available rates</h2>
        <p className="text-sm text-muted-foreground">Choose the best room-rate combination with full policy and amount visibility.</p>
        {rates.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm">No rates found for selected dates.</p>
        ) : (
          <div className="space-y-3">
            {rates.map((rate, idx) => {
              const bookingQuery = new URLSearchParams({
                hotelId,
                roomId: rate.roomId,
                offerId: rate.offerId,
                amount: String(rate.amount),
                currency: rate.currency,
                checkIn: checkin,
                checkOut: checkout
              });

              return (
                <article
                  key={`${rate.offerId}-${rate.roomId}`}
                  className="animate-soft-rise rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{rate.roomName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {rate.boardName} · {rate.refundableTag}
                        {rate.cancelTime ? ` · Cancel until ${rate.cancelTime}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {rate.currency} {rate.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">Includes taxes/fees provided by supplier.</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Rate ID: {rate.offerId}</p>
                    <Link
                      href={`/booking?${bookingQuery.toString()}`}
                      className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Select and continue
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
