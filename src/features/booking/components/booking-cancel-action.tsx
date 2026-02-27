'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type BookingCancelActionProps = {
  bookingId: string;
  viewToken: string;
  bookingStatus: string;
};

type CancelState = 'idle' | 'submitting' | 'success' | 'error';

const CANCELLABLE_STATUSES = new Set(['payment_authorized', 'confirmed']);

export function BookingCancelAction({ bookingId, viewToken, bookingStatus }: BookingCancelActionProps) {
  const [state, setState] = useState<CancelState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const canCancel = useMemo(() => CANCELLABLE_STATUSES.has(bookingStatus), [bookingStatus]);

  async function submitCancellation(): Promise<void> {
    setState('submitting');
    setMessage(null);

    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-booking-view-token': viewToken
        },
        body: JSON.stringify({
          reason: 'Guest requested cancellation from booking confirmation page'
        })
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Cancellation failed');
      }

      setState('success');
      setMessage('Cancellation submitted. Refund status will update shortly.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Cancellation failed');
    }
  }

  if (!canCancel) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        This booking is currently <span className="font-medium capitalize">{bookingStatus}</span> and cannot be canceled from this page.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={state === 'submitting' || state === 'success'}
        onClick={() => {
          void submitCancellation();
        }}
      >
        {state === 'submitting' ? 'Submitting cancellation...' : state === 'success' ? 'Cancellation submitted' : 'Cancel this booking'}
      </Button>
      {message ? (
        <p className={`text-xs ${state === 'error' ? 'text-red-600' : 'text-muted-foreground'}`}>{message}</p>
      ) : null}
    </div>
  );
}
