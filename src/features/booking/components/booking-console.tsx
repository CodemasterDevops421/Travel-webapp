'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicEnv } from '@/shared/env.public';
import { normalizeCurrency, normalizeLanguage } from '@/shared/lib/preferences';

const formSchema = z.object({
  hotelId: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  offerId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().trim().length(3),
  adults: z.coerce.number().int().positive(),
  rooms: z.coerce.number().int().positive(),
  checkIn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email()
});

type FormValues = z.infer<typeof formSchema>;

type PrebookResult = {
  prebookId: string;
  transactionId: string;
  clientReference: string;
  secretKey: string;
  quoteId: string | null;
  sessionSignature: string;
  quote: {
    hotelId: string;
    roomId: string;
    baseAmount: number;
    totalAmount: number;
    currency: string;
    signature: string;
  };
};

type BookingConsoleProps = {
  initialValues?: Partial<FormValues>;
  preferredLanguage?: string;
  preferredCurrency?: string;
};

type CheckoutSessionPayload = {
  clientReference: string;
  quoteId: string | null;
  sessionSignature: string;
  quoteSignature: string;
  holder: {
    firstName: string;
    lastName: string;
    email: string;
  };
  guests: Array<{
    occupancyNumber: number;
    firstName: string;
    lastName: string;
  }>;
};

const PAYMENT_SCRIPT_URL = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
const PAYMENT_SCRIPT_ID = 'liteapi-payment-sdk';

function checkoutStorageKey(transactionId: string): string {
  return `booking:checkout:${transactionId}`;
}

function buildPrebookGuests(adults: number, rooms: number): Array<{ adults: number }> {
  const normalizedAdults = Math.max(1, Math.floor(adults));
  const requestedRooms = Math.max(1, Math.floor(rooms));
  const roomCount = Math.min(requestedRooms, normalizedAdults);
  const baseAdultsPerRoom = Math.floor(normalizedAdults / roomCount);
  const remainder = normalizedAdults % roomCount;

  return Array.from({ length: roomCount }, (_, idx) => ({
    adults: baseAdultsPerRoom + (idx < remainder ? 1 : 0)
  }));
}

function saveToStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write failures to avoid blocking checkout launch.
  }
}

function saveCheckoutSession(transactionId: string, payload: CheckoutSessionPayload): void {
  const key = checkoutStorageKey(transactionId);
  const encoded = JSON.stringify(payload);
  saveToStorage(sessionStorage, key, encoded);
  saveToStorage(localStorage, key, encoded);
}

async function ensurePaymentScriptLoaded(): Promise<void> {
  if (window.LiteAPIPayment) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existingById = document.getElementById(PAYMENT_SCRIPT_ID) as HTMLScriptElement | null;
    const existingBySrc = document.querySelector<HTMLScriptElement>(`script[src="${PAYMENT_SCRIPT_URL}"]`);
    const existing = existingById ?? existingBySrc;
    if (existing) {
      if (window.LiteAPIPayment) {
        resolve();
        return;
      }
      if (existing.dataset.loadState === 'error') {
        existing.remove();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load payment SDK')), { once: true });
        return;
      }
    }

    const script = document.createElement('script');
    script.id = PAYMENT_SCRIPT_ID;
    script.src = PAYMENT_SCRIPT_URL;
    script.async = true;
    script.dataset.loadState = 'loading';
    script.onload = () => {
      script.dataset.loadState = 'loaded';
      resolve();
    };
    script.onerror = () => {
      script.dataset.loadState = 'error';
      reject(new Error('Failed to load payment SDK'));
    };
    document.head.appendChild(script);
  });
}

export function BookingConsole({ initialValues, preferredLanguage, preferredCurrency }: BookingConsoleProps) {
  const [prebook, setPrebook] = useState<PrebookResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  function errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed';
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotelId: initialValues?.hotelId ?? '',
      roomId: initialValues?.roomId ?? '',
      offerId: initialValues?.offerId ?? '',
      amount: initialValues?.amount ?? 100,
      currency: initialValues?.currency ?? 'USD',
      adults: initialValues?.adults ?? 2,
      rooms: initialValues?.rooms ?? 1,
      checkIn: initialValues?.checkIn ?? '',
      checkOut: initialValues?.checkOut ?? '',
      firstName: initialValues?.firstName ?? '',
      lastName: initialValues?.lastName ?? '',
      email: initialValues?.email ?? ''
    }
  });
  const liveValues = form.watch();
  const hasSelectedRate = Boolean(
    liveValues.hotelId && liveValues.roomId && liveValues.offerId && liveValues.checkIn && liveValues.checkOut
  );
  const baseAmount = Number(liveValues.amount || 0);
  const currency = (liveValues.currency || 'USD').toUpperCase();
  const totalAmount = prebook?.quote.totalAmount ?? baseAmount;
  const markupAmount = Math.max(totalAmount - baseAmount, 0);
  const nights = (() => {
    if (!liveValues.checkIn || !liveValues.checkOut) return null;
    const start = new Date(liveValues.checkIn);
    const end = new Date(liveValues.checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  })();

  const prebookMutation = useMutation({
    mutationFn: async (values: FormValues): Promise<PrebookResult> => {
      const response = await fetch('/api/booking/prebook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hotelId: values.hotelId,
          roomId: values.roomId,
          offerId: values.offerId,
          checkIn: values.checkIn,
          checkOut: values.checkOut,
          guests: buildPrebookGuests(values.adults, values.rooms)
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? 'Prebook failed');
      }
      return json as PrebookResult;
    },
    onSuccess: (result: PrebookResult) => {
      setPrebook(result);
    }
  });

  async function startPayment(values: FormValues, prebookPayload?: PrebookResult): Promise<void> {
    const activePrebook = prebookPayload ?? prebook;
    if (!activePrebook) return;
    setPaymentError(null);

    const guestDistribution = buildPrebookGuests(values.adults, values.rooms);
    const guestsPayload = guestDistribution.map((guest, index) => ({
      occupancyNumber: guest.adults,
      firstName: index === 0 ? values.firstName : '',
      lastName: index === 0 ? values.lastName : ''
    }));

    const checkoutSession: CheckoutSessionPayload = {
      clientReference: activePrebook.clientReference,
      quoteId: activePrebook.quoteId,
      sessionSignature: activePrebook.sessionSignature,
      quoteSignature: activePrebook.quote.signature,
      holder: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email
      },
      guests: guestsPayload
    };

    saveCheckoutSession(activePrebook.transactionId, checkoutSession);
    await ensurePaymentScriptLoaded();
    if (!window.LiteAPIPayment) {
      throw new Error('Secure payment widget unavailable');
    }
    if (!publicEnv.NEXT_PUBLIC_LITEAPI_ENV) {
      throw new Error('Payment environment is not configured');
    }

    const returnParams = new URLSearchParams({
      prebookId: activePrebook.prebookId,
      transactionId: activePrebook.transactionId
    });
    const resolvedLanguage = normalizeLanguage(preferredLanguage) ?? normalizeLanguage(window.localStorage.getItem('travelapp:language'));
    const resolvedCurrency = normalizeCurrency(values.currency) ?? normalizeCurrency(preferredCurrency);
    if (resolvedLanguage) {
      returnParams.set('language', resolvedLanguage);
    }
    if (resolvedCurrency) {
      returnParams.set('currency', resolvedCurrency);
    }
    const returnUrl = `${window.location.origin}/booking/return?${returnParams.toString()}`;
    const liteAPIPayment = new window.LiteAPIPayment({
      publicKey: publicEnv.NEXT_PUBLIC_LITEAPI_ENV,
      secretKey: activePrebook.secretKey,
      returnUrl,
      targetElement: '#liteapi-payment-target',
      appearance: { theme: 'flat' },
      options: { business: { name: 'TravelApp' } }
    });

    liteAPIPayment.handlePayment();
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!prebook) {
      const createdPrebook = await prebookMutation.mutateAsync(values);
      await startPayment(values, createdPrebook).catch((error: unknown) => {
        setPaymentError(errorMessage(error));
      });
      return;
    }
    await startPayment(values).catch((error: unknown) => {
      setPaymentError(errorMessage(error));
    });
  });

  return (
    <section className="space-y-4 rounded-3xl border border-border/80 bg-card/90 p-5 shadow-md md:p-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Secure Checkout</p>
        <h1 className="text-3xl font-semibold">Finalize your stay in 3 quick steps</h1>
        <p className="text-sm text-muted-foreground">1) Validate quote 2) Complete payment in SDK 3) Receive confirmed booking record.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-background/60 p-3 text-xs md:grid-cols-3">
        <p className="rounded-xl border border-border px-3 py-2">Step 1: Prebook + signed quote</p>
        <p className={`rounded-xl border px-3 py-2 ${prebook ? 'border-primary/40 bg-primary/10' : 'border-border'}`}>Step 2: Payment widget</p>
        <p className="rounded-xl border border-border px-3 py-2">Step 3: Server-side confirmation</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr,0.9fr]">
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          {hasSelectedRate ? (
            <div className="md:col-span-2 rounded-2xl border border-border bg-background/70 p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected stay</p>
              <p className="mt-1 font-medium">
                Check-in {liveValues.checkIn} · Check-out {liveValues.checkOut}
              </p>
              <p className="mt-1 text-muted-foreground">
                Rate token confirmed. Technical supplier IDs are hidden for cleaner checkout.
              </p>
            </div>
          ) : (
            <>
              <Input aria-label="Hotel ID" placeholder="Hotel ID" {...form.register('hotelId')} />
              <Input aria-label="Room ID" placeholder="Room ID" {...form.register('roomId')} />
              <Input aria-label="Offer ID" placeholder="Offer ID" {...form.register('offerId')} />
              <Input aria-label="Amount" placeholder="Amount" type="number" step="1" {...form.register('amount')} />
              <Input aria-label="Currency" placeholder="Currency (USD)" {...form.register('currency')} />
              <Input aria-label="Adults" placeholder="Adults" type="number" min={1} step="1" {...form.register('adults')} />
              <Input aria-label="Rooms" placeholder="Rooms" type="number" min={1} step="1" {...form.register('rooms')} />
              <Input aria-label="Check-in date" placeholder="Check-in YYYY-MM-DD" {...form.register('checkIn')} />
              <Input aria-label="Check-out date" placeholder="Check-out YYYY-MM-DD" {...form.register('checkOut')} />
            </>
          )}

          {hasSelectedRate && (
            <>
              <input type="hidden" {...form.register('hotelId')} />
              <input type="hidden" {...form.register('roomId')} />
              <input type="hidden" {...form.register('offerId')} />
              <input type="hidden" {...form.register('amount')} />
              <input type="hidden" {...form.register('currency')} />
              <input type="hidden" {...form.register('adults')} />
              <input type="hidden" {...form.register('rooms')} />
              <input type="hidden" {...form.register('checkIn')} />
              <input type="hidden" {...form.register('checkOut')} />
            </>
          )}

          <Input aria-label="First name" placeholder="First name" {...form.register('firstName')} />
          <Input aria-label="Last name" placeholder="Last name" {...form.register('lastName')} />
          <Input aria-label="Email" placeholder="Email" type="email" {...form.register('email')} />

          <div className="md:col-span-2">
            <Button type="submit" size="lg" disabled={prebookMutation.isPending}>
              {prebookMutation.isPending ? 'Securing your quote...' : !prebook ? 'Validate and launch payment' : 'Launch secure payment'}
            </Button>
          </div>
        </form>

        <aside className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Booking Summary</p>
          <p className="mt-2 text-sm text-muted-foreground">Live checkout estimate before payment.</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nights</span>
              <span className="font-semibold">{nights ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Base rate</span>
              <span>{currency} {baseAmount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Service/markup</span>
              <span>{currency} {markupAmount}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between text-base font-semibold text-primary">
              <span>Total payable</span>
              <span>{currency} {totalAmount}</span>
            </div>
            <p className="rounded-xl border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground">
              Cancellation terms and taxes are provided by supplier and shown before you confirm payment.
            </p>
          </div>
        </aside>
      </div>

      {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
        <p className="text-sm text-red-600">Please correct invalid fields.</p>
      )}

      {prebook && (
        <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
          <p className="font-semibold">Prebook created successfully</p>
          <p className="mt-1 text-muted-foreground">Prebook ID: {prebook.prebookId}</p>
          <p className="text-muted-foreground">Transaction ID: {prebook.transactionId}</p>
          <p className="mt-2 font-semibold text-primary">Quote total: {prebook.quote.currency} {prebook.quote.totalAmount}</p>
          <p className="text-xs text-muted-foreground">Quote signature: {prebook.quote.signature.slice(0, 12)}...</p>
        </div>
      )}

      <section className={`rounded-2xl border border-border bg-background p-4 ${prebook ? '' : 'hidden'}`}>
        <h2 className="mb-2 text-sm font-semibold">Payment</h2>
        <p className="mb-2 text-xs text-muted-foreground">Sandbox test card: `4242 4242 4242 4242` with any valid future date/CVV.</p>
        <div id="liteapi-payment-target" />
      </section>

      {prebookMutation.error && <p className="text-sm text-red-600">{errorMessage(prebookMutation.error)}</p>}
      {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
    </section>
  );
}
