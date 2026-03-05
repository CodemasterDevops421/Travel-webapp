/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const TARGET_FILE = path.join(process.cwd(), 'content', 'cms', 'posts.json');

function run() {
  if (!fs.existsSync(TARGET_FILE)) {
    console.error('CMS_SCHEDULE_ERROR: content/cms/posts.json not found');
    process.exit(1);
  }

  const raw = fs.readFileSync(TARGET_FILE, 'utf8');
  const posts = JSON.parse(raw);
  const now = Date.now();
  let published = 0;

  for (const post of posts) {
    if (post.status !== 'scheduled' || !post.scheduledFor) {
      continue;
    }
    const scheduledAt = new Date(post.scheduledFor).getTime();
    if (Number.isFinite(scheduledAt) && scheduledAt <= now) {
      post.status = 'published';
      post.updatedAt = new Date().toISOString().slice(0, 10);
      published += 1;
    }
  }

  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
  console.log(`CMS_SCHEDULE_PUBLISHED=${published}`);
}

run();
