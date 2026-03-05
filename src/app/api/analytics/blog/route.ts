import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { logger } from '@/server/logger';
import { toHttpError } from '@/server/errors';
import { getClientIp, getCorrelationId } from '@/server/request';
import { persistBlogEvent, type BlogEventProperties } from '@/server/blog-analytics-repository';

const payloadSchema = z.object({
  name: z.enum(['blog_list_view', 'blog_post_view', 'blog_search', 'blog_related_click', 'blog_cta_click']),
  properties: z.object({
    slug: z.string().trim().min(1).nullable(),
    category: z.string().trim().min(1).nullable(),
    tag: z.string().trim().min(1).nullable(),
    position: z.number().int().nonnegative().nullable(),
    referrerPath: z.string().trim().min(1),
    ctaVariant: z.enum(['control', 'variant_a', 'variant_b']).nullable().optional(),
    ctaIntent: z.enum(['book_now', 'explore_hotels', 'discover_destination']).nullable().optional(),
    query: z.string().trim().min(1).nullable().optional(),
    targetPath: z.string().trim().min(1).nullable().optional()
  }),
  ts: z.number().int().positive().optional()
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await assertRateLimit(`analytics-blog:${clientIp}`);

    const correlationId = getCorrelationId(request);
    const raw = await request.json();
    const payload = payloadSchema.parse(raw);
    const normalizedProperties: BlogEventProperties = {
      slug: payload.properties.slug,
      category: payload.properties.category,
      tag: payload.properties.tag,
      position: payload.properties.position,
      referrerPath: payload.properties.referrerPath,
      ctaVariant: payload.properties.ctaVariant ?? null,
      ctaIntent: payload.properties.ctaIntent ?? null,
      query: payload.properties.query ?? null,
      targetPath: payload.properties.targetPath ?? null
    };
    const eventId = await persistBlogEvent({
      name: payload.name,
      properties: normalizedProperties,
      correlationId,
      ts: payload.ts ?? Date.now(),
      clientIp
    });

    logger.info(
      {
        eventId,
        correlationId,
        clientIp,
        eventName: payload.name,
        properties: normalizedProperties,
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
