# Experiment Governance

## Scope
Conversion experiments for blog CTA variants in Phase 12.

## Registry
- Artifact: `.planning/artifacts/phase-12/experiment-registry.json`
- Update command: `npm run blog:experiments:evaluate`

## Decision Thresholds
- Minimum evidence:
  - `views >= 50`
  - `ctaClicks >= 5`
- Decision policy:
  - `promote` when candidate CTR > control CTR and thresholds are met
  - `hold` when thresholds are met with no lift
  - `insufficient_evidence` otherwise

## Required Fields
- `id`, `name`, `controlVariant`, `candidateVariant`
- `views`, `ctaClicks`, `ctr`
- `decision`, `confidence`, `rationale`

## Cadence
1. Generate attribution report (`npm run blog:attribution:report`)
2. Evaluate experiments (`npm run blog:experiments:evaluate`)
3. Record outcomes in growth review notes
4. Apply CTA policy updates only when registry decision is `promote`

## Local Degraded Mode
When analytics credentials are unavailable locally, registry generation may use synthetic fallback evidence with explicit `source=synthetic_fallback`.
