/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const {
  loadBlogPosts,
  extractBlogLinks,
  buildRecommendedLinks
} = require('./lib/blog-content-utils');

const OUTPUT_PATH = path.join(process.cwd(), '.planning', 'artifacts', 'phase-11', 'link-integrity.json');

function run() {
  const posts = loadBlogPosts();
  const slugs = new Set(posts.map((post) => post.slug));

  const invalidMarkdownLinks = [];
  const recommendationSummary = [];

  for (const post of posts) {
    const markdownLinks = extractBlogLinks(post.content);
    for (const targetSlug of markdownLinks) {
      if (!slugs.has(targetSlug)) {
        invalidMarkdownLinks.push({
          slug: post.slug,
          missingTarget: targetSlug
        });
      }
    }

    const recommendations = buildRecommendedLinks(post, posts);
    recommendationSummary.push({
      slug: post.slug,
      recommendedSlugs: recommendations,
      recommendationCount: recommendations.length
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    checkedPosts: posts.length,
    invalidMarkdownLinkCount: invalidMarkdownLinks.length,
    invalidMarkdownLinks,
    recommendationSummary
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`LINK_INTEGRITY_REPORT_PATH=${OUTPUT_PATH}`);

  if (invalidMarkdownLinks.length > 0) {
    console.error(`LINK_INTEGRITY_FAILED=${invalidMarkdownLinks.length}`);
    process.exit(2);
  }

  console.log('LINK_INTEGRITY_RESULT=PASS');
}

run();
