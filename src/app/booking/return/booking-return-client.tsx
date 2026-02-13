'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

function checkoutStorageKey(transactionId: string): string {
  return `booking:checkout:${transactionId}`;
}

function readCheckoutSession(transactionId: string): CheckoutSessionPayload | null {
  const key = checkoutStorageKey(transactionId);
  const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CheckoutSessionPayload;
  } catch {
    return null;
  }
}

function clearCheckoutSession(transactionId: string): void {
  const key = checkoutStorageKey(transactionId);
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

export function BookingReturnClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Finalizing booking...');

  const prebookId = params.get('prebookId') ?? '';
  const transactionId = params.get('transactionId') ?? '';

  const canFinalize = useMemo(() => Boolean(prebookId && transactionId), [prebookId, transactionId]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!canFinalize) {
        if (!active) return;
        setStatus('error');
        setMessage('Missing payment return parameters.');
        return;
      }

      const session = readCheckoutSession(transactionId);
      if (!session) {
        if (!active) return;
        setStatus('error');
        setMessage('Checkout session not found. Please restart booking.');
        return;
      }

      try {
        const response = await fetch('/api/booking/book', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            prebookId,
            transactionId,
            clientReference: session.clientReference,
            quoteId: session.quoteId,
            sessionSignature: session.sessionSignature,
            quoteSignature: session.quoteSignature,
            holder: session.holder,
            guests: session.guests
          })
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? 'Failed to finalize booking');
        }

        clearCheckoutSession(transactionId);
        if (json.localBookingId && json.bookingViewToken) {
          const bookingUrl = `/bookings/${encodeURIComponent(json.localBookingId)}?viewToken=${encodeURIComponent(json.bookingViewToken)}`;
          router.replace(bookingUrl as never);
          return;
        }
        if (!active) return;
        setStatus('error');
        setMessage('Booking finalized but secure view token missing. Please restart checkout.');
      } catch (error) {
        if (!active) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to finalize booking');
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [canFinalize, prebookId, router, transactionId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="rounded-2xl border border-border bg-card/85 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Payment Return</p>
        <h1 className="mt-2 text-2xl font-semibold">Finalizing your booking</h1>
        <p className={`mt-2 text-sm ${status === 'error' ? 'text-red-600' : 'text-muted-foreground'}`}>{message}</p>
      </section>
    </main>
  );
}
