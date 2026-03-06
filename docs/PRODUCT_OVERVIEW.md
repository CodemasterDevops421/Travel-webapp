# 🏨 Hostel Stays — Product Overview

> **One-liner:** A modern hotel booking website where travelers search millions of hotels worldwide, compare rates, and book securely — all in one place.

---

## What Is This?

**Hostel Stays** (also referred to internally as "TravelForge OTA") is a **hotel booking website** similar to Booking.com or Expedia. It allows travelers to:

1. **Search** for hotels by destination, dates, and number of guests
2. **Browse** results with filters, sorting, and map views
3. **View** detailed hotel pages with photos, amenities, reviews, and room options
4. **Book** a room through a secure checkout with real-time pricing
5. **Receive** booking confirmations and manage their reservations

The platform is built as a **web application** that works on both desktop and mobile browsers.

---

## Who Is It For?

| Audience | What They Do |
|----------|-------------|
| **Travelers** | Search hotels, compare prices, book rooms, manage reservations |
| **Admin/Operators** | Monitor bookings, manage commission rates, control sandbox vs. production mode |

---

## Key Features — What's Already Built

### 🔍 Search & Discovery
- **Smart search bar** on the homepage — type a city, pick dates, select number of guests
- **Autocomplete** — suggests destinations as you type
- **Search results page** — shows hotel cards with photos, ratings, prices, and star ratings
- **Filters & sorting** — filter by price range, star rating, amenities; sort by price or rating
- **Map view** — see hotels on a map alongside the listing
- **AI concierge** — a chatbot that helps you find hotels based on natural language (e.g., "beach hotel under $100")

### 🏠 Hotel Details
- **Rich hotel pages** — full photo gallery with lightbox, detailed amenities list, location on a map
- **Room & rate options** — see all available rooms, prices, and cancellation policies side-by-side
- **Guest reviews** — real review scores and breakdowns from the hotel data provider
- **Ask AI** — ask questions about the hotel and get instant answers based on the hotel's actual data
- **Sticky booking card** — always-visible "Book Now" panel when browsing room options

### 💳 Booking & Checkout
- **3-step checkout** — guest details → payment → confirmation
- **Secure payments** — powered by LiteAPI's hosted payment SDK in the launch profile
- **Signed quotes** — prices are cryptographically locked when you proceed to checkout (no surprise charges)
- **Booking confirmation page** — shows your booking details with a secure, time-limited link
- **Booking management** — view existing bookings and cancel if needed

### 🔐 User Accounts & Security
- **Email/password sign-up & login**
- **Google OAuth** — sign in with Google
- **Wishlist** — save hotels to your favorites (requires login)
- **Admin panel** — for operators to manage settings (requires admin role)
- **Security headers** — industry-standard protections on every page

### 🤖 Smart Features
- **AI chatbot concierge** — natural language hotel search powered by OpenAI (optional)
- **AI hotel Q&A** — rule-based answers about any hotel's details, policies, and facilities
- **Promo codes** — API support for promotional discount codes

### 📱 Design & Experience
- **Responsive design** — works on phones, tablets, and desktops
- **Dark mode** — automatic theme switching
- **Animated UI** — smooth transitions and micro-animations
- **SEO optimized** — search-engine-friendly pages with proper metadata and structured data

---

## How Does It Work? (The Simple Version)

```
🔍 SEARCH               🏨 BROWSE                💳 BOOK                ✅ DONE
─────────────────────────────────────────────────────────────────────────────────
Traveler types      →   See hotel cards      →   Select room,       →   Get booking
a destination,          with photos,             fill guest info,       confirmation
picks dates &           prices, ratings.         & pay securely.        with details.
guests.                 Apply filters.                                  Manage later.
```

Behind the scenes:
1. **Hotel data** comes from a provider called **LiteAPI** — which connects to millions of hotels globally
2. **User accounts** are managed by **Supabase** — a secure database and authentication service
3. **Payments** are processed through **LiteAPI's payment SDK** in the launch profile, with optional Stripe code paths reserved for non-launch fallback modes
4. **Speed** is enhanced by **Upstash Redis** — a caching layer that avoids re-fetching the same data
5. **Error tracking** is handled by **Sentry** — monitors and alerts on any issues (optional)

---

## Services & Partners

| Service | Purpose | Status |
|---------|---------|--------|
| **LiteAPI** | Provides the hotel inventory — search, rates, booking, and confirmation | ✅ Active |
| **Supabase** | User accounts, database for bookings/quotes, authentication | ✅ Active |
| **LiteAPI Payment SDK** | Processes launch-profile card payments and booking payment handoff | ✅ Active |
| **Stripe** | Optional fallback payment path for non-launch modes | ⚙️ Mode-gated |
| **Upstash Redis** | Speeds up the app by caching frequent searches and rate-limiting abuse | ✅ Active |
| **Sentry** | Monitors errors and app health | ⚙️ Optional |
| **OpenAI** | Powers the AI chatbot concierge feature | ⚙️ Optional |
| **Google Places** | Backup destination suggestions when primary autocomplete is limited | ⚙️ Optional |
| **Vercel** | Hosts the website (deployment platform) | ✅ Configured |

---

## Current Project Status

| Area | Status | Notes |
|------|--------|-------|
| Hotel search & discovery | ✅ Complete | Full search, filters, sorting, map view |
| Hotel detail pages | ✅ Complete | Gallery, amenities, reviews, rooms, AI Q&A |
| Booking & checkout flow | ✅ Complete | 3-step flow with LiteAPI payment SDK in the launch profile |
| User accounts & auth | ✅ Complete | Email, Google login, protected routes |
| Webhooks & lifecycle | ✅ Complete | Stripe & LiteAPI webhook handling |
| Email notifications | ✅ Complete | Booking confirmation & cancellation emails |
| Admin dashboard | 🟡 Basic | Settings page exists, full dashboard TBD |
| Revenue reporting | 🔴 Not started | Planned for Phase 5 |
| Mobile app | 🔴 Not started | v2 — APIs are ready for mobile clients |

---

## What "Phase" Are We In?

The project follows a **5-phase development plan**:

| Phase | Name | Status |
|-------|------|--------|
| **Phase 1** | Platform Foundation & Security | ✅ Complete |
| **Phase 2** | Search & Discovery Experience | ✅ Complete |
| **Phase 3** | Hotel Detail & User Workspace | ✅ Complete |
| **Phase 4** | Checkout & Booking Lifecycle | ✅ Complete |
| **Phase 5** | Admin, Monetization & Launch Ops | 🔴 Not started |

> We are currently between **Phase 4 (complete)** and **Phase 5 (next)**. The core product is functionally built and working. Phase 5 focuses on business operations, analytics, and launch readiness.

---

## Key Numbers

- **2+ million hotels** accessible through LiteAPI
- **28+ automated tests** covering booking, security, search, and API functionality
- **15+ API endpoints** for search, booking, webhooks, AI, analytics, and admin
- **3 database migrations** managing the Supabase schema
- **5 phases** in the development roadmap (4 complete, 1 remaining)
