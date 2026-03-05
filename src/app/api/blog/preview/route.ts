import { NextRequest, NextResponse } from 'next/server';
import { getPostBySlug } from '@/features/blog/lib/content';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const slug = request.nextUrl.searchParams.get('slug');
  const previewToken = process.env.BLOG_PREVIEW_TOKEN;

  if (!previewToken || !token || token !== previewToken || !slug) {
    return NextResponse.json({ error: 'Invalid preview token' }, { status: 401 });
  }

  const post = await getPostBySlug(slug, { includeUnpublished: true });
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const destination = new URL(`/blog/${slug}?preview=1&previewToken=${encodeURIComponent(token)}`, request.url);
  return NextResponse.redirect(destination);
}
