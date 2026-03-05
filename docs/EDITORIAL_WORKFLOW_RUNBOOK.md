# Editorial Workflow Runbook

## Purpose
Operate blog publishing without code edits while preserving existing blog URL and DTO contracts.

## Configuration
- `BLOG_CONTENT_SOURCE=mdx|cms` (default: `mdx`)
- `BLOG_PREVIEW_TOKEN=<secure token>` for preview route validation

## Initial CMS Migration
1. Run `npm run cms:migrate`
2. Verify parity: `npm run cms:parity`
3. Switch source in environment: `BLOG_CONTENT_SOURCE=cms`
4. Re-run parity and blog tests before deployment.

## Draft / Review / Schedule / Publish
- Draft/review/scheduled posts are stored in `content/cms/posts.json` with `status` field.
- Scheduled publish command:
  - `npm run cms:publish:scheduled`
- This promotes due `scheduled` posts to `published` and updates `updatedAt`.

## Preview Flow
1. Generate preview URL:
   - `/api/blog/preview?token=<BLOG_PREVIEW_TOKEN>&slug=<post-slug>`
2. Valid token redirects to:
   - `/blog/<slug>?preview=1&previewToken=<BLOG_PREVIEW_TOKEN>`
3. Invalid token returns `401`.

## Rollback
1. Set `BLOG_CONTENT_SOURCE=mdx`
2. Deploy/restart app
3. Keep CMS data for later retry; route contracts remain unchanged.

## Verification Checklist
- `npm run cms:parity`
- `npm run blog:validate`
- `npm run test -- tests/blog-provider-parity.test.ts tests/blog-preview-route.test.ts tests/blog-seo.test.ts tests/sitemap.test.ts`
- `npm run build`
