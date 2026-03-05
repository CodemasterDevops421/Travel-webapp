/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const { createClient } = require('@supabase/supabase-js');

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');
const OUTPUT_DEFAULT = path.join(process.cwd(), '.planning', 'artifacts', 'phase-09', 'blog-kpi-weekly.json');

function getArgValue(name, fallback) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function getPostFiles() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith('.mdx'));
}

function wordCount(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

function buildReport() {
  const files = getPostFiles();
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const parsed = matter(raw);
    return {
      slug: parsed.data.slug,
      title: parsed.data.title,
      category: parsed.data.category,
      tags: parsed.data.tags ?? [],
      publishedAt: parsed.data.publishedAt,
      words: wordCount(parsed.content)
    };
  });

  const totalWords = posts.reduce((sum, post) => sum + post.words, 0);
  const categories = new Set(posts.map((post) => post.category).filter(Boolean));
  const tags = new Set(posts.flatMap((post) => post.tags).filter(Boolean));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyPublished = posts.filter((post) => String(post.publishedAt ?? '').startsWith(thisMonth)).length;

  const topLandingSlugs = [...posts]
    .sort((a, b) => b.words - a.words)
    .slice(0, 5)
    .map((post) => post.slug);

  return {
    posts,
    summary: {
      totalPosts: posts.length,
      totalWords,
      averageWordsPerPost: posts.length ? Math.round(totalWords / posts.length) : 0,
      categories: categories.size,
      uniqueTags: tags.size,
      publishedThisMonth: monthlyPublished,
      indexedUrls: posts.length,
      topLandingSlugs
    }
  };
}

async function loadEventKpis() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('example.supabase.co') || supabaseServiceKey.includes('placeholder')) {
    return {
      blogToSearchCtr: null,
      assistedConversionClicks: 0,
      pagesPerSession: null,
      relatedClickRate: null,
      degraded: true,
      degradedReason: 'supabase_credentials_unavailable'
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('blog_events')
    .select('event_name')
    .gte('occurred_at', from);

  if (error) {
    return {
      blogToSearchCtr: null,
      assistedConversionClicks: 0,
      pagesPerSession: null,
      relatedClickRate: null,
      degraded: true,
      degradedReason: 'blog_events_query_failed'
    };
  }

  const rows = data ?? [];
  const views = rows.filter((row) => row.event_name === 'blog_post_view').length;
  const cta = rows.filter((row) => row.event_name === 'blog_cta_click').length;
  const related = rows.filter((row) => row.event_name === 'blog_related_click').length;
  const round = (value) => Math.round(value * 100) / 100;

  return {
    blogToSearchCtr: views > 0 ? round((cta / views) * 100) : null,
    assistedConversionClicks: cta,
    pagesPerSession: null,
    relatedClickRate: views > 0 ? round((related / views) * 100) : null,
    degraded: false,
    degradedReason: null
  };
}

async function run() {
  const outputPath = getArgValue('--output', OUTPUT_DEFAULT);
  const base = buildReport();
  const eventKpis = await loadEventKpis();
  const output = {
    generatedAt: new Date().toISOString(),
    window: '7d',
    summary: base.summary,
    kpis: {
      indexedUrls: base.summary.indexedUrls,
      topLandingSlugs: base.summary.topLandingSlugs,
      blogToSearchCtr: eventKpis.blogToSearchCtr,
      assistedConversionClicks: eventKpis.assistedConversionClicks,
      pagesPerSession: eventKpis.pagesPerSession,
      relatedClickRate: eventKpis.relatedClickRate
    },
    degraded: eventKpis.degraded,
    degradedReason: eventKpis.degradedReason
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`KPI_REPORT_PATH=${outputPath}`);
  console.log(JSON.stringify(output, null, 2));
}

run().catch((error) => {
  console.error('BLOG_KPI_REPORT_ERROR:', error.message);
  process.exitCode = 1;
});
