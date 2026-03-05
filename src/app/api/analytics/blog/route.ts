import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { logger } from '@/server/logger';
import { toHttpError } from '@/server/errors';
import { getClientIp, getCorrelationId } from '@/server/request';

const payloadSchema = z.object({
  name: z.enum(['blog_list_view', 'blog_post_view', 'blog_search', 'blog_related_click', 'blog_cta_click']),
  properties: z
    .object({
      slug: z.string().optional(),
      category: z.string().optional(),
      tag: z.string().optional(),
      position: z.number().int().nonnegative().optional(),
      referrerPath: z.string().optional(),
      query: z.string().optional(),
      targetPath: z.string().optional()
    })
    .partial()
    .optional(),
  ts: z.number().int().positive().optional()
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await assertRateLimit(`analytics-blog:${clientIp}`);

    const correlationId = getCorrelationId(request);
    const raw = await request.json();
    const payload = payloadSchema.parse(raw);

    logger.info(
      {
        correlationId,
        clientIp,
        eventName: payload.name,
        properties: payload.properties ?? {},
        ts: payload.ts ?? Date.now()
      },
      'Blog analytics event received'
    );

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

