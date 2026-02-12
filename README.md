# TravelForge OTA (LiteAPI + Next.js 15)

## Setup
```bash
cp .env.example .env
npm ci
npm run dev
```

## Commands
- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run build`

## Notes
- LiteAPI keys stay server-side only.
- Autocomplete route uses LiteAPI first and Google fallback for landmark/address-intent queries.
- Redis is optional; app falls back to in-memory cache/ratelimit in local development.
