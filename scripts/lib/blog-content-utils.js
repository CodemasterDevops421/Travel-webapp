const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(markdown) {
  if (!markdown?.trim()) return 0;
  return stripMarkdown(markdown).split(' ').filter(Boolean).length;
}

function loadBlogPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith('.mdx')).sort();
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const parsed = matter(raw);
    return {
      file,
      slug: parsed.data.slug,
      title: parsed.data.title,
      category: parsed.data.category,
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
      publishedAt: parsed.data.publishedAt,
      updatedAt: parsed.data.updatedAt,
      content: String(parsed.content ?? '').trim(),
      words: wordCount(parsed.content ?? '')
    };
  });
}

function buildClusterReport(posts) {
  const grouped = new Map();
  for (const post of posts) {
    const key = String(post.category ?? 'uncategorized');
    const current = grouped.get(key) ?? [];
    current.push(post);
    grouped.set(key, current);
  }

  const clusters = [...grouped.entries()].map(([category, items]) => {
    const sorted = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const hub = sorted[0];
    const supporting = sorted.slice(1).map((post) => post.slug);
    return {
      category,
      hubSlug: hub?.slug ?? null,
      supportingSlugs: supporting,
      totalPosts: sorted.length
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    clusterCount: clusters.length,
    clusters
  };
}

function extractBlogLinks(markdown) {
  const links = [];
  const regex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match = regex.exec(markdown);
  while (match) {
    const target = match[1] ?? '';
    if (target.startsWith('/blog/')) {
      links.push(target.replace(/^\/blog\//, '').split('?')[0].split('#')[0]);
    }
    match = regex.exec(markdown);
  }
  return links;
}

function buildRecommendedLinks(post, posts) {
  const tagSet = new Set(post.tags.map((tag) => String(tag).toLowerCase()));
  const score = (candidate) => {
    let value = 0;
    if (candidate.category === post.category) value += 100;
    for (const tag of candidate.tags) {
      if (tagSet.has(String(tag).toLowerCase())) value += 20;
    }
    return value;
  };

  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({ slug: candidate.slug, score: score(candidate) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, 3)
    .map((candidate) => candidate.slug);
}

module.exports = {
  loadBlogPosts,
  buildClusterReport,
  extractBlogLinks,
  buildRecommendedLinks
};
