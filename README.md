# InclusiveMapper — Inclusive Public Space Accessibility Mapper

A cross-platform (Android · iOS · web) Expo app for **crowdsourced accessibility mapping of public spaces**. Anyone can browse step-free / wheelchair-accessible places on a map, report barriers, add new venues, and community-verify accessibility data — with an AI assistant, real-time notifications, and email alerts on a Supabase backend.

- **App display name:** InclusiveMapper
- **Version:** 1.0.0
- **Scale:** ~91 TypeScript/TSX files, ~22,000 lines under `src/`
- **Orientation:** portrait · Light/Dark UI (system-aware, persisted)

---

## Table of Contents

- [What It Does](#what-it-does)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Screens & Navigation](#screens--navigation)
- [All Features](#all-features)
- [Backend (Supabase)](#backend-supabase)
- [Project Structure](#project-structure)
- [Commands](#commands)
- [Accessibility Commitments](#accessibility-commitments)
- [Assets](#assets)
- [Environment Variables](#environment-variables)
- [Notes & Known Gaps](#notes--known-gaps)

---

## What It Does

InclusiveMapper helps people with mobility needs (and everyone who cares about inclusive spaces) find, share, and trust accessibility information about public places:

1. **Discover** accessible venues on an interactive map — filter by verified status, ramps, step-free entrances, and accessible restrooms.
2. **Report** accessibility features or barriers at any place, with photos and a pinned location.
3. **Verify** community reports by confirming what you see or disputing outdated info — 3 confirms verifies a place, 2 disputes flags it.
4. **Ask the AI assistant** for accessible places near you, directions, contact info, or to add/report/verify through chat.
5. **Get notified** in-app, via push, and by email when places you care about change status — or trigger an **Emergency SOS**.
6. **Save favorites**, set accessibility requirements, and export your data.

Guests can browse the map, home, and place details freely. Contributing (reporting, verifying, AI assistant, profile) requires a free account.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Expo SDK 54** (`expo` 54.0.37) |
| Routing | **Expo Router 6** (file-based, typed routes) |
| UI | **React Native 0.81** + React 19 |
| Map | **Leaflet 1.9.4** in a WebView (CartoDB Voyager tiles) — no native map module |
| Backend | **Supabase** — Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions |
| Data fetching | TanStack React Query 5 |
| Icons | `@expo/vector-icons` (Ionicons, MaterialCommunityIcons, FontAwesome, …) |
| Animation | `react-native-reanimated`, `react-native-gesture-handler` |
| Native modules | `expo-camera`, `expo-haptics`, `expo-image`, `expo-image-picker`, `expo-linear-gradient`, `expo-location`, `expo-notifications`, `expo-splash-screen`, `expo-web-browser` |
| Storage | `@react-native-async-storage/async-storage` |
| Email | Brevo (Sendinblue) via Supabase Edge Function |
| AI | OpenRouter (model configurable) via `ai-orchestrator` Edge Function |
| Language / Lint | TypeScript 5.9, ESLint (`eslint-config-expo`) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Expo Go** on your phone (Android/iOS) or a web browser
- (Optional, for full features) A **Supabase** project + **Brevo** account + **OpenRouter** key

### Install & run

```bash
npm install
npm start          # Expo dev server — scan the QR with Expo Go
# or
npm run android
npm run ios
npm run web
```

### Backend (optional — app runs in demo mode without it)

The app works out-of-the-box in a **demo mode** with mock places/reports and a local demo account (`demo@…` / `demo1234`). To connect your own backend:

1. Create a Supabase project.
2. Apply the schema and migrations:
   ```bash
   supabase db push
   ```
3. Deploy the Edge Functions:
   ```bash
   supabase functions deploy ai-orchestrator send-email push-notify
   ```
4. Set Edge Function secrets:
   ```bash
   supabase secrets set OPENROUTER_API_KEY=… OPENROUTER_MODEL=… \
     BREVO_API_KEY=… EMAIL_FROM=… EMAIL_SENDER_NAME=…
   ```
5. Create client env vars in `.env` (see [Environment Variables](#environment-variables)).

See `.env.example` for the full list and deployment notes.

---

## Screens & Navigation

File-based routes live under `src/app/`. The root layout wraps the app in `AppProvider → ThemeProvider → ToastProvider`, shows the `NotificationBanner`, and registers modal screens.

| Route | Screen | Description |
|---|---|---|
| `/` | `index` | First-launch redirect: `/onboarding` if unseen, else `/map` |
| `/onboarding` | `onboarding` | 4-slide intro carousel (Reduce Motion aware) |
| `/login` | `(auth)/login` | Email/password sign-in, password recovery |
| `/signup` | `(auth)/signup` | Create account (name, email, password, terms) |
| `/home` | `(tabs)/home` | Dashboard: stats, quick actions, recent audits, saved places |
| `/map` | `(tabs)/map` | Interactive Leaflet map with search, filters, AI search |
| `/assistant` | `(tabs)/assistant` | AI accessibility assistant chat |
| `/report` | `(tabs)/report` | 2-step wizard: pin location → describe features/barriers |
| `/verify` | `(tabs)/verify` | Community verification queue (confirm / dispute) |
| `/inbox` | `(tabs)/inbox` | Notification center |
| `/profile` | `(tabs)/profile` | Profile, preferences, SOS, theme, sign out |
| `/place/[id]` | `place/[id]` | Deep-linked place details (modal) |
| `/report-issue` | `report-issue` | Report a barrier on an existing place (modal) |
| `/explore` | `explore` | Standalone search + filter list (not in tab bar) |

**Tab bar:** Home · Map · AI · Submit (center) · Verify · Inbox (badge) · Profile (badge).

**Guests** are redirected to browse-only screens; contribution screens redirect unauthenticated users to `/login`.

---

## All Features

### Map & Discovery
- Interactive **Leaflet** map in a WebView with custom color-coded markers (by verification status)
- Multi-provider **geocoding/search** (Nominatim + Photon) with fuzzy rerank and query aliases
- **AI search mode** — natural-language queries rewritten and answered by the AI orchestrator, with a silent fallback to plain filters
- Filter chips: All · Verified · Ramp · Step-free · Accessible toilet
- Voice input for search (web Speech Recognition)
- Distance formatting and screen-reader announcements for results
- Zoom in/out/reset controls

### Place Details
- Status badge (Verified / Pending / Disputed), accessibility feature list, photos
- **Save/unsave** to your favorites
- **Open directions** — deep-links to Apple Maps / Google Maps (`geo:` / universal https)
- Reachable from Home, Map, Profile, and as a deep-linked page

### Contributions — Add Place & Report Barriers
- **2-step report wizard** with progress stepper and screen-reader step announcements
- Pin a location on the map, search an address, or use current location (Colombo fallback)
- **Venue categories:** Mall, Library, Transit Hub, Public Park, Healthcare & Clinic, Civic & Government, Café & Restaurant, Other/Custom
- Add a **custom venue** at the pinned spot (name + category/address)
- **7 accessibility feature toggles:** Wheelchair Ramp, Elevator Access, Accessible Restroom, Disabled Parking, Step-Free Entrance, Tactile Paving, Automatic Door
- Optional note and **up to 5 photos** (camera + library; 15 MB limit; web file input)
- Photos uploaded to Supabase Storage bucket `report-photos`
- Report an issue on an existing place via the `/report-issue` modal

### Community Verification
- **Threshold rules:** 3 confirms → Verified · 2 disputes → Disputed (mirrored by DB triggers)
- Confirm a report or open the **Dispute Modal** with preset reasons:
  - Ramp missing / steep slope
  - Outdated accessibility info
  - Entrance or elevator blocked
  - Other accuracy issue (free note)
- Priority badges (High / Medium / Low) and dispute history per report
- Status legend and filter chips (Verified / Disputed / Pending)
- Side drawer with theme toggle and sign out

### AI Accessibility Assistant
- Full chat UI with quick-action chips and example prompt cards
- **Tools wired to the backend** (`ai-orchestrator` Edge Function):
  - `searchAccessiblePlaces` — nearby accessible venues
  - `findPlaceInDatabase` — look up a known place
  - Web search — phone numbers, websites, accessibility info for places not yet in the database
  - `addAccessiblePlace` — add a place (asks for confirmation first)
  - `reportPlaceIssue` — file a barrier report
  - `verifyPlace` — confirm/dispute a place
- **Handoffs:** asking to add a place / file a report / verify opens the right screen with a toast explaining what to do
- Embedded place rows with feature tags, distance, and turn-by-turn directions
- Voice typing (web Speech Recognition; native points to the keyboard mic)
- Assistant replies are announced to screen readers

### Notifications (three tiers)
1. **In-app** — Realtime notification table, animated top banner, and full Inbox center with filters (All / Verifications / Saved Places / Badges), mark-all-read, and clear
2. **Push** — Expo push API, Android channels `alerts` / `updates`, device tokens in `push_tokens`; types: high-priority report, self SOS alert, disputed status
3. **Email** — via Brevo Edge Function. Subjects include:
   - Welcome
   - `Accessibility update: <place> is now <label>`
   - `<place> is now on InclusiveMapper`
   - Data export request
   - Monthly impact summary
   - Test email
   - `🚨 Get help: SOS triggered by <name>`
   - HTML templates in `emails/` (`welcome.html`, `place-update.html`)

### Authentication & Profile
- Supabase **email/password** auth (sign up, sign in, sign out, password recovery)
- **Guest mode** — browse Home, Map, search, and place details without an account
- Session persistence; demo fallback account when Supabase is unconfigured
- **Edit profile** — avatar upload (image picker), name, contact email, disability status/type
- **Accessibility preferences** — require ramp, elevator, accessible toilet, step-free; **haptics on/off**
- **Trusted contacts** for SOS (chips list)
- **Emergency SOS** — tap-and-hold; sends a local push + email to your registered address and trusted contacts; graceful "Not Installed" fallback
- **Data export** and **test email** from Help & Support
- Roles: `user` / `verifier` / `admin` → Community Member / Verifier / Administrator (JWT hook + `user_roles` table)

### Theming
- **Light & dark mode** — system-seeded, persisted at `@inclusive-mapper/theme`, manual toggle in Profile and Verify drawer
- Davis Humphries palette: Jet Black `#050505`, Rich Velvet Burgundy `#610C27`, Warm Taupe `#AC9C8D`, Peachy Blush `#E3C1B4`, Warm Stone `#DDD9CE`, Soft Alabaster Cream `#EFECE9` (WCAG AAA contrast)
- No light-flash on launch (theme seeded from device scheme)

### Onboarding
- 4 slides: effortless journeys · report barriers in seconds · community-verified data · save & navigate freely
- Floating emoji badge pills, dedicated illustrations, SKIP/NEXT, "Slide N of 4" announcements, Reduce Motion support

---

## Backend (Supabase)

### Edge Functions (`supabase/functions/`)
| Function | Purpose |
|---|---|
| `ai-orchestrator` | AI chat tools: place search, DB lookup, web search, add place, report issue, verify |
| `send-email` | Brevo transactional email (welcome, updates, SOS, export, test) |
| `push-notify` | Expo push notifications (high-priority report, self SOS, disputed status) |

### Database tables
`user_roles` · `profiles` · `places` · `reports` · `user_saved_places` · `notifications` · `dispute_reasons` · `email_requests` · `push_tokens`

- **PostGIS** extension + RPC `find_nearby_accessible_places` for spatial queries
- **Triggers/functions:** `handle_new_user`, `handle_new_user_role`, `custom_access_token_hook`, `promote_user_role`, `handle_report_verification_threshold`, `handle_place_verification_threshold`, `notify_badge_earned` (points / levels / badges — Silver, Gold Mapper)
- **Migrations (7):** init schema → notifications → spatial search → realtime fix → report location columns → place-added email kind → profile backfill

### Storage buckets
- `report-photos` — barrier/place photos
- `avatars` — profile pictures

---

## Project Structure

```
Inclusive-Public-Space-Accessibility-Mapper/
├── assets/                  # icons, splash, onboarding & auth images, tab icons
├── emails/                  # HTML email templates (welcome, place-update)
├── scripts/                 # reset-project.js
├── src/
│   ├── app/                 # Expo Router screens (17 routes)
│   ├── components/          # 35 components (chat, map, modals, UI kit, auth)
│   │   ├── auth/            # AuthBackground, AuthBrandIcons, AuthKit
│   │   ├── profile/         # ProfileBackground
│   │   └── ui/              # avatar, badge, button, card, collapsible, dialog, input
│   ├── constants/           # colors, theme, authTheme, mockData, categories, features
│   ├── context/             # AppContext, ThemeContext, ToastContext
│   ├── features/            # auth, places, reports, notifications, reviews (api + types)
│   ├── hooks/               # use-theme, use-color-scheme
│   ├── lib/                 # supabase, placeSearch, aiSearch, directions, geoUtils,
│   │                        # haptics, pushNotifications, queryClient, utils
│   ├── types/               # accessibility, categoryPlaces
│   └── utils/               # imageUpload
├── supabase/
│   ├── functions/           # ai-orchestrator, push-notify, send-email
│   ├── migrations/          # 7 SQL migrations
│   └── schema.sql
├── app.json                 # Expo config
├── .env.example             # env template + deploy notes
└── package.json
```

**TypeScript paths:** `@/*` → `./src/*`, `@/assets/*` → `./assets/*`.

---

## Commands

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start on Android |
| `npm run ios` | Start on iOS |
| `npm run web` | Start in the browser |
| `npm run lint` | Run ESLint |

**Supabase CLI** (see `.env.example`):
```bash
supabase db push
supabase functions deploy ai-orchestrator send-email push-notify
supabase secrets set OPENROUTER_API_KEY=… OPENROUTER_MODEL=… \
  BREVO_API_KEY=… EMAIL_FROM=… EMAIL_SENDER_NAME=…
```

---

## Accessibility Commitments

This is an accessibility app, so it holds itself to accessibility standards:

- **Screen readers** — `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`, and `accessibilityState` on every interactive element; `AccessibilityInfo.announceForAccessibility` for toasts, wizard steps, onboarding slides, map search results, and AI replies
- **Haptics** — distinct feedback for icon taps, input focus, medium presses, success, and warnings; globally toggleable in Profile → Accessibility Preferences
- **Reduce Motion** — respected in onboarding animations
- **Large hit targets** — expanded `hitSlop` on close buttons, checkboxes, and map controls
- **Color contrast** — WCAG AAA palette (>7:1)
- **Voice typing** — web Speech Recognition for search and chat input
- **Emergency SOS** — tap-and-hold with confirmation, works even when notifications are unavailable (falls back to email)

---

## Assets

| Location | Contents |
|---|---|
| `assets/images/` | Icon, splash, favicon, logo, Android adaptive icons, sample place photos |
| `assets/images/auth/` | `auth-map-light.png`, `auth-map-dark.png` |
| `assets/images/onboarding/` | `auditor.png`, `scenic-terrace.png`, `tactile-guide.png`, `wheelchair-user.png` |
| `assets/images/profile/` | `profile-bg-light.png`, `profile-bg-dark.png` |
| `assets/images/tabIcons/` | Explore & home tab icons @1x/@2x/@3x |
| `emails/` | `welcome.html`, `place-update.html` |

---

## Environment Variables

### Client (`.env`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

### Edge Function secrets (set via `supabase secrets set`, never in client code)

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key for the AI assistant |
| `OPENROUTER_MODEL` | Model slug (e.g. an OpenRouter chat model) |
| `BREVO_API_KEY` | Brevo (Sendinblue) transactional email key |
| `EMAIL_FROM` | From address for outbound email |
| `EMAIL_SENDER_NAME` | Display name for outbound email |

Inside the functions, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

---

## Notes & Known Gaps

- **Social login buttons** (Facebook / Google / Apple) in `AuthSocialRow` are presentational only — no OAuth handlers are wired.
- **Voice typing** uses the browser Speech API on web; in Expo Go on a phone there is no native speech-to-text, so the button points to the keyboard's own mic.
- **`FreeLocationMap.tsx`** is defined but not currently imported by any screen (the report wizard builds its map inline).
- **Demo mode** (no Supabase configured) serves mock places/reports and a local demo account so the UI is fully explorable without a backend.
- **SDK note:** `package.json` pins **Expo SDK 54**; consult SDK 54 docs when making framework-level changes.

---

## License

All rights reserved. InclusiveMapper — making public spaces accessible, together.
