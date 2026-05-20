/**
 * validate-migration.ts
 *
 * Post-migration validation: compare row counts and spot-check data integrity.
 *
 * Run with both Cloud SQL Auth Proxy tunnels active:
 *   OLD_DB_URL="postgresql://yellow_user:PASS@localhost:5433/yellow_design" \
 *   NEW_DB_URL="postgresql://whereischethan:@localhost:5434/yellow_design" \
 *   ts-node --project tsconfig.json scripts/validate-migration.ts
 */

import { Client } from 'pg'

const OLD_DB_URL = process.env.OLD_DB_URL
const NEW_DB_URL = process.env.NEW_DB_URL

if (!OLD_DB_URL || !NEW_DB_URL) {
  console.error('Set OLD_DB_URL and NEW_DB_URL environment variables.')
  process.exit(1)
}

async function run() {
  const oldDb = new Client({ connectionString: OLD_DB_URL })
  const newDb = new Client({ connectionString: NEW_DB_URL })
  await oldDb.connect()
  await newDb.connect()

  let pass = 0, fail = 0

  const check = (label: string, expected: number, actual: number) => {
    const ok = actual >= expected
    const icon = ok ? '✓' : '✗'
    console.log(`  ${icon} ${label}: expected ≥${expected}, got ${actual}`)
    if (ok) { pass++ } else { fail++ }
  }

  // ── Row counts ────────────────────────────────────────────────────────
  console.log('\n📊 Row count validation:')
  const [ou, ob, od, ov] = await Promise.all([
    oldDb.query('SELECT count(*) FROM users'),
    oldDb.query('SELECT count(*) FROM bookings'),
    oldDb.query('SELECT count(*) FROM drivers'),
    oldDb.query('SELECT count(*) FROM vehicles'),
  ])
  const [nu, nb, nd, nv] = await Promise.all([
    newDb.query('SELECT count(*) FROM users'),
    newDb.query('SELECT count(*) FROM bookings'),
    newDb.query('SELECT count(*) FROM drivers'),
    newDb.query('SELECT count(*) FROM vehicles'),
  ])

  check('Users',    parseInt(ou.rows[0].count), parseInt(nu.rows[0].count))
  check('Bookings', parseInt(ob.rows[0].count), parseInt(nb.rows[0].count))
  check('Drivers',  parseInt(od.rows[0].count), parseInt(nd.rows[0].count))
  check('Vehicles', parseInt(ov.rows[0].count), parseInt(nv.rows[0].count))

  // ── Phone number spot-check ───────────────────────────────────────────
  console.log('\n📱 Phone number format check (first 5 users):')
  const phones = await newDb.query(
    `SELECT phone, name FROM users ORDER BY created_at LIMIT 5`
  )
  for (const row of phones.rows) {
    const valid = /^\d{10,13}$/.test(row.phone)
    const icon = valid ? '✓' : '✗'
    console.log(`  ${icon} ${row.name ?? 'unnamed'}: ${row.phone}`)
    if (valid) { pass++ } else { fail++ }
  }

  // ── Trip code uniqueness ──────────────────────────────────────────────
  console.log('\n🔑 Trip code uniqueness:')
  const dupCodes = await newDb.query(`
    SELECT trip_code, count(*) FROM bookings GROUP BY trip_code HAVING count(*) > 1
  `)
  if (dupCodes.rows.length === 0) {
    console.log('  ✓ All trip codes are unique')
    pass++
  } else {
    console.log(`  ✗ Found ${dupCodes.rows.length} duplicate trip codes`)
    fail++
  }

  // ── Booking → User FK integrity ───────────────────────────────────────
  console.log('\n🔗 Booking → User FK integrity:')
  const orphanBookings = await newDb.query(`
    SELECT count(*) FROM bookings b
    LEFT JOIN users u ON b.user_id = u.id
    WHERE u.id IS NULL
  `)
  const orphans = parseInt(orphanBookings.rows[0].count)
  if (orphans === 0) {
    console.log('  ✓ All bookings have valid user references')
    pass++
  } else {
    console.log(`  ✗ ${orphans} bookings have no matching user`)
    fail++
  }

  // ── Booking status distribution ───────────────────────────────────────
  console.log('\n📈 Booking status distribution (new DB):')
  const statuses = await newDb.query(`
    SELECT status, count(*) FROM bookings GROUP BY status ORDER BY count(*) DESC
  `)
  for (const row of statuses.rows) {
    console.log(`     ${row.status}: ${row.count}`)
  }

  // ── Pricing JSON sanity ───────────────────────────────────────────────
  console.log('\n💰 Pricing JSON sanity (3 samples):')
  const priceSamples = await newDb.query(`
    SELECT id, trip_code, pricing_json FROM bookings
    WHERE pricing_json IS NOT NULL LIMIT 3
  `)
  for (const row of priceSamples.rows) {
    try {
      const p = JSON.parse(row.pricing_json)
      const ok = p.totalPrice != null && p.distanceKm != null
      const icon = ok ? '✓' : '✗'
      console.log(`  ${icon} ${row.trip_code}: ₹${p.totalPrice} · ${p.distanceKm}km`)
      if (ok) { pass++ } else { fail++ }
    } catch {
      console.log(`  ✗ ${row.trip_code}: invalid JSON`)
      fail++
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Result: ${pass} passed, ${fail} failed`)
  if (fail > 0) {
    console.log('⚠️  Fix issues above before going live.')
    process.exit(1)
  } else {
    console.log('✅ All checks passed — safe to go live.')
  }

  await oldDb.end()
  await newDb.end()
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
