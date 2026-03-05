/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const MDX_DIR = path.join(process.cwd(), 'content', 'blog');
const CMS_FILE = path.join(process.cwd(), 'content', 'cms', 'posts.json');

function loadMdx() {
  const files = fs.readdirSync(MDX_DIR).filter((file) => file.endsWith('.mdx'));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(MDX_DIR, file), 'utf8');
    const parsed = matter(raw);
    return { slug: parsed.data.slug, canonicalUrl: parsed.data.canonicalUrl ?? `/blog/${parsed.data.slug}` };
  });
}

function loadCms() {
  const raw = fs.readFileSync(CMS_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.map((post) => ({ slug: post.slug, canonicalUrl: post.canonicalUrl ?? `/blog/${post.slug}` }));
}

function run() {
  if (!fs.existsSync(MDX_DIR) || !fs.existsSync(CMS_FILE)) {
    console.error('CMS_PARITY_ERROR: required source files missing');
    process.exit(1);
  }

  const mdx = loadMdx();
  const cms = loadCms();
  const cmsBySlug = new Map(cms.map((post) => [post.slug, post]));
  const missing = [];
  const canonicalMismatch = [];

  for (const post of mdx) {
    const cmsPost = cmsBySlug.get(post.slug);
    if (!cmsPost) {
      missing.push(post.slug);
      continue;
    }
    if (cmsPost.canonicalUrl !== post.canonicalUrl) {
      canonicalMismatch.push(post.slug);
    }
  }

  if (missing.length || canonicalMismatch.length) {
    console.error(`CMS_PARITY_MISSING=${missing.join(',') || 'none'}`);
    console.error(`CMS_PARITY_CANONICAL_MISMATCH=${canonicalMismatch.join(',') || 'none'}`);
    process.exit(2);
  }

  console.log(`CMS_PARITY_OK=${mdx.length}`);
}

run();
