import { getAllPosts } from '@/features/blog/lib/content';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await getAllPosts();
  const items = posts
    .slice(0, 50)
    .map((post) => {
      const url = `${appUrl}/blog/${post.slug}`;
      return `
<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(url)}</link>
  <guid>${escapeXml(url)}</guid>
  <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
  <description>${escapeXml(post.description)}</description>
</item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>TravelApp Blog</title>
  <link>${appUrl}/blog</link>
  <description>Travel guides, practical tips, and destination strategies.</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400'
    }
  });
}

