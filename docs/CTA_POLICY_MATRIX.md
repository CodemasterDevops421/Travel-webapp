# CTA Policy Matrix

## Objective
Assign CTA variants deterministically by content intent so conversion experiments are stable and measurable.

## Intent Mapping
- `Booking Tips` -> `book_now`
- `Itineraries` -> `discover_destination`
- All other categories -> `explore_hotels`

## Variant Assignment
- Deterministic hash of `slug + position + intent`
- Variants:
  - `control`
  - `variant_a`
  - `variant_b`

## Placement Policy
- Position `1`: primary CTA (high-emphasis button)
- Position `2`: secondary CTA (outline button)

## Attribution Fields
All CTA click events should include:
- `slug`
- `category`
- `tag`
- `position`
- `referrerPath`
- `ctaVariant`
- `ctaIntent`
- `targetPath`

## Governance Rules
- Minimum evidence threshold:
  - `views >= 50`
  - `ctaClicks >= 5`
- Decision outcomes:
  - `promote` if candidate CTR > control CTR after threshold
  - `hold` if threshold met but no lift
  - `insufficient_evidence` otherwise

## Operational Commands
- `npm run blog:attribution:report`
- `npm run blog:experiments:evaluate`
