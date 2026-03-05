# 📋 What's Built — Complete Feature Inventory

> A detailed breakdown of everything that has been built in the Hostel Stays platform, written so that anyone can understand — no coding knowledge required.

---

## 🖥️ Pages & Screens (What Users See)

### 1. Homepage (`/`)
The landing page that greets visitors. It includes:
- **Hero banner** with a beautiful background image and the tagline "Same Stays. Better Prices."
- **Search bar** overlapping the hero — type a destination, pick dates, select guests, and hit search
- **Trust badges** — "Verified Rates", "Transparent Pricing", "Secure Checkout"
- **Featured deals strip** — highlights popular deals
- **Trending destinations** — curated destination suggestions
- **Mood discovery** — browse hotels by vibe (romantic, adventure, party, etc.)
- **Travel articles** — content section with travel tips
- **Newsletter signup** — email subscription bar

### 2. Search Results (`/search` and `/stays/[destination]`)
Where travelers browse hotel options after searching:
- **Hotel cards** — each showing a photo, name, star rating, price per night, and overall score
- **Filters panel** — narrow results by price range, star rating, amenities, and property type
- **Sorting options** — sort by price (low to high, high to low), rating, or popularity
- **Map view toggle** — switch between a list view and a split map+list view
- **Loading states** — skeleton placeholders appear while data loads
- **Degraded state messages** — if the hotel provider is slow or down, users see honest messaging instead of broken pages

### 3. Hotel Detail Page (`/hotels/[hotelId]`)
A rich page dedicated to a single hotel showing:
- **Photo gallery** — grid of images with a full-screen lightbox
- **Overview tab** — description, star rating, address, check-in/out times
- **Amenities/Facilities tab** — what the hotel offers (Wi-Fi, pool, parking, etc.)
- **Rooms & Rates tab** — all available room types with prices, bed configs, and cancellation policies
- **Reviews tab** — real guest review scores and comment summaries
- **Location map** — interactive map showing the hotel's location
- **Ask AI panel** — type a question like "Does this hotel have free parking?" and get an instant answer
- **Sticky booking card** — a sidebar that stays visible as you scroll, showing your selected room and a "Reserve" button
- **SEO data** — structured data (JSON-LD) so Google can display rich hotel info in search results

### 4. Booking / Checkout (`/booking`)
The secure checkout flow:
- **Step 1: Guest Details** — name, email, phone, special requests
- **Step 2: Payment** — Stripe's secure payment form (credit/debit card)
- **Step 3: Confirmation** — success screen with booking summary
- **Price lock** — the quoted price is cryptographically signed so it can't change during checkout
- **Progress persistence** — if you refresh or go back, your progress is saved

### 5. Booking Confirmation (`/bookings/[bookingId]`)
After booking, users land here via a secure, time-limited link:
- **Booking summary** — hotel name, dates, room type, total cost
- **Status indicator** — pending, confirmed, cancelled, or refunded
- **Cancellation option** — button to cancel the booking (refund depends on the hotel's cancellation policy)

### 6. Authentication Pages (`/auth/login`, `/auth/signup`, `/auth/callback`)
- **Login page** — email/password login plus "Sign in with Google" button
- **Signup page** — create a new account
- **OAuth callback** — handles the Google sign-in redirect securely

### 7. Admin Panel (`/admin`)
For operators and business owners (requires admin privileges):
- **Commission control** — set the markup percentage on each booking
- **Mode toggle** — switch between sandbox (testing) and production (live) mode
- **Booking visibility** — view recent bookings and their statuses

---

## ⚙️ Backend Systems (What Powers the App Behind the Scenes)

### Hotel Data Engine
- **LiteAPI integration** — calls the hotel data provider for search results, hotel details, room rates, pre-booking checks, and final booking
- **Data normalization** — the raw hotel data from LiteAPI is cleaned, structured, and made consistent before showing it to users
- **Fallback handling** — if the hotel provider is slow or returns partial data, the system handles it gracefully instead of crashing

### Booking System
- **Pre-booking ("prebook")** — before checkout, the system verifies the selected room is still available and locks in the price
- **Quote signing** — each price quote is cryptographically signed to prevent tampering
- **Booking finalization** — after payment, the booking is formally created with the hotel provider
- **Booking lifecycle tracking** — every booking goes through defined states: `pending` → `payment_authorized` → `confirmed` (or `failed` / `refunded`)
- **Idempotency** — if a booking request is accidentally sent twice (e.g., user double-clicks), only one booking is created
- **Booking storage** — all bookings and quotes are saved in the Supabase database

### Payment Processing
- **Stripe integration** — credit/debit card processing with PCI compliance
- **Webhook handling** — Stripe sends automatic notifications about payment status changes (confirmed, refunded, failed), and the system processes these securely
- **Refund support** — when a booking is cancelled with an eligible cancellation policy, refunds are processed through Stripe

### Email Notifications
- **Confirmation emails** — sent automatically when a booking is confirmed
- **Cancellation emails** — sent when a booking is cancelled
- **HTML templates** — professionally designed email templates
- **Outbox pattern** — ensures each email is sent exactly once, even if webhooks are replayed

### Webhook System
- **Stripe webhooks** — receives payment-related events (payment confirmed, refunded, failed)
- **LiteAPI webhooks** — receives booking status updates from the hotel provider
- **Signature verification** — every incoming webhook is verified to prevent spoofing
- **Idempotency** — duplicate webhook events are safely ignored
- **Two-phase dedup** — prevents the same event from being processed twice, even under heavy load

### Caching & Performance
- **Redis caching** — search results, hotel details, and autocomplete suggestions are cached to reduce load times
- **Rate limiting** — prevents abuse by limiting how many requests a single user can make (30 per minute)
- **Fallback behavior** — if the cache is unavailable, the system continues working (just a bit slower)

### User & Auth System
- **Supabase Auth** — handles user signup, login, session management, and password recovery
- **Google OAuth** — users can sign in with their Google account
- **Protected routes** — booking, wishlist, and admin pages require login; unauthenticated users are redirected to signup
- **Role-based access** — admin pages are restricted to users with admin or owner roles

### Security
- **Content Security Policy (CSP)** — restricts what external resources the page can load
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy
- **Input validation** — every piece of user input is checked and sanitized (using Zod validation)
- **CSRF protection** — prevents cross-site request forgery attacks on sensitive actions
- **Rate limiting** — throttles excessive requests to prevent abuse and DDoS
- **Signed tokens** — booking view pages and checkout sessions use cryptographic tokens

### Logging & Monitoring
- **Structured logging** — all important events are logged in a machine-readable format
- **Correlation IDs** — booking and webhook events can be traced end-to-end
- **Sentry integration** — (optional) automatic error tracking and alerting
- **Analytics funnel** — tracks user journey from search to booking for business intelligence

---

## 📊 Database (What's Stored)

| Table | What It Stores | Example Data |
|-------|---------------|--------------|
| **booking_quotes** | Price quotes generated during checkout | Hotel ID, room type, price, currency, guest count, expiration date |
| **bookings** | Completed booking records | Booking ID, hotel, guest name, dates, status, payment amount, commission |
| **booking_events** | Audit trail of status changes | "Booking confirmed", "Payment received", "Cancellation requested" |
| **admin_users** | Admin user directory | User ID, role (admin/owner) |
| **app_settings** | Global platform settings | Commission %, operating mode (sandbox/production) |
| **analytics_events** | User journey funnel events | Search performed, hotel viewed, booking started |

---

## 🧪 Automated Testing

The project includes **28+ test files** covering:

| Test Area | What's Tested |
|-----------|--------------|
| Booking routes | Pre-booking, finalization, cancellation, idempotency |
| Booking repository | Database save, update, query, lifecycle transitions |
| Stripe webhooks | Payment confirmation, refund, signature verification, dedup |
| Auth security | OAuth callback, login/signup redirects, admin access control |
| API security | Rate limiting, CSRF, input validation, regression checks |
| Search | Degraded state handling, URL state preservation, discovery queries |
| Hotel details | Content rendering, AI grounding, booking card |
| Environment | Config validation, strict mode enforcement |

**Testing is run with one command:** `npm test`

---

## 📦 Third-Party Tools Used

| Tool | What It Does | Why We Use It |
|------|-------------|---------------|
| **Next.js** | Web framework | Powers both the website pages and the backend APIs |
| **React** | UI library | Builds the interactive components users see |
| **Tailwind CSS** | Styling | Makes the design responsive and consistent |
| **Supabase** | Database + Auth | Stores data and manages user login/accounts |
| **Stripe** | Payments | Processes credit/debit card payments securely |
| **LiteAPI** | Hotel data | Provides access to 2M+ hotels worldwide |
| **Upstash Redis** | Caching | Speeds up searches and prevents abuse |
| **Framer Motion** | Animations | Smooth transitions and micro-animations |
| **Zustand** | State management | Keeps the UI state organized (filters, selections) |
| **React Query** | Data fetching | Manages API calls with caching and retries |
| **Zod** | Data validation | Ensures all inputs are safe and properly formatted |
| **Sentry** | Error monitoring | Catches and reports errors in production |
| **Pino** | Logging | Records structured logs for debugging |
| **Vitest** | Testing | Runs automated tests to catch bugs |
| **Leaflet** | Maps | Shows hotels on interactive maps |

---

## 📁 How the Code Is Organized

```
Travel-webapp/
├── src/
│   ├── app/              ← All the pages and API routes
│   │   ├── page.tsx          (Homepage)
│   │   ├── search/           (Search results page)
│   │   ├── stays/            (Destination-based listing pages)
│   │   ├── hotels/           (Hotel detail pages)
│   │   ├── booking/          (Checkout page)
│   │   ├── bookings/         (Booking confirmation page)
│   │   ├── auth/             (Login, signup, OAuth)
│   │   ├── admin/            (Admin panel)
│   │   └── api/              (All backend API endpoints)
│   ├── components/       ← Reusable UI building blocks
│   │   ├── home/             (Homepage sections: deals, trending, mood, articles)
│   │   ├── layout/           (Page layout: header, footer)
│   │   ├── navigation/       (Site navigation)
│   │   └── ui/               (Buttons, inputs, cards, modals)
│   ├── features/         ← Feature-specific code
│   │   ├── search/           (Search logic, hotel cards, filters)
│   │   ├── hotels/           (Hotel detail components)
│   │   ├── booking/          (Booking/checkout components)
│   │   └── ai/               (AI chatbot component)
│   ├── server/           ← Backend business logic
│   │   ├── liteapi.ts        (Hotel data provider integration)
│   │   ├── booking/          (Booking database, lifecycle, email outbox)
│   │   ├── payments/         (Stripe payment processing)
│   │   ├── notifications/    (Email sending)
│   │   └── ...               (Caching, security, logging, etc.)
│   └── middleware.ts     ← Security & auth checks on every page load
├── tests/                ← Automated tests
├── supabase/             ← Database setup files
├── docs/                 ← Documentation (this folder!)
└── .planning/            ← Project planning & roadmap files
```

---

## ⚠️ Known Limitations (As of 2026-03-04)

- **Occupancy contract confirmation pending:** checkout now uses indexed occupancies and valid guest names for each guest row, but LiteAPI `occupancyNumber` contract semantics should be explicitly re-verified with supplier docs/tests.

For detailed severity, evidence, and remediation guidance, see:
- `docs/CODE_REVIEW_2026-03-04.md`
