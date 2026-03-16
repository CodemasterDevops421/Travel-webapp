# UI Visual Spec: Premium Travel Redesign

## Purpose

This document converts the quick spec into page-level and component-level visual guidance for implementation.

It is intended to remove ambiguity before design code changes begin.

This spec does not authorize functionality changes.

## Core Brand Principle

The product should feel like a premium travel booking brand, not a generic SaaS app and not a decorative lifestyle template.

The UI should communicate:

- trust first
- aspiration second
- conversion clarity third

The product should feel calm, expensive, and easy to act on.

## Visual Identity

### Brand Personality

- dependable
- elevated
- coastal-global
- curated
- premium without being elitist

### Visual Tone

- less glass
- less glow
- more structure
- more whitespace
- more editorial image framing
- stronger typography hierarchy

## Final Design Tokens

### Color Roles

Primary structure:

- `brand-900: #0B2545`
- `brand-800: #133C67`
- `brand-700: #1F5E7A`
- `brand-600: #2C7A8F`

Primary action:

- `accent-500: #FF6B57`
- `accent-600: #E85A47`

Warm support:

- `gold-400: #F4B544`

Positive state:

- `success-600: #2D8C74`

Soft supporting tone:

- `seafoam-300: #7FC8B2`

Neutral foundation:

- `canvas: #F7F9FC`
- `surface: #FFFFFF`
- `surface-alt: #F1F4F8`
- `border: #D9E2EC`
- `text-strong: #102A43`
- `text-muted: #52606D`

### Token Usage Rules

- use teal-navy for framing, trust surfaces, labels, and compositional depth
- use coral for primary CTA only
- use gold sparingly for deals, premiums, and curated badges
- use green only for reassuring positive states
- do not use purple or fuchsia in customer-facing redesign surfaces
- avoid red except for error or urgency states that are semantically real

## Typography Spec

### Font Pairing

- Heading: `Montserrat`
- Body/UI: `Inter`

### Hierarchy

- Hero H1: Montserrat 800
- Section H2: Montserrat 700
- Card titles: Montserrat 700
- Price emphasis: Montserrat 700
- Body copy: Inter 400
- Labels and controls: Inter 500
- Small metadata: Inter 500 with tighter tracking only when intentional

### Typography Rules

- no decorative gradients on major headings
- no overly compressed letter spacing beyond headline use
- body copy should keep 1.5 to 1.7 line height
- short uppercase micro-labels are allowed only for section overlines and trust cues

## Shape, Border, and Shadow System

### Radius

- small controls: 14px to 16px
- standard card: 24px
- large panel: 28px to 32px
- pill/chip: full

### Border

- standard border is visible but soft
- avoid invisible white borders on light surfaces
- use stronger borders to separate premium surfaces before adding stronger shadows

### Shadow

- use layered soft shadows
- no electric glow
- hover states should deepen shadow and slightly lift
- never use shadows that turn cards into floating toys

## Motion Rules

- default motion: 180ms to 260ms
- use transform and opacity only
- hover lift should stay subtle
- page entrance motion should be calm and short
- support `prefers-reduced-motion`

## Global Surface Rules

### Foundation

Targets:

- [globals.css](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\app\globals.css)
- [layout.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\app\layout.tsx)

Requirements:

- replace current base tokens with the approved system
- remove visual reliance on current purple and glow-oriented helpers
- preserve only the utility classes that still serve the new design language
- update app typography to Montserrat plus Inter

### Shared Components

Targets:

- [button.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\ui\button.tsx)
- [input.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\ui\input.tsx)
- [badge.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\ui\badge.tsx)

Requirements:

- primary buttons should use coral
- outline buttons should feel premium, not default-browser-adjacent
- ghost buttons should remain quiet but still intentional
- inputs should read as high-trust travel-commerce form fields
- badges should split into:
  - trust badge
  - deal badge
  - editorial badge
  - state badge

## Header Spec

Target:

- [header.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\layout\header.tsx)

Desired feel:

- premium travel masthead
- crisp
- less “app chrome”
- more “brand navigation”

Rules:

- keep the sticky behavior
- make the wordmark more refined and less generic
- reduce the visual noise of icon-only controls
- desktop header should feel breathable
- mobile menu should feel like a curated navigation drawer, not a quick dropdown
- compact search bar below header should look integrated with the shell

Avoid:

- over-blurred translucent bars
- too many equally weighted actions
- cheap hover effects

## Homepage Spec

Target:

- [page.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\app\page.tsx)

### Hero

Desired feel:

- flagship travel discovery surface
- confident, premium, calm

Rules:

- the background image should feel aspirational and globally relevant
- overlay should use deep navy layering, not purple tinting
- H1 should be clean and powerful, without pink/purple gradient effects
- trust messaging should sit just below the core proposition, not compete with it
- hero search should visually anchor the page

### Trust Strip

Rules:

- keep the 3-column trust structure
- improve icon containers to feel more premium and less generic
- use stronger spacing and more elegant card framing
- trust messages should be concise and scan in under 2 seconds

### Section Rhythm

Rules:

- each homepage section should feel like part of the same editorial-commerce narrative
- section intros should share one structure:
  - overline
  - heading
  - short support line or action link
- maintain a consistent max-width and vertical rhythm

## Supporting Home Modules Spec

### Featured Deals

Target:

- [featured-deals-strip.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\home\featured-deals-strip.tsx)

Rules:

- deal cards should feel refined, not promotional-noisy
- use warm gold or coral cues for deal emphasis, not general primary blue everywhere
- pricing should be visually prominent but elegant
- card footer metadata should feel organized and premium

### Trending Destinations

Target:

- [trending-destinations.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\home\trending-destinations.tsx)

Rules:

- remove emoji-led presentation
- replace emoji with photography, iconography, or typographic emphasis
- cards should sell place, not novelty
- gradients should become subtle atmospheric washes, not tinted novelty panels

### Mood Discovery

Target:

- [mood-discovery.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\home\mood-discovery.tsx)

Rules:

- remove emoji-led chips
- mood options should feel like premium preference chips
- active state should use structured emphasis, not playful scale as the main cue
- section should feel elegant and useful, not toy-like

### Travel Articles

Target:

- [travel-articles.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\home\travel-articles.tsx)

Rules:

- editorial cards should read like magazine previews
- simplify gradients
- increase typographic sophistication
- links should feel refined and directional

### Newsletter

Target:

- [newsletter-band.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\components\home\newsletter-band.tsx)

Rules:

- make this feel like a premium travel club invitation
- use deep brand tones with restrained decorative shapes
- keep the email field bright and easy to use
- CTA button should read as premium invitation, not generic signup

## Hero Search Spec

Targets:

- [hero-search.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\search\components\hero-search.tsx)
- [hero-search-bar.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\search\components\hero-search-bar.tsx)

Rules:

- the search module must look like the product’s primary revenue surface
- field grouping should be visibly organized
- destination, date, guest, and CTA hierarchy should be obvious
- mode toggles should look premium and compact
- autocomplete dropdown should feel polished and trustworthy
- live preview area should feel supportive, not cluttering

Visual priorities:

1. destination
2. dates
3. guest composition
4. primary CTA
5. secondary discovery signals

## Search Results Spec

Targets:

- [search-results-page.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\search\components\search-results-page.tsx)
- [horizontal-hotel-card.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\search\components\horizontal-hotel-card.tsx)
- [filters-sidebar.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\search\components\filters-sidebar.tsx)
- [search-results-map.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\search\components\search-results-map.tsx)

### Results Toolbar

Rules:

- top toolbar should read as a marketplace control strip
- filter count badge should feel integrated and premium
- sort and grid/map switch should use unified styling
- degraded state messaging should be informative and calm

### Filter Sidebar

Rules:

- current sidebar should move away from stacked utility boxes
- treat the sidebar as a premium decision panel
- map module should feel intentional, not like a placeholder
- filter groups should use better section hierarchy and spacing
- controls should feel touch-friendly and visually consistent

### Result Card

Rules:

- information order should be:
  - image
  - name
  - location
  - rating
  - trust benefits
  - amenities
  - quote/highlight
  - price
  - primary CTA
- pricing area should feel extremely clear
- review badge should feel premium and trustworthy
- trust labels should use semantic system colors, not random badge colors
- urgency messaging should be restrained and believable
- save action should feel elegant and not visually loud

Avoid:

- emoji-based urgency
- oversaturated sale treatment
- too many unrelated badge colors in one card

## Hotel Detail Spec

Targets:

- [hotel-details-page.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\hotels\components\hotel-details-page.tsx)
- [hotel-detail-experience.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\hotels\components\hotel-detail-experience.tsx)
- [hotel-detail-sections.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\hotels\components\hotel-detail-sections.tsx)
- [hotel-booking-sidebar.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\hotels\components\hotel-booking-sidebar.tsx)
- [hotel-photo-gallery.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\hotels\components\hotel-photo-gallery.tsx)

### Top Section

Rules:

- title row should feel premium and information-rich without clutter
- remove bright purple reserve CTA
- save/share controls should be cleaner and quieter
- star and location line should look elegant and legible

### Gallery

Rules:

- gallery should feel editorial and premium
- image grid edges and overlay actions should be refined
- “show all photos” must feel like a premium secondary action

### Tabs and Sections

Rules:

- tabs should use calm structure and clear active state
- section spacing should breathe more
- content sections should feel intentionally sequenced:
  - overview
  - highlights
  - facilities
  - reviews
  - rooms
  - description
  - AI assist

### Smart Highlights

Rules:

- highlight cards should not read like marketing slogans
- visual emphasis should come from structure and iconography, not bright accent overload
- copy should feel premium and grounded

### Booking Sidebar

Target:

- [hotel-booking-sidebar.tsx](C:\Users\Lenovo\Downloads\travelapp\Travel-webapp\src\features\hotels\components\hotel-booking-sidebar.tsx)

Rules:

- sidebar should be a premium conversion panel
- pricing must be clean and calm
- urgency state should be believable and not salesy
- cancellation and room info should feel like decision support
- CTA should use the main coral accent system
- square hard edges should be softened to match the broader premium system unless intentionally sharp

## Accessibility and Production Rules

- body text contrast must remain readable in light and dark modes
- all icon-only controls need visible focus states
- all tap targets should meet mobile sizing expectations
- hover should never be the only cue
- cards and async states must avoid layout jumps
- mobile should not feel like a compressed desktop layout

## Implementation Order

1. Foundation tokens and typography
2. Shared components
3. Header
4. Homepage hero and modules
5. Search results
6. Hotel detail
7. Production polish pass

## Review Checklist

- no purple accents remain in core customer pages
- no emoji-dependent visual language remains in premium surfaces
- CTA styling is consistent across home, search, and hotel detail
- cards feel part of one system
- section headers feel part of one system
- pricing blocks feel premium and readable
- the app looks intentionally designed at 375px and 1440px alike
