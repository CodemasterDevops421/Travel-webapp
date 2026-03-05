import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog');
const CMS_POSTS_FILE = path.join(process.cwd(), 'content', 'cms', 'posts.json');
const REDIRECTS_FILE = path.join(process.cwd(), 'content', 'blog-redirects.json');
export const BLOG_PAGE_SIZE = 12;
const READING_WPM = 220;
const MIN_WORD_COUNT = 70;
const CONTENT_SOURCE = process.env.BLOG_CONTENT_SOURCE?.toLowerCase() === 'cms' ? 'cms' : 'mdx';
const dateValueSchema = z
  .union([z.string(), z.date()])
  .transform((value) => (typeof value === 'string' ? value : value.toISOString().slice(0, 10)));

const frontmatterSchema = z.object({
  slug: z.string().min(3),
  title: z.string().min(10).max(90),
  description: z.string().min(40).max(160),
  publishedAt: dateValueSchema,
  updatedAt: dateValueSchema,
  author: z.string().min(2),
  category: z.string().min(2),
  tags: z.array(z.string().min(2)).min(1),
  coverImage: z.string().url(),
  canonicalUrl: z.string().url().optional(),
  noindex: z.boolean().optional(),
  featured: z.boolean().optional()
});

const cmsPostSchema = frontmatterSchema.extend({
  content: z.string().min(1),
  status: z.enum(['draft', 'review', 'scheduled', 'published']).default('published'),
  scheduledFor: dateValueSchema.optional()
});

export type BlogFrontmatter = z.infer<typeof frontmatterSchema>;

export type BlogHeading = {
  id: string;
  level: 2 | 3;
  text: string;
};

export type BlogPostSummary = BlogFrontmatter & {
  readingTime: string;
  wordCount: number;
};

export type BlogPost = BlogPostSummary & {
  content: string;
  headings: BlogHeading[];
};

export type BlogPostStatus = z.infer<typeof cmsPostSchema>['status'];

export function validateBlogFrontmatter(frontmatter: unknown): BlogFrontmatter {
  return frontmatterSchema.parse(frontmatter);
}

type RedirectMap = Record<string, string>;

function isValidDate(value: string): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp);
}

function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readingTimeFromWords(words: number): string {
  const minutes = Math.max(1, Math.ceil(words / READING_WPM));
  return `${minutes} min read`;
}

function extractHeadings(markdown: string): BlogHeading[] {
  const headings: BlogHeading[] = [];
  const lines = markdown.split('\n');
  const counts = new Map<string, number>();

  for (const line of lines) {
    const match = /^(##|###)\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const level = match[1] === '##' ? 2 : 3;
    const text = match[2].trim();
    const baseId = toKebabCase(text);
    const count = counts.get(baseId) ?? 0;
    counts.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    headings.push({ id, level, text });
  }

  return headings;
}

function parsePost(filename: string, rawSource: string): BlogPost {
  const parsed = matter(rawSource);
  const validated = validateBlogFrontmatter(parsed.data);

  if (!isValidDate(validated.publishedAt) || !isValidDate(validated.updatedAt)) {
    throw new Error(`Invalid date in ${filename}. Use YYYY-MM-DD format.`);
  }

  const markdown = parsed.content.trim();
  const wordCount = stripMarkdown(markdown).split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORD_COUNT) {
    throw new Error(`Post ${validated.slug} is too short. Minimum ${MIN_WORD_COUNT} words required.`);
  }

  return {
    ...validated,
    readingTime: readingTimeFromWords(wordCount),
    wordCount,
    content: markdown,
    headings: extractHeadings(markdown)
  };
}

function parseCmsPost(record: unknown): BlogPost {
  const parsed = cmsPostSchema.parse(record);
  const markdown = parsed.content.trim();
  const wordCount = stripMarkdown(markdown).split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORD_COUNT) {
    throw new Error(`CMS post ${parsed.slug} is too short. Minimum ${MIN_WORD_COUNT} words required.`);
  }

  return {
    slug: parsed.slug,
    title: parsed.title,
    description: parsed.description,
    publishedAt: parsed.publishedAt,
    updatedAt: parsed.updatedAt,
    author: parsed.author,
    category: parsed.category,
    tags: parsed.tags,
    coverImage: parsed.coverImage,
    canonicalUrl: parsed.canonicalUrl,
    noindex: parsed.noindex,
    featured: parsed.featured,
    readingTime: readingTimeFromWords(wordCount),
    wordCount,
    content: markdown,
    headings: extractHeadings(markdown)
  };
}

async function loadPostFiles(): Promise<string[]> {
  const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
    .map((entry) => entry.name);
}

async function loadCmsPosts(includeUnpublished = false): Promise<BlogPost[]> {
  try {
    const raw = await fs.readFile(CMS_POSTS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown[];
    const now = Date.now();
    const posts = parsed
      .map((record) => cmsPostSchema.parse(record))
      .filter((record) => {
        if (includeUnpublished) return true;
        if (record.status === 'published') return true;
        if (record.status === 'scheduled' && record.scheduledFor) {
          return new Date(record.scheduledFor).getTime() <= now;
        }
        return false;
      })
      .map((record) => parseCmsPost(record));
    return posts;
  } catch {
    return [];
  }
}

async function loadRedirectMap(): Promise<RedirectMap> {
  try {
    const raw = await fs.readFile(REDIRECTS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as RedirectMap;
    return parsed;
  } catch {
    return {};
  }
}

async function loadPostsUnsorted(): Promise<BlogPost[]> {
  if (CONTENT_SOURCE === 'cms') {
    const cmsPosts = await loadCmsPosts(false);
    if (cmsPosts.length > 0) {
      return cmsPosts;
    }
  }

  const files = await loadPostFiles();
  const posts = await Promise.all(
    files.map(async (file) => {
      const source = await fs.readFile(path.join(POSTS_DIR, file), 'utf8');
      return parsePost(file, source);
    })
  );

  const slugSet = new Set<string>();
  for (const post of posts) {
    if (slugSet.has(post.slug)) {
      throw new Error(`Duplicate slug detected: ${post.slug}`);
    }
    slugSet.add(post.slug);
  }

  return posts;
}

async function loadPostsUnsortedWithPreview(): Promise<BlogPost[]> {
  if (CONTENT_SOURCE === 'cms') {
    const cmsPosts = await loadCmsPosts(true);
    if (cmsPosts.length > 0) {
      return cmsPosts;
    }
  }
  return loadPostsUnsorted();
}

function sortByUpdatedThenPublished(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((left, right) => {
    const updatedDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (updatedDiff !== 0) return updatedDiff;
    return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
  });
}

function toSummary(post: BlogPost): BlogPostSummary {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    author: post.author,
    category: post.category,
    tags: post.tags,
    coverImage: post.coverImage,
    canonicalUrl: post.canonicalUrl,
    noindex: post.noindex,
    featured: post.featured,
    readingTime: post.readingTime,
    wordCount: post.wordCount
  };
}

function scoreRelated(source: BlogPost, candidate: BlogPost): number {
  let score = 0;
  if (source.category === candidate.category) {
    score += 30;
  }
  const sourceTags = new Set(source.tags.map((tag) => tag.toLowerCase()));
  for (const tag of candidate.tags) {
    if (sourceTags.has(tag.toLowerCase())) {
      score += 10;
    }
  }
  score += Math.max(0, 5 - Math.abs(new Date(source.publishedAt).getFullYear() - new Date(candidate.publishedAt).getFullYear()));
  return score;
}

function searchScore(post: BlogPost, query: string): number {
  const q = query.toLowerCase();
  const title = post.title.toLowerCase();
  const description = post.description.toLowerCase();
  const category = post.category.toLowerCase();
  const tags = post.tags.join(' ').toLowerCase();
  const body = post.content.toLowerCase();

  let score = 0;
  if (title.includes(q)) score += 50;
  if (description.includes(q)) score += 30;
  if (category.includes(q)) score += 20;
  if (tags.includes(q)) score += 15;
  if (body.includes(q)) score += 5;
  return score;
}

export async function getAllPosts(): Promise<BlogPostSummary[]> {
  const posts = await loadPostsUnsorted();
  return sortByUpdatedThenPublished(posts).map(toSummary);
}

export async function getPostBySlug(slug: string, options?: { includeUnpublished?: boolean }): Promise<BlogPost | undefined> {
  const posts = options?.includeUnpublished ? await loadPostsUnsortedWithPreview() : await loadPostsUnsorted();
  return posts.find((post) => post.slug === slug);
}

export async function getPostsByTag(tag: string): Promise<BlogPostSummary[]> {
  const lowerTag = tag.toLowerCase();
  const posts = await loadPostsUnsorted();
  return sortByUpdatedThenPublished(posts)
    .filter((post) => post.tags.some((currentTag) => currentTag.toLowerCase() === lowerTag))
    .map(toSummary);
}

export async function getPostsByCategory(category: string): Promise<BlogPostSummary[]> {
  const lowerCategory = category.toLowerCase();
  const posts = await loadPostsUnsorted();
  return sortByUpdatedThenPublished(posts)
    .filter((post) => post.category.toLowerCase() === lowerCategory)
    .map(toSummary);
}

export async function getRelatedPosts(slug: string, limit = 3): Promise<BlogPostSummary[]> {
  const posts = await loadPostsUnsorted();
  const source = posts.find((post) => post.slug === slug);
  if (!source) return [];

  return posts
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      score: scoreRelated(source, post)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.post.publishedAt).getTime() - new Date(left.post.publishedAt).getTime();
    })
    .slice(0, limit)
    .map((entry) => toSummary(entry.post));
}

export async function searchPosts(query: string): Promise<BlogPostSummary[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const posts = await loadPostsUnsorted();

  return posts
    .map((post) => ({
      post,
      score: searchScore(post, normalized)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.post.publishedAt).getTime() - new Date(left.post.publishedAt).getTime();
    })
    .map((entry) => toSummary(entry.post));
}

export async function getAllTags(): Promise<string[]> {
  const posts = await loadPostsUnsorted();
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tags.add(tag);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export async function getAllCategories(): Promise<string[]> {
  const posts = await loadPostsUnsorted();
  const categories = new Set(posts.map((post) => post.category));
  return [...categories].sort((a, b) => a.localeCompare(b));
}

export async function getFeaturedPost(): Promise<BlogPostSummary | undefined> {
  const posts = await loadPostsUnsorted();
  const sorted = sortByUpdatedThenPublished(posts);
  const featured = sorted.find((post) => post.featured);
  return featured ? toSummary(featured) : toSummary(sorted[0]);
}

export async function getRedirectForSlug(slug: string): Promise<string | undefined> {
  const redirects = await loadRedirectMap();
  return redirects[slug];
}

export function slugToParam(value: string): string {
  return toKebabCase(value);
}
