import { Router, Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod'
const ADMIN_KEY = process.env.ADMIN_KEY || 'yellow-ops-dev'
const ADMIN_PHONES_RAW = process.env.ADMIN_PHONES || ''
const ADMIN_PHONES: Set<string> = new Set(
  ADMIN_PHONES_RAW.split(',').map((p) => p.trim()).filter(Boolean)
)

function signAdminToken(phone: string): string {
  return jwt.sign({ adminPhone: phone, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' })
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Accept legacy key header
  if (req.headers['x-admin-key'] === ADMIN_KEY) return next()

  // Accept admin JWT via Bearer token
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any
      if (payload?.role === 'admin') return next()
    } catch {}
  }

  return res.status(401).json({ error: 'Unauthorized' })
}

// ─── Admin OTP login (public — no auth) ──────────────────────────────────────

const OTP_TTL_SECS = 10 * 60

function genOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

router.post('/login/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'phone required' })

    if (ADMIN_PHONES.size > 0 && !ADMIN_PHONES.has(phone)) {
      return res.status(403).json({ error: 'Phone not authorised as admin' })
    }

    const otp = genOtp()
    const id = randomUUID()
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + OTP_TTL_SECS)
    await prisma.otpSession.create({ data: { id, phone, otp, expiresAt } })

    const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || ''
    const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || ''
    // MSG91 needs full number with country code (no +): 10-digit Indian → prepend 91
    const mobile = phone.length === 10 ? `91${phone}` : phone
    if (MSG91_AUTH_KEY) {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${mobile}&otp=${otp}&authkey=${MSG91_AUTH_KEY}`
      const r = await fetch(url)
      if (!r.ok) {
        const body = await r.text().catch(() => '')
        console.error(`[ADMIN OTP] MSG91 error for ${mobile}: ${r.status} ${body}`)
      }
    } else {
      console.log(`[ADMIN OTP] ${mobile}: ${otp}`)
    }

    return res.json({ message: 'OTP sent' })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/login/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'phone and otp required' })

    const now = BigInt(Math.floor(Date.now() / 1000))
    const session = await prisma.otpSession.findFirst({
      where: { phone, otp, expiresAt: { gt: now }, verified: 0 },
      orderBy: { createdAt: 'desc' },
    })

    if (!session) return res.status(400).json({ error: 'Invalid or expired OTP' })

    await prisma.otpSession.update({ where: { id: session.id }, data: { verified: 1 } })

    const token = signAdminToken(phone)
    return res.json({ token })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.use(requireAdmin)

// ─── Auth check ───────────────────────────────────────────────────────────────

router.get('/me', (_req, res) => {
  res.json({ ok: true })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBooking(row: any) {
  return {
    id: row.id,
    tripCode: row.tripCode,
    userId: row.userId,
    status: row.status,
    tripType: row.tripType,
    vehicleType: row.vehicleType,
    passengers: row.passengerCount,
    luggage: row.bags,
    pickup: row.pickupJson ? JSON.parse(row.pickupJson) : null,
    drop: row.dropJson ? JSON.parse(row.dropJson) : null,
    flight: row.flightJson ? JSON.parse(row.flightJson) : null,
    pricing: row.pricingJson ? JSON.parse(row.pricingJson) : null,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    assignedDriver: row.assignedDriverJson ? JSON.parse(row.assignedDriverJson) : null,
    assignedVehicle: row.assignedVehicleJson ? JSON.parse(row.assignedVehicleJson) : null,
    paymentStatus: row.paymentStatus || 'paid',
    createdAt: row.createdAt,
  }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

router.get('/bookings', async (_req, res) => {
  try {
    const rows = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ bookings: rows.map(buildBooking) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/bookings', async (req, res) => {
  try {
    const { tripType, vehicleType = 'yellowSky', passengers = 1, luggage = 0,
      pickup, drop, flight, pricing, guestName, guestPhone, userId } = req.body
    if (!pickup || !drop || !pricing) return res.status(400).json({ error: 'pickup, drop, pricing required' })

    const id = randomUUID()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let tripCode = 'YL-'
    for (let i = 0; i < 6; i++) tripCode += chars[Math.floor(Math.random() * chars.length)]

    const row = await prisma.booking.create({
      data: {
        id,
        tripCode,
        userId: userId || 'admin',
        tripType,
        vehicleType,
        price: pricing.totalPrice ?? 0,
        passengerCount: passengers,
        bags: luggage,
        pickupJson: JSON.stringify(pickup),
        dropJson: JSON.stringify(drop),
        flightJson: flight ? JSON.stringify(flight) : null,
        pricingJson: JSON.stringify(pricing),
        guestName: guestName ?? null,
        guestPhone: guestPhone ?? null,
        status: 'confirmed',
      },
    })
    res.json({ booking: buildBooking(row) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/bookings/:id', async (req, res) => {
  try {
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })

    const { status, assignedDriver, assignedVehicle } = req.body
    const data: any = {}

    if (status !== undefined) data.status = status
    if (assignedDriver !== undefined) data.assignedDriverJson = assignedDriver ? JSON.stringify(assignedDriver) : null
    if (assignedVehicle !== undefined) data.assignedVehicleJson = assignedVehicle ? JSON.stringify(assignedVehicle) : null

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.booking.update({ where: { id: String(req.params.id) }, data })

    if (assignedDriver?.id) {
      await prisma.driver.update({ where: { id: assignedDriver.id }, data: { status: 'on-trip' } }).catch(() => {})
    }

    res.json({ booking: buildBooking(updated) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Drivers ──────────────────────────────────────────────────────────────────

router.get('/drivers', async (_req, res) => {
  try {
    const rows = await prisma.driver.findMany({ orderBy: { name: 'asc' } })
    res.json({ drivers: rows })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/drivers', async (req, res) => {
  const { name, phone, plate, vehicle } = req.body
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' })
  try {
    const id = 'd' + randomUUID().slice(0, 8)
    const today = new Date().toISOString().slice(0, 10)
    const row = await prisma.driver.create({
      data: {
        id,
        name,
        phone,
        plate: plate ?? null,
        vehicle: vehicle ?? 'Kia Carens Clavis',
        joined: today,
      },
    })
    res.json({ driver: row })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.patch('/drivers/:id', async (req, res) => {
  try {
    const row = await prisma.driver.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Driver not found' })

    const allowed = ['status', 'name', 'phone', 'rating', 'plate', 'vehicle']
    const data: any = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.driver.update({ where: { id: String(req.params.id) }, data })
    res.json({ driver: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Vehicles ─────────────────────────────────────────────────────────────────

router.get('/vehicles', async (_req, res) => {
  try {
    const rows = await prisma.vehicle.findMany({
      include: { driver: { select: { name: true, status: true, phone: true } } },
      orderBy: { plate: 'asc' },
    })
    const vehicles = rows.map(v => ({
      ...v,
      driver_name: v.driver?.name ?? null,
      driver_status: v.driver?.status ?? null,
      driver_phone: v.driver?.phone ?? null,
      driver: undefined,
    }))
    res.json({ vehicles })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/vehicles', async (req, res) => {
  const { plate, make, model, color = 'Yellow', type = 'yellowSky', class_key = 'yellowSky',
    year = 2024, is_ev = 1, soc = 80, odometer = 0, insurance_expiry, driver_id } = req.body
  if (!plate || !make || !model) return res.status(400).json({ error: 'plate, make, model required' })
  try {
    const id = 'v' + randomUUID().slice(0, 8)
    const vehicle = await prisma.vehicle.create({
      data: {
        id,
        plate: plate.toUpperCase(),
        make,
        model,
        color,
        type,
        classKey: class_key,
        year,
        isEv: is_ev,
        soc,
        odometer,
        insuranceExpiry: insurance_expiry ?? null,
        driverId: driver_id ?? null,
      },
      include: { driver: { select: { name: true } } },
    })

    if (driver_id) {
      await prisma.driver.update({
        where: { id: driver_id },
        data: { plate: plate.toUpperCase(), vehicle: `${make} ${model}` },
      }).catch(() => {})
    }

    res.json({ vehicle: { ...vehicle, driver_name: vehicle.driver?.name ?? null, driver: undefined } })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.patch('/vehicles/:id', async (req, res) => {
  try {
    const row = await prisma.vehicle.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Vehicle not found' })

    const fieldMap: Record<string, string> = {
      status: 'status', driver_id: 'driverId', make: 'make', model: 'model',
      color: 'color', plate: 'plate', soc: 'soc', odometer: 'odometer',
      insurance_expiry: 'insuranceExpiry', maintenance_note: 'maintenanceNote',
      class_key: 'classKey', year: 'year',
    }
    const data: any = {}
    for (const [rawKey, prismaKey] of Object.entries(fieldMap)) {
      if (req.body[rawKey] !== undefined) data[prismaKey] = req.body[rawKey]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.vehicle.update({
      where: { id: String(req.params.id) },
      data,
      include: { driver: { select: { name: true, status: true, phone: true } } },
    })
    res.json({
      vehicle: {
        ...updated,
        driver_name: updated.driver?.name ?? null,
        driver_status: updated.driver?.status ?? null,
        driver_phone: updated.driver?.phone ?? null,
        driver: undefined,
      },
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Customers ────────────────────────────────────────────────────────────────

router.get('/customers', async (_req, res) => {
  try {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    const tripCounts = await prisma.booking.groupBy({
      by: ['userId'],
      _count: { id: true },
    })
    const countMap = new Map(tripCounts.map(t => [t.userId, t._count.id]))

    const customers = rows.map(u => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      email: u.email,
      created_at: u.createdAt,
      trip_count: countMap.get(u.id) ?? 0,
    }))
    res.json({ customers })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/customers/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const allowed = ['name', 'email']
    const data: any = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key] || null
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.user.update({ where: { id: String(req.params.id) }, data })
    res.json({ customer: { id: updated.id, phone: updated.phone, name: updated.name, email: updated.email, created_at: updated.createdAt } })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/customers/:id/bookings', async (req, res) => {
  try {
    const rows = await prisma.booking.findMany({
      where: { userId: String(req.params.id) },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ bookings: rows.map(buildBooking) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Leads ────────────────────────────────────────────────────────────────────

router.get('/leads', async (_req, res) => {
  try {
    const rows = await prisma.lead.findMany({
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { quotedAt: 'desc' },
    })
    res.json({
      leads: rows.map(r => ({
        ...r,
        user_name: r.user?.name ?? null,
        user_phone: r.user?.phone ?? null,
        pickup: r.pickupJson ? JSON.parse(r.pickupJson) : null,
        drop: r.dropJson ? JSON.parse(r.dropJson) : null,
        user: undefined,
      })),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/leads', async (req, res) => {
  const { userId, tripType, pickup, drop, price, pickupTime, flight } = req.body
  if (!userId || !pickup || !price) return res.status(400).json({ error: 'userId, pickup, price required' })
  try {
    const id = 'l' + randomUUID().slice(0, 8)
    const row = await prisma.lead.create({
      data: {
        id,
        userId,
        tripType: tripType ?? 'drop',
        pickupJson: JSON.stringify(pickup),
        dropJson: drop ? JSON.stringify(drop) : null,
        price,
        pickupTime: pickupTime ?? null,
        flight: flight ?? null,
      },
    })
    res.json({ lead: row })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.patch('/leads/:id', async (req, res) => {
  try {
    const row = await prisma.lead.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Lead not found' })

    const fieldMap: Record<string, string> = { status: 'status', caller_note: 'callerNote', trip_code: 'tripCode' }
    const data: any = {}
    for (const [rawKey, prismaKey] of Object.entries(fieldMap)) {
      if (req.body[rawKey] !== undefined) data[prismaKey] = req.body[rawKey]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.lead.update({ where: { id: String(req.params.id) }, data })
    res.json({ lead: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Pricing config ───────────────────────────────────────────────────────────

router.get('/pricing', async (_req, res) => {
  try {
    const rows = await prisma.pricingConfig.findMany()
    const config: Record<string, string> = {}
    for (const { key, value } of rows) config[key] = value
    res.json({ config })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/pricing', async (req, res) => {
  try {
    const { config } = req.body
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'config object required' })

    await Promise.all(
      Object.entries(config).map(([key, value]) =>
        prisma.pricingConfig.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    )

    const rows = await prisma.pricingConfig.findMany()
    const updated: Record<string, string> = {}
    for (const { key, value } of rows) updated[key] = value
    res.json({ config: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', async (_req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayStr = today.toISOString().slice(0, 19)
    const tomorrowStr = tomorrow.toISOString().slice(0, 19)

    // Use raw for date range since createdAt is stored as TEXT
    const todayBookings = await prisma.$queryRaw<any[]>`
      SELECT * FROM bookings WHERE created_at >= ${todayStr} AND created_at < ${tomorrowStr}
    `

    const ridesToday = todayBookings.filter((b: any) => b.status !== 'cancelled').length
    const revenueToday = todayBookings
      .filter((b: any) => b.status !== 'cancelled')
      .reduce((s: number, b: any) => s + (b.price || 0), 0)

    const driversActive = await prisma.driver.count({ where: { status: { not: 'offline' } } })
    const pendingCount = await prisma.booking.count({ where: { status: 'pending' } })

    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 3600000)
    const nowStr = now.toISOString()
    const twoHoursLaterStr = twoHoursLater.toISOString()

    const nextTwoHoursResult = await prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*) as cnt FROM bookings
      WHERE status IN ('pending','confirmed','assigned')
      AND pickup_json::json->>'dateTime' BETWEEN ${nowStr} AND ${twoHoursLaterStr}
    `
    const nextTwoHours = Number(nextTwoHoursResult[0]?.cnt ?? 0)

    const openLeads = await prisma.lead.count({ where: { status: { in: ['new', 'called'] } } })

    res.json({ ridesToday, revenueToday, driversActive, pendingCount, nextTwoHours, openLeads })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
