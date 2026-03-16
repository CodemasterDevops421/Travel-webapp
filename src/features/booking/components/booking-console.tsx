'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, CircleHelp, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicEnv } from '@/shared/env.public';
import { normalizeCurrency, normalizeLanguage } from '@/shared/lib/preferences';
import { withCsrfHeaders } from '@/shared/lib/csrf';
import { useAuth } from '@/shared/hooks/use-auth';
import { cn } from '@/shared/lib/utils';

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
  cancellationNote: z.string().trim().optional().or(z.literal('')),
  isRefundable: z.enum(['true', 'false', 'unknown']).optional(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().or(z.literal('')),
  hotelName: z.string().trim().optional().or(z.literal('')),
  hotelImage: z.string().trim().optional().or(z.literal('')),
  hotelAddress: z.string().trim().optional().or(z.literal('')),
  starRating: z.coerce.number().optional(),
  roomName: z.string().trim().optional().or(z.literal('')),
  boardName: z.string().trim().optional().or(z.literal('')),
  roomImage: z.string().trim().optional().or(z.literal(''))
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

type CheckoutDraft = Pick<
  FormValues,
  | 'hotelId'
  | 'roomId'
  | 'offerId'
  | 'amount'
  | 'currency'
  | 'adults'
  | 'rooms'
  | 'checkIn'
  | 'checkOut'
  | 'cancellationNote'
  | 'isRefundable'
  | 'hotelName'
  | 'hotelImage'
  | 'hotelAddress'
  | 'starRating'
  | 'roomName'
  | 'boardName'
  | 'roomImage'
>;

const PAYMENT_SCRIPT_URL = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1';
const PAYMENT_SCRIPT_ID = 'liteapi-payment-sdk';
const CHECKOUT_DRAFT_STORAGE_KEY = 'booking:checkout:draft';

type CheckoutStep = 'guest_details' | 'payment' | 'confirmation';

function loadCheckoutDraft(): Partial<FormValues> | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write failures to avoid blocking checkout launch.
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
    checkOut: values.checkOut,
    cancellationNote: values.cancellationNote,
    isRefundable: values.isRefundable,
    hotelName: values.hotelName,
    hotelImage: values.hotelImage,
    hotelAddress: values.hotelAddress,
    starRating: values.starRating,
    roomName: values.roomName,
    boardName: values.boardName,
    roomImage: values.roomImage
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

async function ensurePaymentScriptLoaded(): Promise<void> {
  if (window.LiteAPIPayment) return;

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

function formatStayDate(value: string): string {
  if (!value) return 'Select date';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function formatMoney(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function BookingConsole({ initialValues, preferredLanguage, preferredCurrency }: BookingConsoleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: authIsLoading, error: authError } = useAuth();
  const isDevEnvironment = process.env.NODE_ENV !== 'production';
  const [prebook, setPrebook] = useState<PrebookResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    cancellationNote: initialValues?.cancellationNote ?? '',
    isRefundable:
      initialValues?.isRefundable === 'true' ||
      initialValues?.isRefundable === 'false' ||
      initialValues?.isRefundable === 'unknown'
        ? initialValues.isRefundable
        : 'unknown',
    firstName: initialValues?.firstName ?? '',
    lastName: initialValues?.lastName ?? '',
    email: initialValues?.email ?? '',
    phone: initialValues?.phone ?? '',
    hotelName: initialValues?.hotelName ?? '',
    hotelImage: initialValues?.hotelImage ?? '',
    hotelAddress: initialValues?.hotelAddress ?? '',
    starRating: initialValues?.starRating,
    roomName: initialValues?.roomName ?? '',
    boardName: initialValues?.boardName ?? '',
    roomImage: initialValues?.roomImage ?? ''
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
        checkOut: initialValues?.checkOut ?? draft.checkOut ?? '',
        cancellationNote: initialValues?.cancellationNote ?? draft.cancellationNote ?? '',
        isRefundable: initialValues?.isRefundable ?? draft.isRefundable ?? 'unknown',
        hotelName: initialValues?.hotelName ?? draft.hotelName ?? '',
        hotelImage: initialValues?.hotelImage ?? draft.hotelImage ?? '',
        hotelAddress: initialValues?.hotelAddress ?? draft.hotelAddress ?? '',
        starRating: initialValues?.starRating ?? draft.starRating,
        roomName: initialValues?.roomName ?? draft.roomName ?? '',
        boardName: initialValues?.boardName ?? draft.boardName ?? '',
        roomImage: initialValues?.roomImage ?? draft.roomImage ?? '',
        phone: initialValues?.phone ?? ''
      });
    }
  }, [
    form,
    initialValues?.boardName,
    initialValues?.cancellationNote,
    initialValues?.checkIn,
    initialValues?.checkOut,
    initialValues?.hotelAddress,
    initialValues?.hotelId,
    initialValues?.hotelImage,
    initialValues?.hotelName,
    initialValues?.isRefundable,
    initialValues?.offerId,
    initialValues?.phone,
    initialValues?.roomId,
    initialValues?.roomImage,
    initialValues?.roomName,
    initialValues?.starRating
  ]);

  const prebookFingerprint = useMemo(
    () =>
      [
        liveValues.hotelId,
        liveValues.roomId,
        liveValues.offerId,
        liveValues.checkIn,
        liveValues.checkOut,
        liveValues.adults,
        liveValues.rooms
      ].join('|'),
    [liveValues.adults, liveValues.checkIn, liveValues.checkOut, liveValues.hotelId, liveValues.offerId, liveValues.roomId, liveValues.rooms]
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

  const nights = useMemo(() => {
    if (!liveValues.checkIn || !liveValues.checkOut) return null;
    const start = new Date(`${liveValues.checkIn}T00:00:00`);
    const end = new Date(`${liveValues.checkOut}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }, [liveValues.checkIn, liveValues.checkOut]);

  // `amount` is the full quoted stay total from LiteAPI (retailRate.total[0].amount),
  // NOT a per-night figure — do not multiply by nights or rooms.
  const quotedStayTotal = Number(liveValues.amount || 0);
  const currency = (liveValues.currency || 'USD').toUpperCase();
  const promoPreviewTotal = promoDiscount
    ? Math.max(0, Math.floor(quotedStayTotal * (1 - (promoDiscount / 100))))
    : quotedStayTotal;
  const totalAmount = prebook?.quote.totalAmount ?? promoPreviewTotal;
  const staySubtotal = quotedStayTotal; // already the full stay price
  // Only show taxes line when prebook returns a confirmed total that differs from the quoted amount.
  const estimatedTaxesAndFees = prebook ? Math.max(totalAmount - staySubtotal, 0) : 0;
  const nightlyAmount = nights && nights > 0 ? totalAmount / nights : totalAmount;
  const cancellationSummary =
    liveValues.isRefundable === 'false'
      ? 'This selected rate is non-refundable.'
      : liveValues.cancellationNote?.trim()
        ? liveValues.cancellationNote.trim()
        : liveValues.isRefundable === 'true'
          ? 'This selected rate includes supplier-provided cancellation flexibility.'
          : 'Cancellation policy will be confirmed from the selected rate before final payment.';
  const hotelSummaryName = liveValues.hotelName || 'Selected property';
  const hotelSummaryImage = liveValues.hotelImage || liveValues.roomImage || '';
  const roomSummaryName = liveValues.roomName || 'Selected room';
  const boardSummaryName = liveValues.boardName || 'Board details available after rate selection';
  const starRating =
    typeof liveValues.starRating === 'number' && Number.isFinite(liveValues.starRating) ? liveValues.starRating : null;
  const query = searchParams.toString();
  const redirectPath = query ? `${pathname}?${query}` : pathname;
  const signInHref = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;
  const selectedLanguageParam = preferredLanguage ?? normalizeLanguage(searchParams.get('preferredLanguage')) ?? normalizeLanguage(searchParams.get('language'));
  const selectedCurrencyParam = preferredCurrency ?? normalizeCurrency(searchParams.get('preferredCurrency')) ?? normalizeCurrency(searchParams.get('currency'));
  const backToPropertyHref = (() => {
    if (!liveValues.hotelId) {
      return '/';
    }
    const params = new URLSearchParams({
      checkin: liveValues.checkIn,
      checkout: liveValues.checkOut,
      adults: String(liveValues.adults),
      rooms: String(liveValues.rooms)
    });
    if (selectedLanguageParam) {
      params.set('language', selectedLanguageParam);
    }
    if (selectedCurrencyParam) {
      params.set('currency', selectedCurrencyParam);
    }
    return `/hotels/${liveValues.hotelId}?${params.toString()}`;
  })();

  const prebookMutation = useMutation({
    mutationFn: async (values: FormValues): Promise<PrebookResult> => {
      const response = await fetch('/api/booking/prebook', {
        method: 'POST',
        headers: withCsrfHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          hotelId: values.hotelId,
          roomId: values.roomId,
          offerId: values.offerId,
          ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
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

  async function ensureSignedInForPayment(): Promise<void> {
    if (authIsLoading) {
      throw new Error('Checking your account before payment. Please try again.');
    }

    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
      throw new Error(authError ?? 'Sign in to continue to secure payment.');
    }
  }

  async function startPayment(values: FormValues, prebookPayload?: PrebookResult): Promise<void> {
    const activePrebook = prebookPayload ?? prebook;
    if (!activePrebook) return;
    setPaymentError(null);
    await ensureSignedInForPayment();

    const guestDistribution = buildPrebookGuests(values.adults, values.rooms);
    const guestsPayload = guestDistribution.map((_, index) => ({
      occupancyNumber: index + 1,
      firstName: values.firstName,
      lastName: values.lastName
    }));

    const progressResponse = await fetch('/api/booking/checkout-progress', {
      method: 'POST',
      headers: withCsrfHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({
        prebookId: activePrebook.prebookId,
        transactionId: activePrebook.transactionId,
        clientReference: activePrebook.clientReference,
        quoteId: activePrebook.quoteId,
        sessionSignature: activePrebook.sessionSignature,
        quoteSignature: activePrebook.quote.signature,
        holder: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email
        },
        guests: guestsPayload,
        quote: activePrebook.quote
      })
    });
    const progressJson = await progressResponse.json().catch(() => ({}));
    if (!progressResponse.ok) {
      throw new Error(
        typeof progressJson.error === 'string'
          ? progressJson.error
          : 'Unable to secure your checkout session before payment.'
      );
    }

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
    const resolvedLanguage =
      normalizeLanguage(preferredLanguage) ?? normalizeLanguage(window.localStorage.getItem('hostelstays:language'));
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
      setPrebook(createdPrebook);
      setCheckoutStep('payment');
      return;
    }
    if (!termsAccepted) {
      setPaymentError('Please accept the cancellation policy and terms before continuing to payment.');
      return;
    }
    await startPayment(values).catch((error: unknown) => {
      setCheckoutStep('payment');
      setPaymentError(errorMessage(error));
    });
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border/80 bg-card/92 px-5 py-4 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.34)]">
        <Link
          href={backToPropertyHref as never}
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to property
        </Link>
        {!user ? (
          <Link
            href={signInHref as never}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Sign in
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Signed in
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),380px] xl:grid-cols-[minmax(0,1.25fr),420px]">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="rounded-[28px] border border-border/80 bg-card/96 p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.34)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Booking review</p>
                <h1 className="mt-2 text-3xl font-semibold text-foreground">Complete your booking</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Review traveler details, stay terms, and price clarity here first. We only ask you to sign in when you continue to secure payment.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className={cn('rounded-full px-3 py-1.5', checkoutStep === 'guest_details' ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground')}>Guest details</span>
                <span className={cn('rounded-full px-3 py-1.5', checkoutStep === 'payment' ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground')}>Payment</span>
                <span className={cn('rounded-full px-3 py-1.5', checkoutStep === 'confirmation' ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground')}>Confirmation</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/80 bg-card p-4 text-sm text-muted-foreground">
            All required booking details stay on this page. Guest review is available without sign-in, and payment auth is checked only when you continue to the secure payment step.
          </div>
          {hasSelectedRate ? (
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
              <input type="hidden" {...form.register('cancellationNote')} />
              <input type="hidden" {...form.register('isRefundable')} />
              <input type="hidden" {...form.register('hotelName')} />
              <input type="hidden" {...form.register('hotelImage')} />
              <input type="hidden" {...form.register('hotelAddress')} />
              <input type="hidden" {...form.register('starRating')} />
              <input type="hidden" {...form.register('roomName')} />
              <input type="hidden" {...form.register('boardName')} />
              <input type="hidden" {...form.register('roomImage')} />
            </>
          ) : (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              No room selected yet. Return to a property page and choose a room before starting checkout.
            </div>
          )}

          <section className="rounded-[28px] border border-border/80 bg-card p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.3)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Your details</h2>
                <p className="mt-1 text-sm text-muted-foreground">We use these details for supplier preparation and booking updates.</p>
              </div>
              {!user ? (
                <Link href={signInHref as never} className="text-sm font-semibold text-primary underline underline-offset-2">
                  Sign in to autofill
                </Link>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="ui-label block text-muted-foreground">First name</span>
                <Input aria-label="First name" placeholder="Enter first name" {...form.register('firstName')} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="ui-label block text-muted-foreground">Last name</span>
                <Input aria-label="Last name" placeholder="Enter last name" {...form.register('lastName')} />
              </label>
            </div>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2 text-sm">
                <span className="ui-label block text-muted-foreground">Email</span>
                <Input aria-label="Email" placeholder="Enter email" type="email" {...form.register('email')} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="ui-label block text-muted-foreground">Phone</span>
                <Input aria-label="Phone" placeholder="Enter phone number" {...form.register('phone')} />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-border/80 bg-card p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.3)]">
            <h2 className="text-xl font-semibold text-foreground">Promo code</h2>
            <p className="mt-1 text-sm text-muted-foreground">Apply any discount before you continue to payment.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="Promo code"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoError('');
                  setPromoDiscount(null);
                  setAppliedPromoCode(null);
                }}
                className="sm:flex-1"
              />
              <Button type="button" variant="outline" className="sm:w-auto" disabled={!promoCode.trim() || promoLoading} onClick={async () => {
                setPromoLoading(true);
                setPromoError('');
                try {
                  const res = await fetch('/api/promo/validate', {
                    method: 'POST',
                    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ code: promoCode })
                  });
                  const data = await res.json();
                  if (res.ok && data.valid) {
                    setPromoDiscount(data.discountPercent);
                    setAppliedPromoCode(String(data.code ?? promoCode).trim().toUpperCase());
                    setPrebook(null);
                    setPaymentError(null);
                  } else {
                    setPromoError(data.error || 'Invalid code');
                  }
                } catch {
                  setPromoError('Failed to validate');
                } finally {
                  setPromoLoading(false);
                }
              }}>
                Apply
              </Button>
            </div>
            {promoDiscount ? <p className="mt-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{promoDiscount}% discount will be applied when the room is prebooked for payment.</p> : null}
            {promoError ? <p className="mt-3 text-sm font-medium text-destructive">{promoError}</p> : null}
          </section>

          <section className="rounded-[28px] border border-border/80 bg-card p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.3)]">
            <h2 className="text-xl font-semibold text-foreground">Payment information</h2>
            <p className="mt-1 text-sm text-muted-foreground">Secure payment is launched only after your room is reviewed, prebooked, and your terms are accepted.</p>
            <div className="mt-4 rounded-[20px] border border-border/80 bg-background/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Secure payment widget</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {prebook ? 'Your selected quote is ready. Continue to launch the secure payment experience.' : 'We prepare your selected room first, then open the secure payment experience in this section.'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure checkout
                </span>
              </div>
              <div className={cn('mt-4 rounded-[18px] border border-dashed border-border bg-card p-4', prebook ? '' : 'hidden')}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Payment</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isDevEnvironment ? 'Sandbox test card: `4242 4242 4242 4242` with any valid future date and CVC.' : 'Secure payment form appears below after you continue to payment.'}
                    </p>
                  </div>
                  <Button type="button" disabled={!termsAccepted} onClick={() => {
                    void form.handleSubmit(async (values) => {
                      if (!termsAccepted) {
                        setPaymentError('Please accept the cancellation policy and terms before continuing to payment.');
                        return;
                      }
                      await startPayment(values).catch((error: unknown) => {
                        setCheckoutStep('payment');
                        setPaymentError(errorMessage(error));
                      });
                    })();
                  }}>
                    {user ? 'Open secure payment' : 'Sign in to pay'}
                  </Button>
                </div>
                <div className="mt-4" id="liteapi-payment-target" />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border/80 bg-card p-5 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.3)]">
            <h2 className="text-xl font-semibold text-foreground">Terms and booking conditions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Please review the cancellation policy and terms before continuing to payment.</p>
            <div className="mt-4 flex items-start gap-3">
              <CircleHelp className="mt-0.5 h-4 w-4 text-primary" />
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{cancellationSummary}</p>
                <label className="flex items-start gap-3 text-sm text-foreground">
                  <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-4 w-4 rounded border border-border" />
                  <span>I accept the cancellation policy and terms for this booking.</span>
                </label>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <Button className="h-12 w-full rounded-full text-base font-semibold" type="submit" disabled={prebookMutation.isPending}>
                {prebookMutation.isPending ? 'Preparing booking review...' : !prebook ? 'Continue to booking review' : 'Complete booking'}
              </Button>
              {!user ? <p className="text-center text-xs text-muted-foreground">You can reach the booking page without signing in. We only require sign-in when you continue to payment.</p> : null}
            </div>
          </section>

          {form.formState.errors && Object.keys(form.formState.errors).length > 0 ? <p className="text-sm text-red-600">Please correct invalid fields.</p> : null}
          {prebookMutation.error ? <p className="text-sm text-red-600">{errorMessage(prebookMutation.error)}</p> : null}
          {paymentError ? <p className="text-sm text-red-600">{paymentError}</p> : null}
          {prebook && isDevEnvironment ? (
            <div className="rounded-[24px] border border-border bg-background/70 p-4 text-sm">
              <p className="font-semibold">Prebook created successfully</p>
              <p className="mt-1 text-muted-foreground">Prebook ID: {prebook.prebookId}</p>
              <p className="text-muted-foreground">Transaction ID: {prebook.transactionId}</p>
              <p className="mt-2 font-semibold text-primary">Quote total: {prebook.quote.currency} {prebook.quote.totalAmount}</p>
              <p className="text-xs text-muted-foreground">Quote signature: {prebook.quote.signature.slice(0, 12)}...</p>
            </div>
          ) : null}
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="surface-shell overflow-hidden">
            <div className="p-5">
              <div className="flex flex-col gap-4 border-b border-border/70 pb-5">
                <div className="flex gap-4">
                  <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-[18px] bg-muted">
                    {hotelSummaryImage ? <Image src={hotelSummaryImage} alt={hotelSummaryName} fill sizes="112px" className="object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    {starRating ? (
                      <div className="mb-2 flex items-center gap-1 text-primary">
                        {Array.from({ length: Math.max(1, Math.round(starRating)) }).map((_, index) => (
                          <Star key={index} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    ) : null}
                    <h2 className="text-xl font-semibold leading-6 text-foreground">{hotelSummaryName}</h2>
                    <p className="mt-2 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{liveValues.hotelAddress || 'Property location details appear here once available.'}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 py-5">
                <section className="space-y-2 border-b border-border/70 pb-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Your booking is protected</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Selected rate locked — your price is guaranteed until payment is completed.</p>
                  <p className="text-xs text-muted-foreground">Selected rate locked</p>
                </section>

                <section className="space-y-2 border-b border-border/70 pb-5">
                  <p className="ui-label text-muted-foreground">Cancellation summary</p>
                  <p className="text-sm text-muted-foreground">{cancellationSummary}</p>
                </section>

                <section className="space-y-2 border-b border-border/70 pb-5">
                  <p className="ui-label text-muted-foreground">Check-in & check-out</p>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{formatStayDate(liveValues.checkIn)} - {formatStayDate(liveValues.checkOut)}</p>
                      <p>{nights ? `${nights} night${nights > 1 ? 's' : ''}` : 'Stay duration pending'} · {liveValues.adults} adult{liveValues.adults > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-b border-border/70 pb-5">
                  <h3 className="text-lg font-semibold text-foreground">Cancellation policy</h3>
                  <div className="rounded-[20px] border border-border bg-background/80 p-4">
                    <p className="font-semibold text-foreground">
                      {liveValues.isRefundable === 'false' ? 'Non-refundable' : liveValues.isRefundable === 'true' ? 'Flexible booking' : 'Supplier policy pending'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{cancellationSummary}</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-background/80 px-4 py-3">
                    <p className="ui-label text-muted-foreground">Your room</p>
                    <span className="text-xs font-semibold text-primary">Important information</span>
                  </div>
                  <div className="rounded-[20px] border border-border bg-card px-4 py-4">
                    <p className="text-sm font-semibold text-foreground">{roomSummaryName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{boardSummaryName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{liveValues.rooms} room x {nights ?? 1} night{(nights ?? 1) > 1 ? 's' : ''}</p>
                    <div className="mt-4 space-y-3 border-t border-border/70 pt-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Average per night</span>
                        <span className="font-semibold text-foreground">{formatMoney(currency, nightlyAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Room subtotal</span>
                        <span className="font-semibold text-foreground">{formatMoney(currency, staySubtotal)}</span>
                      </div>
                      {estimatedTaxesAndFees > 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">Estimated taxes and fees <CircleHelp className="h-3.5 w-3.5" /></span>
                          <span className="font-semibold text-foreground">{formatMoney(currency, estimatedTaxesAndFees)}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                        <span className="text-base font-semibold text-foreground">Total</span>
                        <span className="text-xl font-bold text-foreground">{formatMoney(currency, totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
