/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');

const SOURCE_DIR = path.join(process.cwd(), 'content', 'blog');
const TARGET_FILE = path.join(process.cwd(), 'content', 'cms', 'posts.json');

function run() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('CMS_MIGRATE_ERROR: content/blog not found');
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_DIR).filter((file) => file.endsWith('.mdx')).sort();
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8');
    const parsed = matter(raw);
    return {
      ...parsed.data,
      status: 'published',
      content: String(parsed.content ?? '').trim()
    };
  });

  fs.mkdirSync(path.dirname(TARGET_FILE), { recursive: true });
  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
  console.log(`CMS_MIGRATE_OUTPUT=${TARGET_FILE}`);
  console.log(`CMS_MIGRATE_COUNT=${posts.length}`);
}

run();
