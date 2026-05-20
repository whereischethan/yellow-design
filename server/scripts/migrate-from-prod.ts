/**
 * migrate-from-prod.ts
 *
 * One-time migration: yellow-prod-2026 (old app) → yellow-design (new app)
 *
 * Run via two Cloud SQL Auth Proxy tunnels:
 *   cloud-sql-proxy yellow-prod-2026:asia-south1:yellow-db --port=5433 &
 *   cloud-sql-proxy yellow-design:asia-south1:yellow-design-db --port=5434 &
 *
 * Then:
 *   OLD_DB_URL="postgresql://yellow_user:PASS@localhost:5433/yellow_design" \
 *   NEW_DB_URL="postgresql://whereischethan:@localhost:5434/yellow_design" \
 *   ts-node --project tsconfig.json scripts/migrate-from-prod.ts
 *
 * The script is IDEMPOTENT — all inserts use ON CONFLICT DO NOTHING.
 * Safe to re-run.
 */

import { Client } from 'pg'

const OLD_DB_URL = process.env.OLD_DB_URL
const NEW_DB_URL = process.env.NEW_DB_URL

if (!OLD_DB_URL || !NEW_DB_URL) {
  console.error('Set OLD_DB_URL and NEW_DB_URL environment variables.')
  process.exit(1)
}

// ─── Vehicle type mapping ──────────────────────────────────────────────────
function mapVehicleType(oldType: string): string {
  switch (oldType) {
    case 'luxury':   return 'yellowSky'
    case 'suv':      return 'suv'
    case 'sedan':    return 'yellow'
    case 'van':      return 'suv'
    case 'minibus':  return 'suv'
    default:         return 'yellow'
  }
}

// ─── Driver status mapping ─────────────────────────────────────────────────
function mapDriverStatus(oldStatus: string): string {
  switch (oldStatus) {
    case 'available': return 'available'
    case 'on_trip':   return 'on-trip'
    case 'suspended': return 'offline'
    default:          return 'offline'
  }
}

// ─── Vehicle status mapping ────────────────────────────────────────────────
function mapVehicleStatus(oldStatus: string): 'available' | 'maintenance' | 'offline' {
  switch (oldStatus) {
    case 'active':       return 'available'
    case 'maintenance':  return 'maintenance'
    default:             return 'offline'
  }
}

// ─── Format date string ────────────────────────────────────────────────────
function fmtDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString() : String(d)
}

// ─── Format YYYY-MM-DD for license/insurance strings ──────────────────────
function fmtYMD(d: Date | null | undefined): string | null {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toISOString().slice(0, 10)
}

async function run() {
  const oldDb = new Client({ connectionString: OLD_DB_URL })
  const newDb = new Client({ connectionString: NEW_DB_URL })

  await oldDb.connect()
  await newDb.connect()
  console.log('✓ Connected to both databases')

  // ── 1. Baseline counts ──────────────────────────────────────────────────
  const [oldUsers, oldBookings, oldDrivers, oldVehicles] = await Promise.all([
    oldDb.query('SELECT count(*) FROM users'),
    oldDb.query('SELECT count(*) FROM bookings'),
    oldDb.query('SELECT count(*) FROM drivers'),
    oldDb.query('SELECT count(*) FROM vehicles'),
  ])
  console.log('\n📊 Source counts:')
  console.log(`  Users:    ${oldUsers.rows[0].count}`)
  console.log(`  Bookings: ${oldBookings.rows[0].count}`)
  console.log(`  Drivers:  ${oldDrivers.rows[0].count}`)
  console.log(`  Vehicles: ${oldVehicles.rows[0].count}`)

  // ── 2. Migrate Users ────────────────────────────────────────────────────
  console.log('\n👤 Migrating users…')
  const users = await oldDb.query(`
    SELECT id, phone, "countryCode", name, email, role, "createdAt"
    FROM users
    ORDER BY "createdAt"
  `)

  let userOk = 0, userSkip = 0
  // Build old_id → new_phone map for booking linkage
  const userPhoneMap = new Map<string, string>() // oldId → newPhone

  for (const u of users.rows) {
    // Combine countryCode ("+91") + phone ("9876543210") → "919876543210"
    const cc = (u.countryCode || '+91').replace('+', '')
    const phone = `${cc}${u.phone}`
    userPhoneMap.set(u.id, phone)

    const created = fmtDate(u.createdAt) ?? new Date().toISOString()

    const res = await newDb.query(`
      INSERT INTO users (id, phone, name, email, role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (phone) DO NOTHING
    `, [u.id, phone, u.name ?? null, u.email ?? null, u.role ?? 'rider', created])

    if ((res.rowCount ?? 0) > 0) { userOk++ } else { userSkip++ }
  }
  console.log(`  ✓ Inserted ${userOk}, skipped (already exist) ${userSkip}`)

  // ── 3. Migrate Drivers ──────────────────────────────────────────────────
  console.log('\n🚗 Migrating drivers…')
  const drivers = await oldDb.query(`
    SELECT id, "firstName", "lastName", phone, "countryCode", status,
           "averageRating", "totalTrips", "licenseNumber", "licenseExpiry", "createdAt"
    FROM drivers
    ORDER BY "createdAt"
  `)

  let driverOk = 0, driverSkip = 0
  for (const d of drivers.rows) {
    const cc = (d.countryCode || '+91').replace('+', '')
    const phone = `${cc}${d.phone}`
    const name = `${d.firstName} ${d.lastName}`.trim()
    const joined = fmtYMD(d.createdAt) ?? new Date().toISOString().slice(0, 10)

    const res = await newDb.query(`
      INSERT INTO drivers (id, name, phone, status, rating, trips, license_no, license_exp, joined)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (phone) DO NOTHING
    `, [
      d.id,
      name,
      phone,
      mapDriverStatus(d.status),
      d.averageRating ?? 5.0,
      d.totalTrips ?? 0,
      d.licenseNumber ?? null,
      fmtYMD(d.licenseExpiry),
      joined,
    ])

    if ((res.rowCount ?? 0) > 0) { driverOk++ } else { driverSkip++ }
  }
  console.log(`  ✓ Inserted ${driverOk}, skipped ${driverSkip}`)

  // ── 4. Migrate Vehicles ─────────────────────────────────────────────────
  console.log('\n🚙 Migrating vehicles…')
  const vehicles = await oldDb.query(`
    SELECT id, make, model, year, color, "licensePlate", type, status,
           "assignedDriverId", "currentOdometer", "insuranceExpiry", "registrationExpiry"
    FROM vehicles
    ORDER BY "createdAt"
  `)

  let vehicleOk = 0, vehicleSkip = 0
  for (const v of vehicles.rows) {
    const vType = mapVehicleType(v.type)
    const vStatus = mapVehicleStatus(v.status)

    const res = await newDb.query(`
      INSERT INTO vehicles (id, plate, make, model, color, type, class_key, year, status,
                            driver_id, odometer, insurance_expiry, fc_expiry)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (plate) DO NOTHING
    `, [
      v.id,
      v.licensePlate,
      v.make,
      v.model,
      v.color,
      vType,
      vType,
      v.year,
      vStatus,
      v.assignedDriverId ?? null,
      v.currentOdometer ?? 0,
      fmtYMD(v.insuranceExpiry),
      fmtYMD(v.registrationExpiry),
    ])

    if ((res.rowCount ?? 0) > 0) { vehicleOk++ } else { vehicleSkip++ }
  }
  console.log(`  ✓ Inserted ${vehicleOk}, skipped ${vehicleSkip}`)

  // ── 5. Migrate Bookings ─────────────────────────────────────────────────
  console.log('\n📋 Migrating bookings…')
  const bookings = await oldDb.query(`SELECT * FROM bookings ORDER BY "createdAt" NULLS LAST`)

  let bookingOk = 0, bookingSkip = 0, bookingError = 0

  for (const b of bookings.rows) {
    try {
      // Generate tripCode from last 6 chars of UUID
      const tripCode = 'YD' + b.id.replace(/-/g, '').slice(-6).toUpperCase()

      // Normalise field access — old DB has mixed camelCase / snake_case
      const userId      = b.userId      ?? b.user_id
      const tripType    = b.tripType    ?? b.trip_type
      const vehicleType = b.vehicleType ?? b.vehicle_type
      const paymentMode = b.paymentMode ?? b.payment_mode
      const paymentStatus = b.paymentStatus ?? b.payment_status
      const paymentId   = b.paymentId   ?? b.payment_id
      const clientName  = b.clientName  ?? b.client_name
      const createdAt   = b.createdAt   ?? b.created_at
      const pickupAt    = b.pickupAt    ?? b.pickup_at

      // Parse old JSON blobs
      let pickupObj: any = {}
      let dropObj: any = {}
      let flightObj: any = null
      let pricingObj: any = {}

      try { pickupObj  = typeof b.pickup  === 'string' ? JSON.parse(b.pickup)  : (b.pickup  ?? {}) } catch {}
      try { dropObj    = typeof b.drop    === 'string' ? JSON.parse(b.drop)    : (b.drop    ?? {}) } catch {}
      try { flightObj  = typeof b.flight  === 'string' ? JSON.parse(b.flight)  : (b.flight  ?? null) } catch {}
      try { pricingObj = typeof b.pricing === 'string' ? JSON.parse(b.pricing) : (b.pricing ?? {}) } catch {}

      // Reconstruct pickup/drop JSON for new schema
      const pickupJson = JSON.stringify({
        location: pickupObj.location ?? pickupObj.address ?? '',
        placeName: pickupObj.placeName ?? pickupObj.location ?? '',
        placeId: pickupObj.placeId ?? '',
        dateTime: pickupObj.dateTime ?? pickupAt ?? new Date().toISOString(),
        terminal: pickupObj.terminal ?? undefined,
      })

      const dropJson = JSON.stringify({
        location: dropObj.location ?? dropObj.address ?? '',
        placeName: dropObj.placeName ?? dropObj.location ?? '',
        placeId: dropObj.placeId ?? '',
        dateTime: dropObj.dateTime ?? '',
      })

      const flightJson = flightObj
        ? JSON.stringify({
            flightNumber: flightObj.flightNumber ?? '',
            airline: flightObj.airline ?? '',
            departure: flightObj.departure ?? '',
            arrival: flightObj.arrival ?? '',
            status: flightObj.status ?? '',
          })
        : null

      // Map pricing to new schema
      const totalPrice = pricingObj.totalPrice ?? pricingObj.total ?? 0
      const basePrice = pricingObj.basePrice ?? pricingObj.base ?? 0
      const newPricingJson = JSON.stringify({
        distanceKm: pricingObj.distanceKm ?? pricingObj.distance ?? 0,
        fareBeforeTax: basePrice,
        gst: pricingObj.gst ?? Math.round(basePrice * 0.05),
        toll: pricingObj.toll ?? 0,
        totalPrice,
        basePrice,
        extraKmCharge: pricingObj.extraKmCharge ?? 0,
      })

      const price = totalPrice

      const created = fmtDate(createdAt) ?? new Date().toISOString()

      const res = await newDb.query(`
        INSERT INTO bookings (
          id, trip_code, user_id, status, trip_type, vehicle_type,
          price, passenger_count, bags,
          pickup_json, drop_json, flight_json, pricing_json,
          guest_name, payment_status, razorpay_payment_id, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id,
        tripCode,
        userId,
        b.status,
        tripType ?? 'drop',
        vehicleType ?? 'yellowSky',
        price,
        b.passengers ?? 1,
        b.luggage ?? 0,
        pickupJson,
        dropJson,
        flightJson,
        newPricingJson,
        clientName ?? null,
        paymentStatus ?? 'paid',
        paymentId ?? null,
        created,
      ])

      if ((res.rowCount ?? 0) > 0) { bookingOk++ } else { bookingSkip++ }
    } catch (err: any) {
      console.error(`  ✗ Booking ${b.id}: ${err.message}`)
      bookingError++
    }
  }
  console.log(`  ✓ Inserted ${bookingOk}, skipped ${bookingSkip}, errors ${bookingError}`)

  // ── 6. Final counts ─────────────────────────────────────────────────────
  console.log('\n📊 New DB counts after migration:')
  const [nu, nb, nd, nv] = await Promise.all([
    newDb.query('SELECT count(*) FROM users'),
    newDb.query('SELECT count(*) FROM bookings'),
    newDb.query('SELECT count(*) FROM drivers'),
    newDb.query('SELECT count(*) FROM vehicles'),
  ])
  console.log(`  Users:    ${nu.rows[0].count}`)
  console.log(`  Bookings: ${nb.rows[0].count}`)
  console.log(`  Drivers:  ${nd.rows[0].count}`)
  console.log(`  Vehicles: ${nv.rows[0].count}`)

  await oldDb.end()
  await newDb.end()
  console.log('\n✅ Migration complete.')
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
