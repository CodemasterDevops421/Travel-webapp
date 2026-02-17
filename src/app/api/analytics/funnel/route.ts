import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { logger } from '@/server/logger';
import { toHttpError } from '@/server/errors';
import { getClientIp, getCorrelationId } from '@/server/request';
import { persistFunnelEvent } from '@/server/analytics-repository';

const payloadSchema = z.object({
  name: z.enum([
    'search_input_started',
    'autocomplete_suggestion_selected',
    'search_submitted',
    'preview_card_opened'
  ]),
  step: z.enum(['discovery', 'search', 'consideration']),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  ts: z.number().int().positive().optional()
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await assertRateLimit(`analytics-funnel:${clientIp}`);

    const correlationId = getCorrelationId(request);
    const raw = await request.json();
    const payload = payloadSchema.parse(raw);
    const ts = payload.ts ?? Date.now();

    const eventId = await persistFunnelEvent({
      name: payload.name,
      step: payload.step,
      properties: payload.properties ?? {},
      correlationId,
      ts,
      clientIp
    });

    logger.info(
      {
        correlationId,
        eventId,
        eventName: payload.name,
        step: payload.step,
        properties: payload.properties ?? null,
        ts
      },
      'Funnel analytics event received'
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
