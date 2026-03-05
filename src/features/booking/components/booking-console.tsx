'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
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
  paymentToken: string;
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
  prebookId: string;
  state: 'payment_initiated' | 'awaiting_confirmation';
  formValues: FormValues;
  updatedAt: string;
  holder: {
    firstName: string;
    lastName: string;
    email: string;
  };
  quote: {
    hotelId: string;
    roomId: string;
    baseAmount: number;
    totalAmount: number;
    currency: string;
    signature: string;
  };
  guests: Array<{
    occupancyNumber: number;
    firstName: string;
    lastName: string;
  }>;
};

type CheckoutDraft = Pick<
  FormValues,
  'hotelId' | 'roomId' | 'offerId' | 'amount' | 'currency' | 'adults' | 'rooms' | 'checkIn' | 'checkOut'
>;

const PAYMENT_SCRIPT_URL = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
const PAYMENT_SCRIPT_ID = 'liteapi-payment-sdk';
const CHECKOUT_DRAFT_STORAGE_KEY = 'booking:checkout:draft';

type CheckoutStep = 'guest_details' | 'payment' | 'confirmation';

function checkoutStorageKey(transactionId: string): string {
  return `booking:checkout:${transactionId}`;
}

function parseStoredCheckoutPayload(raw: string): CheckoutSessionPayload | null {
  try {
    const parsed = JSON.parse(raw) as CheckoutSessionPayload;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (typeof parsed.clientReference !== 'string') {
      return null;
    }
    if (typeof parsed.sessionSignature !== 'string') {
      return null;
    }
    if (typeof parsed.quoteSignature !== 'string') {
      return null;
    }
    if (typeof parsed.prebookId !== 'string') {
      return null;
    }
    if (parsed.state !== 'payment_initiated' && parsed.state !== 'awaiting_confirmation') {
      return null;
    }
    if (!parsed.formValues || typeof parsed.formValues !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function loadLatestCheckoutSession(): CheckoutSessionPayload | null {
  const pickLatestFromStorage = (storage: Storage): CheckoutSessionPayload | null => {
    let latest: CheckoutSessionPayload | null = null;
    for (let idx = 0; idx < storage.length; idx += 1) {
      const key = storage.key(idx);
      if (!key || !key.startsWith('booking:checkout:')) {
        continue;
      }
      const raw = storage.getItem(key);
      if (!raw) {
        continue;
      }
      const parsed = parseStoredCheckoutPayload(raw);
      if (!parsed) {
        continue;
      }
      if (!latest) {
        latest = parsed;
        continue;
      }
      const latestTime = Date.parse(latest.updatedAt);
      const parsedTime = Date.parse(parsed.updatedAt);
      if (Number.isNaN(latestTime) || parsedTime > latestTime) {
        latest = parsed;
      }
    }
    return latest;
  };

  const sessionRecord = pickLatestFromStorage(sessionStorage);
  if (sessionRecord) {
    return sessionRecord;
  }
  return pickLatestFromStorage(localStorage);
}

function loadCheckoutDraft(): Partial<FormValues> | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistCheckoutDraft(values: FormValues): void {
  const draft: CheckoutDraft = {
    hotelId: values.hotelId,
    roomId: values.roomId,
    offerId: values.offerId,
    amount: values.amount,
    currency: values.currency,
    adults: values.adults,
    rooms: values.rooms,
    checkIn: values.checkIn,
    checkOut: values.checkOut
  };
  saveToStorage(localStorage, CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
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
  const encodedSession = JSON.stringify(payload);
  saveToStorage(sessionStorage, key, encodedSession);

  // Local storage keeps a minimally redacted recovery record.
  const localPayload: CheckoutSessionPayload = {
    ...payload,
    guests: payload.guests,
    formValues: {
      ...payload.formValues,
      firstName: '',
      lastName: '',
      email: ''
    }
  };
  saveToStorage(localStorage, key, JSON.stringify(localPayload));
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
  const isDevEnvironment = process.env.NODE_ENV !== 'production';
  const [prebook, setPrebook] = useState<PrebookResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('guest_details');

  const defaultValues: FormValues = {
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
  };

  function errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Request failed';
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });
  const liveValues = form.watch();

  useEffect(() => {
    const draft = loadCheckoutDraft();
    if (draft) {
      form.reset({
        ...form.getValues(),
        ...draft,
        hotelId: initialValues?.hotelId ?? draft.hotelId ?? '',
        roomId: initialValues?.roomId ?? draft.roomId ?? '',
        offerId: initialValues?.offerId ?? draft.offerId ?? '',
        checkIn: initialValues?.checkIn ?? draft.checkIn ?? '',
        checkOut: initialValues?.checkOut ?? draft.checkOut ?? ''
      });
    }

    const latestSession = loadLatestCheckoutSession();
    if (!latestSession || latestSession.state !== 'awaiting_confirmation') {
      return;
    }
    form.reset({
      ...form.getValues(),
      ...latestSession.formValues
    });
    setCheckoutStep('confirmation');
  }, [form, initialValues?.checkIn, initialValues?.checkOut, initialValues?.hotelId, initialValues?.offerId, initialValues?.roomId]);

  const prebookFingerprint = useMemo(
    () => [
      liveValues.hotelId,
      liveValues.roomId,
      liveValues.offerId,
      liveValues.checkIn,
      liveValues.checkOut,
      liveValues.adults,
      liveValues.rooms
    ].join('|'),
    [
      liveValues.adults,
      liveValues.checkIn,
      liveValues.checkOut,
      liveValues.hotelId,
      liveValues.offerId,
      liveValues.roomId,
      liveValues.rooms
    ]
  );

  useEffect(() => {
    if (!prebook) {
      return;
    }
    if (paymentError) {
      setPaymentError(null);
    }
    setPrebook(null);
  }, [paymentError, prebook, prebookFingerprint]);

  const hasSelectedRate = Boolean(
    liveValues.hotelId && liveValues.roomId && liveValues.offerId && liveValues.checkIn && liveValues.checkOut
  );
  const hasGuestDetails = Boolean(liveValues.firstName && liveValues.lastName && liveValues.email);

  useEffect(() => {
    persistCheckoutDraft(liveValues);
  }, [liveValues]);

  useEffect(() => {
    if (checkoutStep === 'confirmation') {
      return;
    }
    if (prebook) {
      setCheckoutStep('payment');
      return;
    }
    if (hasSelectedRate && hasGuestDetails) {
      setCheckoutStep('guest_details');
    }
  }, [checkoutStep, hasGuestDetails, hasSelectedRate, prebook]);

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
      setCheckoutStep('payment');
    }
  });

  async function startPayment(values: FormValues, prebookPayload?: PrebookResult): Promise<void> {
    const activePrebook = prebookPayload ?? prebook;
    if (!activePrebook) return;
    setPaymentError(null);

    const guestDistribution = buildPrebookGuests(values.adults, values.rooms);
    const guestsPayload = guestDistribution.map((_, index) => ({
      occupancyNumber: index + 1,
      firstName: values.firstName,
      lastName: values.lastName
    }));

    const checkoutSession: CheckoutSessionPayload = {
      clientReference: activePrebook.clientReference,
      quoteId: activePrebook.quoteId,
      sessionSignature: activePrebook.sessionSignature,
      quoteSignature: activePrebook.quote.signature,
      prebookId: activePrebook.prebookId,
      state: 'awaiting_confirmation',
      formValues: values,
      updatedAt: new Date().toISOString(),
      holder: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email
      },
      quote: activePrebook.quote,
      guests: guestsPayload
    };

    saveCheckoutSession(activePrebook.transactionId, checkoutSession);
    setCheckoutStep('confirmation');
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
    const resolvedLanguage = normalizeLanguage(preferredLanguage) ?? normalizeLanguage(window.localStorage.getItem('hostelstays:language'));
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
      secretKey: activePrebook.paymentToken,
      returnUrl,
      targetElement: '#liteapi-payment-target',
      appearance: { theme: 'flat' },
      options: { business: { name: 'Hostel Stays' } }
    });

    liteAPIPayment.handlePayment();
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!prebook) {
      const createdPrebook = await prebookMutation.mutateAsync(values);
      await startPayment(values, createdPrebook).catch((error: unknown) => {
        setCheckoutStep('payment');
        setPaymentError(errorMessage(error));
      });
      return;
    }
    await startPayment(values).catch((error: unknown) => {
      setCheckoutStep('payment');
      setPaymentError(errorMessage(error));
    });
  });

  return (
    <section className="space-y-8 p-6 md:p-8">
      <div className="space-y-4 border-b border-border pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Secure Checkout</p>
        <h1 className="font-heading text-4xl font-light">Finalize your stay</h1>
        <p className="text-sm text-muted-foreground">Complete your booking in three simple steps.</p>
      </div>

      <div className="grid gap-0 border border-border bg-background text-sm font-medium md:grid-cols-3">
        <div className={`flex items-center gap-3 border-b border-border p-4 md:border-b-0 md:border-r ${checkoutStep === 'guest_details' ? 'bg-primary/5' : ''}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">1</span>
          <span>Your details {hasGuestDetails ? 'done' : ''}</span>
        </div>
        <div className={`flex items-center gap-3 border-b border-border p-4 md:border-b-0 md:border-r ${checkoutStep === 'payment' ? 'bg-primary/5' : ''}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">2</span>
          <span>Payment {prebook ? 'ready' : ''}</span>
        </div>
        <div className={`flex items-center gap-3 p-4 ${checkoutStep === 'confirmation' ? 'bg-primary/5' : ''}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">3</span>
          <span>Confirmation {checkoutStep === 'confirmation' ? 'awaiting' : ''}</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
        <form className="space-y-6" onSubmit={onSubmit}>
          {hasSelectedRate ? (
            <div className="border border-border bg-muted/30 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-foreground">Selected stay</p>
              <div className="mt-4 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-semibold text-lg">{liveValues.checkIn}</p>
                </div>
                <div className="hidden sm:block w-px bg-border"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-semibold text-lg">{liveValues.checkOut}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-base font-semibold text-amber-800 dark:text-amber-300">No room selected</p>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                Please select a room from a hotel page to begin checkout.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Browse hotels
              </Link>
            </div>
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

          <div className="space-y-4 pt-4">
            <h2 className="font-heading text-2xl font-light">Guest Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input className="rounded-none border-border bg-background" aria-label="First name" placeholder="First name" {...form.register('firstName')} />
              <Input className="rounded-none border-border bg-background" aria-label="Last name" placeholder="Last name" {...form.register('lastName')} />
            </div>
            <Input className="rounded-none border-border bg-background" aria-label="Email" placeholder="Email" type="email" {...form.register('email')} />
          </div>

          <div className="pt-6">
            <Button className="rounded-none shadow-none w-full md:w-auto px-8" type="submit" size="lg" disabled={prebookMutation.isPending}>
              {prebookMutation.isPending ? 'Securing your quote...' : !prebook ? 'Validate and launch payment' : 'Launch secure payment'}
            </Button>
          </div>
        </form>

        <aside className="order-last lg:order-none lg:sticky lg:top-24 lg:self-start border border-border bg-card p-6 shadow-editorial-md">
          <p className="font-heading text-2xl font-light mb-6">Price Summary</p>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{nights ?? '—'} nights</span>
              <span className="font-semibold text-foreground">{currency} {baseAmount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Taxes & fees</span>
              <span className="font-semibold text-foreground">{currency} {markupAmount}</span>
            </div>
            <div className="my-4 h-px bg-border" />
            <div className="flex items-end justify-between">
              <span className="text-base font-bold text-foreground">Total</span>
              <div className="text-right">
                <span className="text-3xl font-bold text-foreground">{currency} {totalAmount}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Prices are inclusive of all taxes and fees. No hidden charges.
            </p>
          </div>

          {/* Promo Code Section */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm font-semibold mb-3 text-foreground">Have a promo code?</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoError('');
                  setPromoDiscount(null);
                }}
                className="text-sm rounded-none border-border"
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-border px-6"
                disabled={!promoCode.trim() || promoLoading}
                onClick={async () => {
                  setPromoLoading(true);
                  setPromoError('');
                  try {
                    const bodyPayload: Record<string, unknown> = { code: promoCode };
                    if (prebook) {
                      bodyPayload.quote = prebook.quote;
                      bodyPayload.quoteSignature = prebook.quote.signature;
                    }
                    const res = await fetch('/api/promo/validate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(bodyPayload)
                    });
                    const data = await res.json();
                    if (res.ok && data.valid) {
                      setPromoDiscount(data.discountPercent);
                      if (data.newQuote && data.newSignature && prebook) {
                        setPrebook({
                          ...prebook,
                          quote: {
                            ...data.newQuote,
                            signature: data.newSignature
                          }
                        });
                      }
                    } else {
                      setPromoError(data.error || 'Invalid code');
                    }
                  } catch {
                    setPromoError('Failed to validate');
                  } finally {
                    setPromoLoading(false);
                  }
                }}
              >
                Apply
              </Button>
            </div>
            {promoDiscount && (
              <p className="mt-3 text-sm font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 px-3 py-2">✓ {promoDiscount}% discount applied to base rate.</p>
            )}
            {promoError && (
              <p className="mt-3 text-sm font-medium text-destructive">{promoError}</p>
            )}
          </div>

          {/* Trust Guarantees */}
          <div className="mt-8 pt-6 border-t border-border bg-muted/20 -mx-6 -mb-6 p-6">
            <h4 className="text-sm font-bold text-foreground mb-3">Your booking is protected</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>SSL Secure</strong> - Your information is encrypted and secure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>Instant Confirmation</strong> - You will receive your booking details immediately.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
        <p className="text-sm text-red-600">Please correct invalid fields.</p>
      )}

      <section className={`rounded-2xl border border-border bg-background p-4 ${prebook ? '' : 'hidden'}`}>
        <h2 className="mb-2 text-sm font-semibold">Payment</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          {isDevEnvironment
            ? 'Sandbox test card: `4242 4242 4242 4242` with any valid future date/CVV.'
            : 'Secure payment form is loaded below.'}
        </p>
        <div id="liteapi-payment-target" />
      </section>

      {prebookMutation.error && <p className="text-sm text-red-600">{errorMessage(prebookMutation.error)}</p>}
      {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}

      {prebook && isDevEnvironment ? (
        <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm">
          <p className="font-semibold">Prebook created successfully</p>
          <p className="mt-1 text-muted-foreground">Prebook ID: {prebook.prebookId}</p>
          <p className="text-muted-foreground">Transaction ID: {prebook.transactionId}</p>
          <p className="mt-2 font-semibold text-primary">Quote total: {prebook.quote.currency} {prebook.quote.totalAmount}</p>
          <p className="text-xs text-muted-foreground">Quote signature: {prebook.quote.signature.slice(0, 12)}...</p>
        </div>
      ) : null}
    </section>
  );
}
