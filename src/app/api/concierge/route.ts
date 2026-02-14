import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getClientIp } from '@/server/request';
import { runConciergeChat } from '@/server/concierge';
import { toHttpError } from '@/server/errors';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(500)
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  trip: z
    .object({
      destination: z.string().trim().min(1).max(120).optional(),
      checkin: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      checkout: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      adults: z.number().int().min(1).max(8).optional(),
      rooms: z.number().int().min(1).max(4).optional(),
      currency: z.string().trim().length(3).optional(),
      language: z.string().trim().length(2).optional()
    })
    .optional()
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await assertRateLimit(`concierge:${clientIp}`);

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const response = await runConciergeChat({
      messages: parsed.data.messages,
      trip: parsed.data.trip
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
