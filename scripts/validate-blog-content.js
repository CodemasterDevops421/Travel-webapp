/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');
const MIN_WORD_COUNT = 70;

function fail(message) {
  console.error(`BLOG_VALIDATION_ERROR: ${message}`);
  process.exitCode = 1;
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

function validate() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fail('content/blog directory does not exist');
    return;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith('.mdx'));
  const slugs = new Set();
  const canonicals = new Set();

  for (const file of files) {
    const fullPath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data ?? {};
    const required = ['slug', 'title', 'description', 'publishedAt', 'updatedAt', 'author', 'category', 'coverImage'];

    for (const key of required) {
      if (!data[key]) fail(`${file}: missing required field "${key}"`);
    }

    if (!Array.isArray(data.tags) || data.tags.length === 0) {
      fail(`${file}: tags must be a non-empty array`);
    }

    if (typeof data.title === 'string' && (data.title.length < 10 || data.title.length > 90)) {
      fail(`${file}: title must be between 10 and 90 characters`);
    }

    if (typeof data.description === 'string' && (data.description.length < 40 || data.description.length > 160)) {
      fail(`${file}: description must be between 40 and 160 characters`);
    }

    if (typeof data.slug === 'string') {
      if (slugs.has(data.slug)) {
        fail(`${file}: duplicate slug "${data.slug}"`);
      }
      slugs.add(data.slug);
    }

    if (typeof data.canonicalUrl === 'string') {
      if (canonicals.has(data.canonicalUrl)) {
        fail(`${file}: duplicate canonicalUrl "${data.canonicalUrl}"`);
      }
      canonicals.add(data.canonicalUrl);
    }

    const words = wordCount(parsed.content);
    if (words < MIN_WORD_COUNT) {
      fail(`${file}: content too short (${words} words), minimum is ${MIN_WORD_COUNT}`);
    }
  }

  if (!process.exitCode) {
    console.log(`Blog content validation passed for ${files.length} posts.`);
  }
}

validate();
