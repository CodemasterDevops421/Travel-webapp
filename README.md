# LiteAPI Booking Webapp

Express + EJS booking flow using LiteAPI (server-side API calls only).

## Features
- Search hotels by **destination** (places autocomplete + rates)
- Search hotels by **vibe** (AI search)
- Hotel details page with offers grouped by room (`mappedRoomId`) and room image/name
- Checkout with guest details, then LiteAPI Payment SDK
- Booking confirmation with booking ID, confirmation code, and hotel details

## Setup
```bash
cp .env.example .env
npm install
npm run dev
```
Open http://localhost:3000

## Test
```bash
npm test
```

## Notes
- All LiteAPI calls are server-side to keep API key private.
- Sandbox card: `4242424242424242`, any 3-digit CVV, any future expiration date.
