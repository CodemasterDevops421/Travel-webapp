/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const OUTPUT_PATH = path.join(process.cwd(), '.planning', 'artifacts', 'phase-12', 'conversion-attribution.json');

function round(value) {
  return Math.round(value * 100) / 100;
}

function buildSummary(rows) {
  const blogViews = rows.filter((row) => row.event_name === 'blog_post_view');
  const ctaClicks = rows.filter((row) => row.event_name === 'blog_cta_click');
  const relatedClicks = rows.filter((row) => row.event_name === 'blog_related_click');

  const bySlug = new Map();
  const byCategory = new Map();
  const byTag = new Map();
  const byPosition = new Map();
  const byVariant = new Map();

  const apply = (map, key, type) => {
    if (!key) return;
    const current = map.get(key) ?? { views: 0, ctaClicks: 0, relatedClicks: 0 };
    if (type === 'view') current.views += 1;
    if (type === 'cta') current.ctaClicks += 1;
    if (type === 'related') current.relatedClicks += 1;
    map.set(key, current);
  };

  for (const row of rows) {
    const type =
      row.event_name === 'blog_post_view' ? 'view' :
        row.event_name === 'blog_cta_click' ? 'cta' :
          row.event_name === 'blog_related_click' ? 'related' : null;
    if (!type) continue;
    apply(bySlug, row.slug, type);
    apply(byCategory, row.category, type);
    apply(byTag, row.tag, type);
    apply(byPosition, row.position == null ? null : String(row.position), type);
    if (row.event_name === 'blog_cta_click') {
      apply(byVariant, row.cta_variant ?? 'unknown', 'cta');
    }
    if (row.event_name === 'blog_post_view') {
      apply(byVariant, row.cta_variant ?? 'unknown', 'view');
    }
  }

  const toArray = (map, keyName) => [...map.entries()].map(([key, value]) => ({
    [keyName]: key,
    ...value,
    blogToSearchCtr: value.views > 0 ? round((value.ctaClicks / value.views) * 100) : null
  }));

  return {
    generatedAt: new Date().toISOString(),
    window: '7d',
    totals: {
      blogPostViews: blogViews.length,
      ctaClicks: ctaClicks.length,
      relatedClicks: relatedClicks.length,
      blogToSearchCtr: blogViews.length > 0 ? round((ctaClicks.length / blogViews.length) * 100) : null,
      assistedConversionClicks: ctaClicks.length
    },
    attribution: {
      bySlug: toArray(bySlug, 'slug').sort((a, b) => b.ctaClicks - a.ctaClicks),
      byCategory: toArray(byCategory, 'category').sort((a, b) => b.ctaClicks - a.ctaClicks),
      byTag: toArray(byTag, 'tag').sort((a, b) => b.ctaClicks - a.ctaClicks),
      byPosition: toArray(byPosition, 'position').sort((a, b) => b.ctaClicks - a.ctaClicks),
      byVariant: toArray(byVariant, 'variant').sort((a, b) => b.ctaClicks - a.ctaClicks)
    }
  };
}

async function fetchRows() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('example.supabase.co') || supabaseServiceKey.includes('placeholder')) {
    return { rows: [], degraded: true, degradedReason: 'supabase_credentials_unavailable' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('blog_events')
    .select('event_name,slug,category,tag,position,cta_variant,cta_intent,occurred_at')
    .gte('occurred_at', from);

  if (error) {
    return { rows: [], degraded: true, degradedReason: 'blog_events_query_failed' };
  }
  return { rows: data ?? [], degraded: false, degradedReason: null };
}

async function run() {
  const { rows, degraded, degradedReason } = await fetchRows();
  const report = buildSummary(rows);
  report.degraded = degraded;
  report.degradedReason = degradedReason;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`CONVERSION_ATTRIBUTION_PATH=${OUTPUT_PATH}`);
  console.log(`CONVERSION_ATTRIBUTION_ROWS=${rows.length}`);
}

run().catch((error) => {
  console.error('CONVERSION_ATTRIBUTION_ERROR:', error.message);
  process.exitCode = 1;
});
