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
import { 
  Shield, 
  Lock, 
  CreditCard, 
  User, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Circle,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Building2,
  Users
} from 'lucide-react';

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

function ProgressStep({ 
  step, 
  label, 
  isActive, 
  isComplete 
}: { 
  step: number; 
  label: string; 
  isActive: boolean; 
  isComplete: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
        isComplete 
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
          : isActive 
            ? 'bg-primary/10 text-primary border-2 border-primary'
            : 'bg-muted text-muted-foreground'
      }`}>
        {isComplete ? <CheckCircle2 className="h-5 w-5" /> : step}
      </div>
      <span className={`text-sm font-medium transition-colors ${
        isActive || isComplete ? 'text-foreground' : 'text-muted-foreground'
      }`}>
        {label}
      </span>
    </div>
  );
}

function BookingSummaryCard({ 
  nights, 
  baseAmount, 
  currency, 
  markupAmount, 
  totalAmount,
  checkIn,
  checkOut,
  adults,
  rooms
}: { 
  nights: number | null; 
  baseAmount: number; 
  currency: string; 
  markupAmount: number; 
  totalAmount: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 glass-card p-5 shadow-lg animate-slide-up">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Booking Summary</p>
      
      <div className="space-y-3 rounded-xl border border-border/50 bg-background/60 p-4">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{checkIn}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span>{checkOut}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span>{adults} adults · {rooms} room{rooms > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Nights
          </span>
          <span className="font-semibold">{nights ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Base rate</span>
          <span>{currency} {baseAmount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-primary" />
            Service fee
          </span>
          <span>{currency} {markupAmount.toLocaleString()}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between text-lg font-bold">
          <span className="flex items-center gap-2">
            <span className="text-gradient">Total</span>
          </span>
          <span className="text-gradient">{currency} {totalAmount.toLocaleString()}</span>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Cancellation terms and taxes are provided by supplier and shown before you confirm payment.
        </p>
      </div>
    </div>
  );
}

function PaymentWidget({ prebook, onError }: { prebook: PrebookResult; onError: (error: string) => void }) {
  return (
    <div className="rounded-2xl border border-border/60 glass-card p-5 animate-scale-in">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Payment Details</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Complete your payment securely. Test mode: use card <code className="bg-muted px-1.5 py-0.5 rounded text-xs">4242 4242 4242 4242</code> with any valid future date/CVV.
      </p>
      <div id="liteapi-payment-target" className="min-h-[200px] rounded-xl border border-border/50 bg-background/50" />
    </div>
  );
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

  const currentStep = prebook ? 2 : 1 as 1 | 2;

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
    onSuccess: (result) => {
      setPrebook(result);
    }
  });

  async function startPayment(values: FormValues, prebookPayload?: PrebookResult): Promise<void> {
    const activePrebook = prebookPayload ?? prebook;
    if (!activePrebook) return;
    setPaymentError(null);

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
      guests: [
        {
          occupancyNumber: 1,
          firstName: values.firstName,
          lastName: values.lastName
        }
      ]
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
    const resolvedLanguage = normalizeLanguage(preferredLanguage) ?? normalizeLanguage(window.localStorage.getItem('tf:language'));
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
      options: { business: { name: 'TravelForge' } }
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
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-lg animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Secure Checkout</p>
            <h1 className="mt-1 text-3xl font-semibold">Complete your booking</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Your rate is locked. Complete payment to receive instant confirmation.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Shield className="h-4 w-4" />
            Secure booking
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4">
          <ProgressStep step={1} label="Validate quote" isActive={currentStep === 1} isComplete={currentStep > 1} />
          <div className="h-px w-8 bg-border" />
          <ProgressStep step={2} label="Payment" isActive={currentStep === 2} isComplete={currentStep > 2} />
          <div className="h-px w-8 bg-border" />
          <ProgressStep step={3} label="Confirmation" isActive={false} isComplete={false} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr,0.9fr]">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="rounded-2xl border border-border/60 glass-card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Guest Details</h2>
            </div>

            {hasSelectedRate ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Check-in {liveValues.checkIn} → Check-out {liveValues.checkOut}</p>
                    <p className="text-sm text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <Input aria-label="Hotel ID" placeholder="Hotel ID" className="input-glass" {...form.register('hotelId')} />
                <Input aria-label="Room ID" placeholder="Room ID" className="input-glass" {...form.register('roomId')} />
                <Input aria-label="Offer ID" placeholder="Offer ID" className="input-glass" {...form.register('offerId')} />
                <Input aria-label="Amount" placeholder="Amount" type="number" step="1" className="input-glass" {...form.register('amount')} />
                <Input aria-label="Currency" placeholder="Currency (USD)" className="input-glass" {...form.register('currency')} />
                <Input aria-label="Adults" placeholder="Adults" type="number" min={1} step="1" className="input-glass" {...form.register('adults')} />
                <Input aria-label="Rooms" placeholder="Rooms" type="number" min={1} step="1" className="input-glass" {...form.register('rooms')} />
                <Input aria-label="Check-in date" placeholder="Check-in YYYY-MM-DD" className="input-glass" {...form.register('checkIn')} />
                <Input aria-label="Check-out date" placeholder="Check-out YYYY-MM-DD" className="input-glass" {...form.register('checkOut')} />
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

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">First name</label>
                <Input aria-label="First name" placeholder="John" className="input-glass" {...form.register('firstName')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Last name</label>
                <Input aria-label="Last name" placeholder="Doe" className="input-glass" {...form.register('lastName')} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  Email address
                </label>
                <Input aria-label="Email" placeholder="john@example.com" type="email" className="input-glass" {...form.register('email')} />
              </div>
            </div>

            <div className="mt-4">
              <Button 
                type="submit" 
                size="lg" 
                disabled={prebookMutation.isPending}
                className="w-full"
              >
                {prebookMutation.isPending ? (
                  <>
                    <span className="mr-2 animate-spin">⏳</span>
                    Securing your quote...
                  </>
                ) : !prebook ? (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Validate and proceed to payment
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Proceed to payment
                  </>
                )}
              </Button>
            </div>

            {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Please correct the invalid fields above.</p>
              </div>
            )}
          </div>

          {prebook && (
            <PaymentWidget 
              prebook={prebook} 
              onError={(error) => setPaymentError(error)} 
            />
          )}

          {prebook && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 animate-slide-up">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Quote secured successfully</p>
                  <p className="text-sm text-muted-foreground">
                    Prebook ID: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{prebook.prebookId.slice(0, 12)}...</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {prebookMutation.error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 animate-fade-in">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{errorMessage(prebookMutation.error)}</p>
            </div>
          )}
          
          {paymentError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 animate-fade-in">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{paymentError}</p>
            </div>
          )}
        </form>

        <BookingSummaryCard
          nights={nights}
          baseAmount={baseAmount}
          currency={currency}
          markupAmount={markupAmount}
          totalAmount={totalAmount}
          checkIn={liveValues.checkIn || '-'}
          checkOut={liveValues.checkOut || '-'}
          adults={liveValues.adults || 0}
          rooms={liveValues.rooms || 0}
        />
      </div>
    </section>
  );
}
