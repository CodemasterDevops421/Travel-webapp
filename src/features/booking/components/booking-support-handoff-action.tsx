'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { withCsrfHeaders } from '@/shared/lib/csrf';

type BookingSupportHandoffActionProps = {
  bookingId: string;
  viewToken?: string | null;
};

type SupportState = 'idle' | 'submitting' | 'success' | 'error';

type SupportResponse = {
  supportRequestId: string;
  supportPacket: {
    bookingId: string;
    liteapiBookingId: string | null;
    transactionId: string | null;
    prebookId: string | null;
    clientReference: string | null;
  };
};

export function BookingSupportHandoffAction({ bookingId, viewToken = null }: BookingSupportHandoffActionProps) {
  const [state, setState] = useState<SupportState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<SupportResponse | null>(null);

  async function createSupportHandoff(): Promise<void> {
    setState('submitting');
    setMessage(null);

    try {
        const response = await fetch('/api/support/liteapi', {
          method: 'POST',
          headers: withCsrfHeaders({
            'content-type': 'application/json',
            ...(viewToken ? { 'x-booking-view-token': viewToken } : {})
          }),
        body: JSON.stringify({
          bookingId,
          channel: 'chat',
          notes: 'Guest initiated support handoff from booking confirmation page.'
        })
      });
      const json = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Support handoff failed');
      }

      const typed = json as unknown as SupportResponse;
      setResponseData(typed);
      setState('success');
      setMessage('Support handoff packet prepared. Share the request id and identifiers with LiteAPI support.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Support handoff failed');
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={state === 'submitting'}
        onClick={() => {
          void createSupportHandoff();
        }}
      >
        {state === 'submitting' ? 'Preparing support handoff...' : 'Prepare LiteAPI support handoff'}
      </Button>
      {message ? <p className={`text-xs ${state === 'error' ? 'text-red-600' : 'text-muted-foreground'}`}>{message}</p> : null}
      {responseData ? (
        <div className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Support request: {responseData.supportRequestId}</p>
          <p>Booking: {responseData.supportPacket.bookingId}</p>
          <p>Supplier booking: {responseData.supportPacket.liteapiBookingId ?? 'Unavailable'}</p>
          <p>Transaction: {responseData.supportPacket.transactionId ?? 'Unavailable'}</p>
          <p>Prebook: {responseData.supportPacket.prebookId ?? 'Unavailable'}</p>
          <p>Client reference: {responseData.supportPacket.clientReference ?? 'Unavailable'}</p>
        </div>
      ) : null}
    </div>
  );
}
