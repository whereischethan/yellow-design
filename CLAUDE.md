# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Expo client (customer app)
npx expo start --web --port 8081   # web dev server
npx expo start --ios               # iOS simulator
npx expo start --android

# Backend (Express + Prisma on port 3001)
npm run server:dev    # dev mode (ts-node from project root)

# Admin dashboard (Vite, proxies /admin → localhost:3001)
npm run admin         # runs: cd admin && npm run dev  → http://localhost:5174
```

No test or lint scripts are configured.

## Architecture

This is a **phone-authenticated ride-hailing app** (Yellow) split into:
- **Expo Router client** (root of this repo) — React Native / web
- **Express + Prisma backend** (`server/`) — runs separately on port 3001
- **Admin SPA** (`admin/`) — Vite + React, proxies to the same backend

### Routing (Expo Router file-based)

```
app/
  index.tsx              → redirects to /(app)/home
  (onboarding)/          → public: phone → otp → name → welcome
  (app)/                 → authenticated: all main screens
    home.tsx             → ride type selection (airport/outstation/hourly)
    history.tsx          → upcoming/past bookings — taps open awaiting.tsx
    awaiting.tsx         → polls every 8s for driver assignment; cancel calls API
    confirmed.tsx        → post-booking confirmation; "Track booking" → awaiting
    enroute.tsx          → driver en route view
    ...
```

Both layouts use `Stack` with `headerShown: false`. The bottom navigation (`components/BottomNav.tsx`) provides 4 tabs: Ride, History, Rewards, Account.

### Auth flow (customer)

1. `AuthContext` (`context/AuthContext.tsx`) is the single source of truth for auth state (`user`, `isLoggedIn`, `isLoading`).
2. Tokens stored platform-specifically: `expo-secure-store` on native, `localStorage` on web. Keys: `yellow_auth_token`, `yellow_refresh_token`, `yellow_auth_user`.
3. On app init, AuthContext restores the session from storage — if a token exists the user lands on `/(app)/home`, otherwise `/(onboarding)/phone`.

### Auth flow (admin)

Admin login is **2FA OTP-based** (phone number → 4-digit OTP → 12-hour admin JWT):
1. Admin enters phone number → `POST /admin/login/send-otp` (whitelisted by `ADMIN_PHONES` env var; empty = any phone allowed in dev)
2. OTP sent via MSG91 (or logged to console in dev when MSG91 not configured)
3. Admin enters OTP → `POST /admin/login/verify-otp` → returns `{ token }` (JWT with `role: 'admin'`)
4. Token stored as `yellow_admin_token` in `localStorage`, sent as `Authorization: Bearer <token>`
5. Legacy `x-admin-key` header still accepted (for backward compat)

**Admin key (legacy / dev fallback):** `yellow-ops-dev` (set via `ADMIN_KEY` env var in `server/.env`)

### API layer (`lib/api.ts`)

Centralised fetch wrapper with:
- Auto-retry (2 attempts, 15 s timeout)
- 401 → token refresh with single in-flight refresh queue
- Dev base URL: `http://localhost:3001`; prod: auto-detected from `EXPO_PUBLIC_API_BASE`

### Backend (`server/`)

| File | Purpose |
|------|---------|
| `index.ts` | Express app, route registration |
| `db.ts` | Prisma seed (pricing defaults) |
| `routes/auth.ts` | Customer OTP send/verify, token refresh |
| `routes/bookings.ts` | Create/fetch/patch bookings, lead logging, availability |
| `routes/admin.ts` | **All admin routes**: OTP login (public), then requireAdmin middleware, then bookings/drivers/vehicles/customers/leads/pricing/stats |
| `routes/pricing.ts` | Distance-based pricing via Google Maps |
| `routes/flights.ts` | Flight lookup via RapidAPI |
| `routes/user.ts` | Profile, support contact |
| `middleware/auth.ts` | JWT verification for customer routes |
| `lib/prisma.ts` | Prisma client singleton |
| `prisma/schema.prisma` | PostgreSQL schema (users, otp_sessions, refresh_tokens, bookings, drivers, vehicles, leads, pricing_config) |

Bookings store nested data (pickup, drop, flight, pricing, driver, vehicle) as JSON strings.

### Admin panel (`admin/src/`)

| File | Purpose |
|------|---------|
| `api.ts` | Admin fetch wrapper (Bearer JWT auth) + all API helpers |
| `App.tsx` | Root — auth gate, data loading, page routing |
| `pages/Login.tsx` | 2-step OTP login (phone → OTP) |
| `pages/Dashboard.tsx` | Stats + upcoming bookings |
| `pages/Bookings.tsx` | Booking list + drawer (assign driver/status) |
| `pages/Drivers.tsx` | Driver management |
| `pages/Vehicles.tsx` | Vehicle fleet |
| `pages/Customers.tsx` | Customer list |
| `pages/Leads.tsx` | Quote leads from customer app |
| `pages/Pricing.tsx` | Pricing config editor |
| `pages/Content.tsx` | App copy (static UI, not wired to backend yet) |

### Customer ↔ Admin data flow

- Customer creates booking → `POST /bookings` → visible in Admin > Bookings
- Admin assigns driver/changes status → `PATCH /admin/bookings/:id` → customer `awaiting.tsx` polls `GET /bookings/:id` every 8s and sees the update
- Customer views quote → `POST /bookings/lead` → visible in Admin > Leads
- Admin > Customers shows all registered users with trip counts

### Design system

All colours and font names live in `constants/theme.ts`:
- `YL` — consumer palette (primary yellow `#FFD84A`, background `#F6F3EB`, ink `#2B2720`)
- `YL_BIZ` — business/teal variant
- `FONTS` — three families: `BricolageGrotesque` (UI), `JetBrainsMono` (data), `NotoSansKannada` (regional)

Custom components are prefixed `Y` (`YButton`, `YField`, `YAppChrome`, `YBrand`). Styles are inline using theme constants — no CSS-in-JS library.

### Types (`types/booking.ts`)

Key enums and interfaces shared by client and server:
- `VehicleType`: `'yellowSky' | 'yellow' | 'sedan' | 'suv'`
- `TripType`: `'pickup' | 'drop'`
- `BookingStatus`: `pending → confirmed → assigned → arrived → in_progress → completed | cancelled`

### Environment variables

```
# Client (.env — root)
EXPO_PUBLIC_API_BASE=              # empty = localhost:3001 in dev
EXPO_PUBLIC_GOOGLE_API_KEY=        # for location autocomplete

# Server (.env — root .env also loaded)
DATABASE_URL=postgresql://user@localhost:5432/yellow_design
JWT_SECRET=
ADMIN_KEY=yellow-ops-dev           # legacy key fallback
ADMIN_PHONES=                      # comma-separated e164 phones for admin 2FA; empty = any in dev
GOOGLE_MAPS_KEY=
MSG91_AUTH_KEY=                    # OTP SMS; if empty, OTP logged to console
MSG91_TEMPLATE_ID=
FLIGHT_API_KEY=
SUPPORT_WHATSAPP_NUMBER=
```

### Running locally

1. Ensure PostgreSQL is running: `pg_ctl status -D /opt/homebrew/var/postgresql@14`
2. DB: `yellow_design` (Prisma schema applied). `DATABASE_URL` in root `.env`
3. Start server: `npm run server:dev` (port 3001)
4. Start admin: `npm run admin` → http://localhost:5174
5. Start customer app: `npx expo start --web --port 8081`
6. Admin login: enter phone → OTP (check server console or MSG91 SMS) → sign in
