/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

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
  const categories = new Set(posts.map((post) => post.category));
  const tags = new Set(posts.flatMap((post) => post.tags));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyPublished = posts.filter((post) => String(post.publishedAt ?? '').startsWith(thisMonth)).length;

  const topLandingCandidates = [...posts]
    .sort((a, b) => b.words - a.words)
    .slice(0, 5)
    .map((post) => ({ slug: post.slug, title: post.title, words: post.words }));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalPosts: posts.length,
      totalWords,
      averageWordsPerPost: posts.length ? Math.round(totalWords / posts.length) : 0,
      categories: categories.size,
      uniqueTags: tags.size,
      publishedThisMonth: monthlyPublished
    },
    kpis: {
      indexedUrls: posts.length,
      topLandingCandidates,
      ctrProxy: 'Pending Search Console ingestion',
      assistedConversionClicks: 'Pending aggregation from blog analytics events'
    }
  };
}

const output = buildReport();
console.log(JSON.stringify(output, null, 2));

