# Performance Proof

Run the baseline benchmark harness against a running deployment:

```bash
npm run perf:proof
```

Optional runtime controls:

- `PERF_BASE_URL` (default `http://localhost:3000`)
- `PERF_CONCURRENCY` (default `8`)
- `PERF_ITERATIONS` (default `40`)
- `PERF_WARMUP` (default `5`)

Artifacts written:

- `docs/perf/baseline-latest.json`
- `docs/perf/PERFORMANCE_PROOF.md`

Gate expectations for launch:

- API p95 below `200ms` for cache-hot discovery endpoints
- API p99 below `350ms`
- Non-2xx status ratio below `1%` for benchmark runs
