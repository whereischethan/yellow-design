# Yellow — Admin Dashboard Design Handoff

## What this document is

A complete brief for designing and building the Yellow admin dashboard. The customer-facing app (Expo/React Native) is built and working. This document covers what the admin needs, what data exists, what APIs need to be built, and design direction.

---

## Product context

Yellow is a premium pre-scheduled ride service operating in Bangalore. Single vehicle class: **Yellow Sky** (Mercedes EQE, EV). Rides are booked in advance — no on-demand dispatch. The admin dashboard is used by the Yellow ops team to manage the full booking lifecycle end to end.

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Admin frontend | Vite + React + TypeScript (in `admin/` folder) |
| Backend | Express + SQLite (`server/`) on port 3001 |
| Shared types | `types/booking.ts` — import directly |
| Auth | JWT (same tokens as app) — admin users have `role = 'admin'` in DB |

---

## Design system

The admin should feel like a **web-native sibling** of the app — not identical, but clearly the same brand. Use the same colour tokens.

### Colours (`constants/theme.ts` → `YL` object)
```
Background:   #F6F3EB  (YL.bg)
Card/surface: #FFFFFF  (YL.card)
Border:       #E2DDD7  (YL.line)
Ink (text):   #2B2720  (YL.ink)
Ink muted:    #736E65  (YL.ink2)
Ink faint:    #9E9A91  (YL.ink3)
Yellow:       #FFD84A  (YL.yellow)
Yellow deep:  #E6B800  (YL.yellowDeep)
Green:        #4A9442  (YL.leaf)
Orange:       #D4763A  (YL.gulmohar)
```

### Typography
- **Display / UI:** `Bricolage Grotesque` (Google Fonts) — headings, labels, body
- **Data / codes:** `JetBrains Mono` — booking codes, phone numbers, prices, times

### Admin-specific style notes
- Tables: `#F6F3EB` alternating rows, `YL.line` borders, 12px row padding
- Status badges: pill shape, small text, colour-coded (see booking statuses below)
- Sidebar: dark (`#2B2720` background, `#FFD84A` active item highlight)
- Density: medium — this is ops software, not marketing. Show more data per row than the app does per screen.

---

## Booking data model

This is what's in SQLite today. All nested objects are stored as JSON columns.

```typescript
type BookingStatus =
  | 'pending'      // just created, no driver
  | 'confirmed'    // ops has confirmed it
  | 'assigned'     // driver assigned
  | 'arrived'      // driver at pickup
  | 'in_progress'  // trip underway
  | 'completed'    // done
  | 'cancelled'

type Booking = {
  id: string                  // UUID
  tripCode: string            // YL-XXXXXX display code
  userId: string              // FK → users.id
  tripType: 'pickup' | 'drop' // pickup = from airport, drop = to airport
  vehicleType: 'yellowSky'
  status: BookingStatus
  passengers: number
  luggage: number
  pickup: {
    location: string
    placeName: string
    placeId: string
    dateTime: string          // ISO
    lat?: number
    lng?: number
    terminal?: 'T1' | 'T2'   // airport bookings only
  }
  drop: {
    location: string
    placeName: string
    placeId: string
    dateTime?: string
    lat?: number
    lng?: number
  }
  flight?: {
    flightNumber: string
    airline: string
    departure: string
    arrival: string
    status: string
  }
  pricing: {
    distanceKm: number
    basePrice: number
    extraKmCharge: number
    totalPrice: number
  }
  assignedDriver?: {
    id: string
    name: string
    phone: string
    rating: number
  }
  assignedVehicle?: {
    make: string
    model: string
    licensePlate: string
    color?: string
  }
  guestName?: string
  guestPhone?: string
  paymentStatus: 'pending' | 'paid' | 'refunded'
  createdAt: string           // ISO
}
```

**Status badge colours:**
| Status | Background | Text |
|--------|-----------|------|
| pending | `#FFF0A8` | `#2B2720` |
| confirmed | `#D4F4CD` | `#2B6B24` |
| assigned | `#D4F4CD` | `#2B6B24` |
| arrived | `#FFD84A` | `#2B2720` |
| in_progress | `#FFD84A` | `#2B2720` |
| completed | `#E2DDD7` | `#736E65` |
| cancelled | `#FDECEA` | `#C0392B` |

---

## Required admin screens

### 1. Bookings (primary view)

**List view**
- Full-width table, default sorted by pickup time ascending
- Columns: Trip code, Status badge, Pickup time, From → To, Passenger name (or guest name), Driver (or "Unassigned"), Price, Created
- Filter bar: Status (multi-select chips), Date range, Trip type (airport / outstation / hourly)
- Search: by trip code, passenger name, phone, driver name
- Row click → opens booking detail drawer/modal (no page nav)
- Bulk action: change status for multiple bookings

**Booking detail drawer** (slides in from right, ~480px wide)
- All booking fields displayed
- Inline status change: dropdown with all valid next states
- Driver assignment: searchable dropdown of drivers (from drivers table)
- Vehicle assignment: text inputs for make/model/plate
- Edit: pickup/drop time, passenger count, luggage, notes
- Pricing override: editable total with reason field (shows original alongside)
- Guest info section (if booking for someone else)
- Flight info section (if applicable)
- Action buttons: Confirm, Cancel (with confirmation), Duplicate booking
- Audit trail at bottom: created at, last updated, who changed status

**Create booking** — modal / full form
- Same fields as the app booking flow but in a dense form layout
- Admin can pick any customer (search by phone) or create guest booking
- Manual date/time picker, location text + optional placeId
- Assign driver at creation time (optional)

### 2. Drivers

**List view**
- Table: Name, Phone, Status (available / on-trip / offline), Rating, Active bookings count, Vehicle, Joined date
- Add driver button → modal form

**Driver detail**
- Name, phone, license number
- Assigned vehicle (make, model, plate, colour, EV ✓/✗)
- Current booking (if on-trip)
- Booking history (last 20 trips)
- Rating history

**Add / edit driver form fields:**
- Full name, phone, email
- License number, expiry
- Vehicle: make, model, year, plate number, colour, is EV
- Active toggle (takes them offline)

> ⚠️ **DB change needed:** A `drivers` table doesn't exist yet. Schema to add:
> ```sql
> CREATE TABLE drivers (
>   id TEXT PRIMARY KEY,
>   name TEXT NOT NULL,
>   phone TEXT UNIQUE NOT NULL,
>   email TEXT,
>   license_number TEXT,
>   license_expiry TEXT,
>   vehicle_make TEXT,
>   vehicle_model TEXT,
>   vehicle_year INTEGER,
>   vehicle_plate TEXT,
>   vehicle_colour TEXT,
>   vehicle_is_ev INTEGER DEFAULT 1,
>   status TEXT DEFAULT 'offline',   -- available | on-trip | offline
>   rating REAL DEFAULT 5.0,
>   is_active INTEGER DEFAULT 1,
>   created_at TEXT DEFAULT (datetime('now'))
> );
> ```

### 3. Pricing

Single settings page — not a table. Direct form with save button.

**Fields:**
| Setting | Current value | Notes |
|---------|--------------|-------|
| Base fare (minimum) | ₹800 | Applied when distance × rate < this |
| Rate per km | ₹35 | Multiplied by distanceKm |
| Toll flat charge | ₹200 | Added to every trip |
| GST rate | 5% | Applied to (base + tolls) |
| Hourly rate | ₹500/hr | Used for hourly rentals |
| Meet & greet add-on | ₹100 | Fixed fee |
| Extra hour rate (hourly) | ₹500 | Per additional hour |

These are currently hardcoded in `server/routes/pricing.ts`. They need to be moved to a `settings` table and read at request time.

> ⚠️ **DB change needed:**
> ```sql
> CREATE TABLE settings (
>   key TEXT PRIMARY KEY,
>   value TEXT NOT NULL,
>   updated_at TEXT DEFAULT (datetime('now'))
> );
> ```
> Seed with current values on migration.

### 4. Content (app text & config)

Scoped to things that realistically change. Not a full CMS — just the fields ops will actually touch.

**Fields:**

| Field | Where it appears in app | Example |
|-------|------------------------|---------|
| Home announcement | Yellow banner strip on home screen | "New route: Mysuru now available" |
| Vehicle display name | Vehicle selection screen | "Yellow Sky" |
| Vehicle description | Vehicle selection screen | "Mercedes EQE · EV · 6 seats" |
| Support WhatsApp number | Support screen, help flows | `918628062808` |
| Referral reward amount | Referral screen | ₹200 |
| Outstation info text | Info card on outstation screen | "Inter-state permits, fuel & driver bata included." |
| Hourly info text | Info card on hourly screen | "Unlimited kms within Bangalore city limits." |

The app checks for a `content` object from `GET /config` on launch and uses it to override hardcoded strings. Falls back to the hardcoded strings if the endpoint fails (no connectivity issue degrades the app).

> ⚠️ **DB change needed:** Add to `settings` table with `content_*` keys, or a separate `content` table.

### 5. Customers

**List view**
- Table: Name (or "Guest"), Phone, Total rides, Last ride date, Account created
- Search by name or phone
- Row click → customer detail

**Customer detail**
- Profile: name, phone, email, joined date
- Booking history: full list, same row format as bookings table
- Referral code + count of people they referred
- Credits balance (future)
- Block / unblock account toggle

### 6. Dashboard (home)

Key metrics at a glance. Single scrollable page.

**Today's summary strip** (top, 4 stat cards):
- Rides today (confirmed + in progress)
- Revenue today (sum of confirmed bookings)
- Drivers active now
- Upcoming in next 2 hours

**Upcoming rides table** — next 10 bookings by pickup time, with quick assign action inline

**Status pipeline** — horizontal funnel: pending → confirmed → assigned → in_progress counts

**Recent activity feed** — last 20 events (new booking, status change, driver assigned) with timestamps

---

## API routes to build

All under `/admin/*`, protected by `requireAdmin` middleware (checks `role = 'admin'`).

```
GET    /admin/bookings              ?status=&date=&search=&page=
GET    /admin/bookings/:id
POST   /admin/bookings              create booking
PATCH  /admin/bookings/:id          update status, assign driver/vehicle, edit fields
DELETE /admin/bookings/:id          cancel (soft delete, sets status = cancelled)

GET    /admin/drivers
POST   /admin/drivers
GET    /admin/drivers/:id
PATCH  /admin/drivers/:id
DELETE /admin/drivers/:id

GET    /admin/customers
GET    /admin/customers/:id

GET    /admin/settings              returns pricing + content as flat object
PATCH  /admin/settings              update any key/value pairs

GET    /admin/dashboard             aggregated stats for today
```

---

## Navigation structure

```
Sidebar (always visible)
  ├── Dashboard          /admin
  ├── Bookings           /admin/bookings
  ├── Drivers            /admin/drivers
  ├── Customers          /admin/customers
  ├── Pricing            /admin/settings/pricing
  └── Content            /admin/settings/content

Top bar
  └── Admin user name + logout
```

---

## Auth flow for admin

1. Admin goes to `/admin/login`
2. Enters phone number → OTP (same SMS flow as app)
3. If `user.role === 'admin'` → issued admin JWT, redirected to `/admin`
4. If `user.role !== 'admin'` → rejected with "Not authorised"
5. Admin JWT stored in `localStorage` (web only)

No separate admin user table — just the `role` field in the existing `users` table. To make a user admin: `UPDATE users SET role = 'admin' WHERE phone = '91XXXXXXXXXX';` directly in SQLite.

---

## What's already built (don't rebuild)

- Express server with auth, OTP, bookings CRUD, pricing, flights routes
- SQLite schema for users, bookings, OTP sessions, refresh tokens
- `types/booking.ts` — all TypeScript types, importable directly from `../types/booking`
- JWT middleware (`server/middleware/auth.ts`) — extend with `requireAdmin` check

---

## What needs to be built from scratch

1. `admin/` — Vite + React + TypeScript project
2. `drivers` table + all driver CRUD
3. `settings` table + pricing/content API
4. All `/admin/*` API routes
5. `requireAdmin` middleware
6. `GET /config` endpoint for the app to pull content settings

---

## Open questions for design

1. **Booking detail:** drawer (slide-in panel) or dedicated page? Drawer keeps context, page gives more space.
2. **Driver assignment UX:** dropdown in the booking detail, or a separate "dispatch" view showing a calendar/timeline of drivers?
3. **Mobile admin:** does the ops team need this on mobile, or desktop-only is fine?
4. **Real-time:** should booking status updates push live (WebSocket/SSE), or is manual refresh acceptable for v1?
