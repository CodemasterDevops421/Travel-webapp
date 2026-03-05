/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const {
  loadBlogPosts,
  extractBlogLinks,
  buildRecommendedLinks
} = require('./lib/blog-content-utils');

const OUTPUT_PATH = path.join(process.cwd(), '.planning', 'artifacts', 'phase-11', 'refresh-queue.json');
const STALE_DAYS = 120;

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function run() {
  const posts = loadBlogPosts();

  const queue = posts
    .map((post) => {
      const ageDays = daysSince(post.updatedAt);
      const markdownLinks = extractBlogLinks(post.content);
      const recommended = buildRecommendedLinks(post, posts);
      const reasons = [];
      let score = 0;

      if (ageDays >= STALE_DAYS) {
        reasons.push(`stale_${ageDays}d`);
        score += Math.min(60, Math.floor(ageDays / 4));
      }
      if (post.words < 140) {
        reasons.push(`thin_content_${post.words}w`);
        score += 25;
      }
      if (markdownLinks.length === 0 && recommended.length > 0) {
        reasons.push('missing_internal_links');
        score += 20;
      }

      return {
        slug: post.slug,
        title: post.title,
        updatedAt: post.updatedAt,
        ageDays,
        words: post.words,
        score,
        reasons
      };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => b.score - a.score || b.ageDays - a.ageDays || a.slug.localeCompare(b.slug));

  const report = {
    generatedAt: new Date().toISOString(),
    staleThresholdDays: STALE_DAYS,
    queueLength: queue.length,
    queue
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`REFRESH_QUEUE_PATH=${OUTPUT_PATH}`);
  console.log(`REFRESH_QUEUE_COUNT=${queue.length}`);
}

run();
