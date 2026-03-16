'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { normalizeCurrency, normalizeLanguage } from '@/shared/lib/preferences';
import { withCsrfHeaders } from '@/shared/lib/csrf';

export function BookingReturnClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'processing' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('Finalizing booking...');
  const [fallbackBookingId, setFallbackBookingId] = useState<string | null>(null);

  const finalizedRequestRef = useRef<string | null>(null);

  const prebookId = params.get('prebookId') ?? '';
  const transactionId = params.get('transactionId') ?? '';
  const language = normalizeLanguage(params.get('language'));
  const currency = normalizeCurrency(params.get('currency'));

  const canFinalize = useMemo(() => Boolean(prebookId && transactionId), [prebookId, transactionId]);

  useEffect(() => {
    let active = true;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function run() {
      if (!canFinalize) {
        if (!active) return;
        setStatus('error');
        setMessage('Missing payment return parameters.');
        return;
      }

      const requestKey = `${prebookId}:${transactionId}`;
      if (finalizedRequestRef.current === requestKey) {
        return;
      }
      finalizedRequestRef.current = requestKey;

      try {
        const response = await fetch('/api/booking/book', {
          method: 'POST',
          headers: withCsrfHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({
            prebookId,
            transactionId
          })
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? 'Failed to finalize booking');
        }

        if (!active) return;
        setStatus('processing');
        setMessage('Payment captured. Waiting for booking lifecycle confirmation...');

        for (let attempt = 0; attempt < 40; attempt += 1) {
          const statusResponse = await fetch('/api/booking/status', {
            method: 'POST',
            headers: withCsrfHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({
              transactionId,
              prebookId
            })
          });
          const statusJson = await statusResponse.json();
          if (!statusResponse.ok) {
            throw new Error(statusJson.error ?? 'Failed to read booking lifecycle status');
          }

          if (statusJson.outcome === 'confirmed') {
            if (statusJson.localBookingId) {
              const bookingParams = new URLSearchParams();
              if (language) {
                bookingParams.set('language', language);
              }
              if (currency) {
                bookingParams.set('currency', currency);
              }
              const query = bookingParams.toString();
              const bookingUrl = query
                ? `/bookings/${encodeURIComponent(statusJson.localBookingId)}?${query}`
                : `/bookings/${encodeURIComponent(statusJson.localBookingId)}`;
              router.replace(bookingUrl as never);
              return;
            }

            if (!active) return;
            setStatus('success');
            setFallbackBookingId(String(statusJson.localBookingId ?? json.localBookingId ?? ''));
            setMessage('Booking confirmed, but secure confirmation link is unavailable. Keep this reference and contact support.');
            return;
          }

          if (statusJson.outcome === 'failed') {
            if (!active) return;
            setStatus('error');
            setMessage(statusJson.message ?? 'Booking failed. Please restart checkout.');
            return;
          }

          if (!active) return;
          setStatus('processing');
          setMessage(statusJson.message ?? 'Booking is still processing.');
          await wait(1500);
        }

        if (!active) return;
        setStatus('processing');
        setMessage('Booking is still processing. We will keep checking automatically.');
      } catch (error) {
        finalizedRequestRef.current = null;
        if (!active) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to finalize booking');
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [canFinalize, currency, language, prebookId, router, transactionId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="rounded-2xl border border-border bg-card/85 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Payment Return</p>
        <h1 className="mt-2 text-2xl font-semibold">Finalizing your booking</h1>
        <p className={`mt-2 text-sm ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-emerald-700' : 'text-muted-foreground'}`}>{message}</p>
        {fallbackBookingId ? <p className="mt-2 text-sm font-medium">Booking reference: <span className="font-mono">{fallbackBookingId}</span></p> : null}
      </section>
    </main>
  );
}
