# 🏨 Hostel Stays — Hotel Booking Platform

> **Same Stays. Better Prices.** — A modern hotel booking website where travelers search 2M+ hotels worldwide, compare rates, and book securely.

---

## 📖 Documentation

| Document | Who It's For | What It Covers |
|----------|-------------|----------------|
| **[Product Overview](docs/PRODUCT_OVERVIEW.md)** | Everyone | What the product is, key features, how it works, current status |
| **[What's Built](docs/WHATS_BUILT.md)** | Everyone | Detailed inventory of every feature and system, in plain English |
| **[Next Phase Roadmap](docs/NEXT_PHASE_ROADMAP.md)** | Everyone | What's coming next, timeline estimates, future vision |
| **[DB Runbook](docs/DB_RUNBOOK.md)** | Developers | Database setup, migrations, and health checks |
| **[Production Readiness Audit](PRODUCTION_READINESS_AUDIT.md)** | Developers | Security and reliability assessment |
| **[Implementation Guide](IMPLEMENTATION.md)** | Developers | Tech stack, verification commands, CI/CD setup |

---

## ✨ Features at a Glance

- 🔍 **Search** — Destination autocomplete, date range, guest selection, filter & sort
- 🏨 **Hotel Details** — Photo gallery, amenities, room rates, reviews, interactive map
- 🤖 **AI Assistant** — Chatbot concierge + hotel-specific Q&A
- 💳 **Secure Checkout** — 3-step flow with Stripe payments & signed price quotes
- 🔐 **Auth** — Email/password + Google OAuth with protected routes
- 📊 **Admin Panel** — Commission controls, sandbox/production mode toggle
- 📧 **Notifications** — Automated booking confirmation and cancellation emails
- 📱 **Responsive** — Works on desktop, tablet, and mobile

---

## 🚀 Quick Start (For Developers)

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
# 1. Clone and install
git clone <repo-url>
cd Travel-webapp
cp .env.example .env.local
npm ci

# 2. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Key Commands

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Check code quality |
| `npm run typecheck` | Check for type errors |
| `npm run test` | Run automated tests |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Frontend** | React 19, Tailwind CSS, Framer Motion |
| **State** | Zustand, React Query |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email + Google OAuth) |
| **Payments** | Stripe |
| **Hotels API** | LiteAPI (2M+ hotels) |
| **Caching** | Upstash Redis |
| **Monitoring** | Sentry (optional) |
| **AI** | OpenAI (optional concierge) |
| **Testing** | Vitest + Testing Library |
| **Deployment** | Vercel |

---

## 🔐 Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys:

| Variable | Required | Purpose |
|----------|----------|---------|
| `LITEAPI_API_KEY` | Yes | Hotel data provider API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin key (server only) |
| `STRIPE_SECRET_KEY` | Yes | Stripe payment processing |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook verification |
| `QUOTE_SIGNING_SECRET` | Yes | Price quote tamper protection |
| `UPSTASH_REDIS_REST_URL` | Recommended | Caching & rate limiting |
| `OPENAI_API_KEY` | Optional | AI concierge feature |
| `SENTRY_DSN` | Optional | Error monitoring |

See [`.env.example`](.env.example) for the complete list with descriptions.

---

## 📁 Project Structure

```
src/
├── app/           → Pages & API routes
├── components/    → Reusable UI components
├── features/      → Feature modules (search, booking, hotels, AI)
├── server/        → Backend logic (LiteAPI, payments, booking, auth)
├── shared/        → Shared utilities & types
└── middleware.ts   → Security headers & route protection
```

---

## 📅 Project Status

| Phase | Status |
|-------|--------|
| ✅ Phase 1 — Platform Foundation & Security | Complete |
| ✅ Phase 2 — Search & Discovery | Complete |
| ✅ Phase 3 — Hotel Details & User Workspace | Complete |
| ✅ Phase 4 — Checkout & Booking Lifecycle | Complete |
| 🔜 Phase 5 — Admin, Monetization & Launch | Up Next |

**See [Next Phase Roadmap](docs/NEXT_PHASE_ROADMAP.md)** for full details on what's coming.

---

## 📝 Additional Resources

- **Planning docs:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`
- **API collection:** `lite_api.postman_collection.json` (import into Postman)
- **Database migrations:** `supabase/migrations/`
- **Docker:** `Dockerfile` and `docker-compose.yml` available for containerized deployment
