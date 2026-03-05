import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/server/supabase/admin';
import { logger } from '@/server/logger';

export type BlogEventName =
  | 'blog_list_view'
  | 'blog_post_view'
  | 'blog_search'
  | 'blog_related_click'
  | 'blog_cta_click';

export type BlogEventProperties = {
  slug: string | null;
  category: string | null;
  tag: string | null;
  position: number | null;
  referrerPath: string;
  ctaVariant?: 'control' | 'variant_a' | 'variant_b' | null;
  ctaIntent?: 'book_now' | 'explore_hotels' | 'discover_destination' | null;
  query?: string | null;
  targetPath?: string | null;
};

type PersistBlogEventInput = {
  name: BlogEventName;
  properties: BlogEventProperties;
  correlationId: string;
  ts: number;
  clientIp: string;
};

type BlogEventRecord = PersistBlogEventInput & {
  id: string;
};

const fallbackEvents = new Map<string, BlogEventRecord>();
let schemaUnavailable = false;

function isSchemaMissingError(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === 'PGRST205';
}

export async function persistBlogEvent(input: PersistBlogEventInput): Promise<string | null> {
  const fallbackId = randomUUID();
  if (schemaUnavailable) {
    fallbackEvents.set(fallbackId, { ...input, id: fallbackId });
    return fallbackId;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('blog_events')
    .insert({
      event_name: input.name,
      slug: input.properties.slug,
      category: input.properties.category,
      tag: input.properties.tag,
      position: input.properties.position,
      referrer_path: input.properties.referrerPath,
      cta_variant: input.properties.ctaVariant ?? null,
      cta_intent: input.properties.ctaIntent ?? null,
      query: input.properties.query ?? null,
      target_path: input.properties.targetPath ?? null,
      properties: input.properties,
      correlation_id: input.correlationId,
      client_ip: input.clientIp,
      occurred_at: new Date(input.ts).toISOString()
    })
    .select('id')
    .single();

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Supabase blog_events schema missing. Falling back to memory.');
    } else {
      logger.error({ error }, 'Failed to persist blog analytics event');
    }

    fallbackEvents.set(fallbackId, { ...input, id: fallbackId });
    return fallbackId;
  }

  return data?.id ?? fallbackId;
}

type BlogSummaryRow = {
  event_name: BlogEventName;
  slug: string | null;
};

export type BlogAnalyticsSummary = {
  events: number;
  topLandingSlugs: Array<{ slug: string; count: number }>;
  relatedClickRate: number | null;
  blogToSearchCtr: number | null;
  assistedConversionClicks: number;
  pagesPerSession: number | null;
  degraded: boolean;
  degradedReason: string | null;
};

function toSummaryFromRows(rows: BlogSummaryRow[]): BlogAnalyticsSummary {
  const events = rows.length;
  const blogViews = rows.filter((row) => row.event_name === 'blog_post_view').length;
  const relatedClicks = rows.filter((row) => row.event_name === 'blog_related_click').length;
  const searchClicks = rows.filter((row) => row.event_name === 'blog_cta_click').length;
  const assistedConversionClicks = searchClicks;

  const slugCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.slug) continue;
    slugCounts.set(row.slug, (slugCounts.get(row.slug) ?? 0) + 1);
  }
  const topLandingSlugs = [...slugCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, count]) => ({ slug, count }));

  const round = (value: number) => Math.round(value * 100) / 100;
  const relatedClickRate = blogViews > 0 ? round((relatedClicks / blogViews) * 100) : null;
  const blogToSearchCtr = blogViews > 0 ? round((searchClicks / blogViews) * 100) : null;

  return {
    events,
    topLandingSlugs,
    relatedClickRate,
    blogToSearchCtr,
    assistedConversionClicks,
    pagesPerSession: null,
    degraded: false,
    degradedReason: null
  };
}

export async function getBlogAnalyticsSummary(days = 7): Promise<BlogAnalyticsSummary> {
  if (schemaUnavailable) {
    return {
      ...toSummaryFromRows(
        [...fallbackEvents.values()].map((event) => ({
          event_name: event.name,
          slug: event.properties.slug
        }))
      ),
      degraded: true,
      degradedReason: 'blog_events_schema_unavailable'
    };
  }

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('blog_events')
    .select('event_name, slug')
    .gte('occurred_at', from);

  if (error) {
    if (isSchemaMissingError(error)) {
      schemaUnavailable = true;
      logger.warn({ error }, 'Supabase blog_events schema missing while reading summary.');
      return {
        ...toSummaryFromRows(
        [...fallbackEvents.values()].map((event) => ({
          event_name: event.name,
          slug: event.properties.slug
        }))
      ),
        degraded: true,
        degradedReason: 'blog_events_schema_unavailable'
      };
    }

    logger.error({ error }, 'Failed to read blog analytics summary');
    return {
      events: 0,
      topLandingSlugs: [],
      relatedClickRate: null,
      blogToSearchCtr: null,
      assistedConversionClicks: 0,
      pagesPerSession: null,
      degraded: true,
      degradedReason: 'blog_events_query_failed'
    };
  }

  return toSummaryFromRows(data ?? []);
}
