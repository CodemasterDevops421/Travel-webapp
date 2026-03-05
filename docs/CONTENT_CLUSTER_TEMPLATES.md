# Content Cluster Templates

## Objective
Provide repeatable templates for high-quality hub/supporting content that scales production while preserving internal-link quality.

## Cluster Model
- **Hub page**: broad intent, category anchor, links to all supporting pages.
- **Supporting page**: narrow intent, references hub + at least one related supporting page.

## Hub Template (Outline)
1. Problem framing and audience intent.
2. Decision framework / comparison matrix.
3. Deep-link section to supporting guides.
4. CTA into booking/search flow.

## Supporting Template (Outline)
1. Specific scenario and constraints.
2. Action checklist and examples.
3. Link back to hub context.
4. Related supporting links (2-3).

## Internal Linking Policy
- Include at least one `/blog/` internal link when a related page exists.
- Prefer same-category links first, then shared-tag links.
- Never include broken or self-referential links.
- Validate with `npm run blog:links:check`.

## Freshness Workflow
1. Generate queue: `npm run blog:refresh:queue`
2. Prioritize by score and reason tags.
3. Update posts and rerun queue + link checks.
4. Track weekly in editorial standup.

## QA Commands
- `npm run blog:clusters:report`
- `npm run blog:links:check`
- `npm run blog:refresh:queue`
- `npm run blog:scale:verify`
