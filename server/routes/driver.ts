import { Router, Request, Response } from 'express'
import { randomUUID, randomInt } from 'crypto'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma'
import { requireDriver, signDriverToken, DriverRequest } from '../middleware/auth'
import { notifyBookingEvent } from '../lib/notify'
import { slimAssignedDriver, fixAirportStop } from '../lib/shape'

const router = Router()

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || ''
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || ''
const OTP_TTL_SECS = 10 * 60
const SEND_WINDOW_SECS = 15 * 60
const MAX_SENDS_PER_WINDOW = 3

const verifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone ? String(req.body.phone) : (req.ip ?? 'unknown'),
})
function generateOtp(): string {
  return String(randomInt(1000, 10000))
}

async function sendOtpViaMSG91(phone: string, otp: string): Promise<void> {
  if (!MSG91_AUTH_KEY) {
    console.log(`[DEV] Driver OTP for ${phone}: ${otp}`)
    return
  }
  const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(MSG91_TEMPLATE_ID)}&mobile=${encodeURIComponent(phone)}&otp=${encodeURIComponent(otp)}`
  const res = await fetch(url, { headers: { authkey: MSG91_AUTH_KEY } })
  if (!res.ok) throw new Error('Failed to send OTP via MSG91')
}

function tryParse(s: string | null | undefined) {
  if (!s) return null
  try { return JSON.parse(s) } catch { return null }
}

// Drivers see only an explicit allowlist of pricing fields — never the fare
// breakdown. The total is included only when they collect it (driverCollect).
function driverPricing(pricingJson: string | null | undefined, driverCollect: boolean) {
  const p = tryParse(pricingJson)
  if (!p) return null
  const visible: Record<string, unknown> = {}
  if (p.distanceKm != null) visible.distanceKm = p.distanceKm
  if (p.toll != null) visible.toll = p.toll
  if (driverCollect && p.totalPrice != null) visible.totalPrice = p.totalPrice
  return visible
}

// ── Auth ──────────────────────────────────────────────────────────────────────

router.post('/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone, countryCode = '+91' } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone number required' })

    // Build all candidate formats to handle however the phone was stored in admin
    const digits = phone.replace(/\D/g, '')
    const fullPhone = `${countryCode.replace('+', '')}${digits}` // e.g. 919538244183
    const candidates = [
      digits,                          // 9538244183
      fullPhone,                       // 919538244183
      `+${fullPhone}`,                 // +919538244183
      `${countryCode}${digits}`,       // +919538244183 (same via countryCode)
      `${countryCode} ${digits}`,      // +91 9538244183
    ]

    // Verify this phone belongs to a registered driver (try all formats)
    const driver = await prisma.driver.findFirst({
      where: { phone: { in: candidates } },
    })
    if (!driver) {
      return res.status(404).json({ error: 'No driver account found for this number' })
    }
    if (driver.employmentStatus === 'exited') {
      return res.status(403).json({ error: 'This driver account is deactivated. Contact ops if this is a mistake.' })
    }

    const windowStart = BigInt(Math.floor(Date.now() / 1000) - SEND_WINDOW_SECS)
    const recentCount = await prisma.otpSession.count({
      where: { phone: driver.phone, createdAt: { gt: windowStart } },
    })
    if (recentCount >= MAX_SENDS_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' })
    }

    await prisma.otpSession.deleteMany({ where: { phone: driver.phone, verified: 0 } })

    const otp = generateOtp()
    const id = randomUUID()
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + OTP_TTL_SECS)

    await prisma.otpSession.create({
      data: { id, phone: driver.phone, otp, expiresAt },
    })

    await sendOtpViaMSG91(driver.phone, otp)

    return res.json({ message: 'OTP sent' })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to send OTP' })
  }
})

router.post('/auth/verify-otp', verifyRateLimit, async (req: Request, res: Response) => {
  try {
    const { phone, otp, countryCode = '+91' } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' })

    const digits = phone.replace(/\D/g, '')
    const fullPhone = `${countryCode.replace('+', '')}${digits}`
    const candidates = [
      digits,
      fullPhone,
      `+${fullPhone}`,
      `${countryCode}${digits}`,
      `${countryCode} ${digits}`,
    ]
    const now = BigInt(Math.floor(Date.now() / 1000))

    const session = await prisma.otpSession.findFirst({
      where: {
        phone: { in: candidates },
        otp,
        verified: 0,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!session) return res.status(400).json({ error: 'Invalid or expired OTP' })

    await prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: 1 },
    })

    // Find driver by phone (try all formats)
    const driver = await prisma.driver.findFirst({ where: { phone: { in: candidates } } })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    if (driver.employmentStatus === 'exited') {
      return res.status(403).json({ error: 'This driver account is deactivated. Contact ops if this is a mistake.' })
    }

    const token = signDriverToken(driver.id, driver.phone)

    return res.json({
      token,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        photoUrl: driver.photoUrl,
        rating: driver.rating,
        vehicle: driver.vehicle,
        plate: driver.plate,
        bankUpi: driver.bankUpi,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to verify OTP' })
  }
})

// ── Protected routes (requireDriver) ─────────────────────────────────────────

router.get('/me', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.driverId } })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })

    // 1. Try permanent vehicle assignment (vehicles table)
    let vehicle = await prisma.vehicle.findFirst({ where: { driverId: req.driverId } })

    // 2. Fall back to vehicle from next upcoming booking assigned to this driver
    if (!vehicle) {
      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const upcomingBookings = await prisma.booking.findMany({
        where: {
          status: { notIn: ['cancelled', 'completed'] },
          assignedDriverJson: { contains: req.driverId! },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })
      const nextBooking = upcomingBookings
        .filter((b) => {
          const d = tryParse(b.assignedDriverJson)
          if (!d?.id || d.id !== req.driverId) return false
          const pickup = tryParse(b.pickupJson)
          if (!pickup?.dateTime) return false
          return new Date(pickup.dateTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) >= todayIST
        })
        .sort((a, b) => {
          const ta = tryParse(a.pickupJson)?.dateTime ?? ''
          const tb = tryParse(b.pickupJson)?.dateTime ?? ''
          return ta.localeCompare(tb)
        })[0]

      if (nextBooking) {
        const bv = tryParse(nextBooking.assignedVehicleJson)
        if (bv?.licensePlate) {
          vehicle = await prisma.vehicle.findFirst({ where: { plate: bv.licensePlate } }) ?? null
        }
      }
    }

    const assignedVehicle = vehicle ? {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      licensePlate: vehicle.plate,
      type: vehicle.type,
      soc: vehicle.soc,
      odometer: vehicle.odometer,
      isEv: vehicle.isEv === 1,
    } : null

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        photoUrl: driver.photoUrl,
        rating: driver.rating,
        status: driver.status,
        trips: driver.trips,
        vehicle: driver.vehicle,
        plate: driver.plate,
        bankUpi: driver.bankUpi,
        assignedVehicle,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.get('/bookings', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const { date } = req.query
    // If explicit date requested use it; otherwise show today + upcoming (next 7 days)
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const targetDate = typeof date === 'string' ? date : null

    const allBookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ['cancelled'] },
        assignedDriverJson: { contains: req.driverId! },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const driverBookings = allBookings.filter((b) => {
      const d = tryParse(b.assignedDriverJson)
      if (!d?.id || d.id !== req.driverId) return false
      const pickup = tryParse(b.pickupJson)
      if (!pickup?.dateTime) return false
      const pickupDate = new Date(pickup.dateTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (targetDate) return pickupDate === targetDate
      // Default: today and upcoming (next 7 days)
      return pickupDate >= todayIST
    })

    const userIds = [...new Set(driverBookings.map((b) => b.userId).filter((id): id is string => id != null))]
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true } })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const result = driverBookings.map((b) => {
      const user = b.userId ? userMap.get(b.userId) : null
      return {
        id: b.id,
        tripCode: b.tripCode,
        status: b.status,
        tripType: b.tripType,
        vehicleType: b.vehicleType,
        passengerCount: b.passengerCount,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        driverCollect: b.driverCollect ?? false,
        guestName: b.guestName ?? user?.name ?? null,
        guestPhone: b.guestPhone ?? user?.phone ?? null,
        pickup: fixAirportStop(tryParse(b.pickupJson)),
        drop: fixAirportStop(tryParse(b.dropJson)),
        flight: tryParse(b.flightJson),
        pricing: driverPricing(b.pricingJson, b.driverCollect ?? false),
        assignedDriver: slimAssignedDriver(tryParse(b.assignedDriverJson)),
        assignedVehicle: tryParse(b.assignedVehicleJson),
        stops: tryParse(b.stopsJson),
        createdAt: b.createdAt,
      }
    })

    // Sort by pickup time
    result.sort((a, b) => {
      const ta = a.pickup?.dateTime ? new Date(a.pickup.dateTime).getTime() : 0
      const tb = b.pickup?.dateTime ? new Date(b.pickup.dateTime).getTime() : 0
      return ta - tb
    })

    return res.json({ bookings: result })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.get('/bookings/:id', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    // Verify this booking belongs to this driver
    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const user = b.userId ? await prisma.user.findUnique({ where: { id: b.userId }, select: { name: true, phone: true } }) : null

    return res.json({
      booking: {
        id: b.id,
        tripCode: b.tripCode,
        status: b.status,
        tripType: b.tripType,
        vehicleType: b.vehicleType,
        passengerCount: b.passengerCount,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        driverCollect: b.driverCollect ?? false,
        guestName: b.guestName ?? user?.name ?? null,
        guestPhone: b.guestPhone ?? user?.phone ?? null,
        pickup: fixAirportStop(tryParse(b.pickupJson)),
        drop: fixAirportStop(tryParse(b.dropJson)),
        flight: tryParse(b.flightJson),
        pricing: driverPricing(b.pricingJson, b.driverCollect ?? false),
        assignedDriver: slimAssignedDriver(tryParse(b.assignedDriverJson)),
        assignedVehicle: tryParse(b.assignedVehicleJson),
        stops: tryParse(b.stopsJson),
        createdAt: b.createdAt,
      },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.patch('/bookings/:id/status', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const { status } = req.body
    // Cancellations are admin-only. Legal driver transitions (from → to):
    const DRIVER_TRANSITIONS: Record<string, string[]> = {
      arrived:     ['pending', 'confirmed', 'assigned'],
      in_progress: ['arrived'],
      completed:   ['arrived', 'in_progress'],
      no_show:     ['pending', 'confirmed', 'assigned', 'arrived'],
    }
    const allowedFrom = DRIVER_TRANSITIONS[status]
    if (!allowedFrom) {
      return res.status(400).json({ error: `Status must be one of: ${Object.keys(DRIVER_TRANSITIONS).join(', ')}` })
    }

    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    if (b.status === status) return res.json({ status: b.status }) // idempotent
    if (!allowedFrom.includes(b.status)) {
      return res.status(409).json({ error: `Cannot move booking from '${b.status}' to '${status}'` })
    }

    const updated = await prisma.booking.update({
      where: { id: String(req.params.id) },
      data: { status },
    })

    // Update driver status
    if (['in_progress', 'arrived'].includes(status)) {
      await prisma.driver.update({ where: { id: req.driverId }, data: { status: 'on-trip' } })
    } else if (status === 'no_show') {
      await prisma.driver.update({ where: { id: req.driverId }, data: { status: 'available' } })
    } else if (status === 'completed') {
      await prisma.driver.update({
        where: { id: req.driverId },
        data: {
          status: 'available',
          // Only increment if not already completed — prevents double-count if admin also patches
          ...(b.status !== 'completed' ? { trips: { increment: 1 } } : {}),
        },
      })
    }

    notifyBookingEvent(updated, status)

    return res.json({ status: updated.status })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ── Location ──────────────────────────────────────────────────────────────────

router.post('/location', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const { lat, lng, heading, speed } = req.body
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) ||
        latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'Valid lat and lng required' })
    }
    const headingNum = Number.isFinite(Number(heading)) ? Number(heading) : null
    const speedNum = Number.isFinite(Number(speed)) ? Number(speed) : null

    await prisma.driverLocation.upsert({
      where: { driverId: req.driverId! },
      create: { driverId: req.driverId!, lat: latNum, lng: lngNum, heading: headingNum, speed: speedNum },
      update: { lat: latNum, lng: lngNum, heading: headingNum, speed: speedNum },
    })
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ── Push token ────────────────────────────────────────────────────────────────

router.post('/push-token', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const { token, platform } = req.body
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' })
    await prisma.pushToken.upsert({
      where: { token },
      create: { token, ownerType: 'driver', ownerId: req.driverId!, platform: platform ?? null },
      update: { ownerType: 'driver', ownerId: req.driverId!, platform: platform ?? null },
    })
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ── Shifts ────────────────────────────────────────────────────────────────────

router.post('/shifts/clock-in', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const existing = await prisma.shift.findFirst({ where: { driverId: req.driverId!, status: 'active' } })
    if (existing) return res.json({ shift: existing })

    const { odometer } = req.body
    const vehicle = await prisma.vehicle.findFirst({ where: { driverId: req.driverId } })
    const shift = await prisma.shift.create({
      data: {
        driverId: req.driverId!,
        vehicleId: vehicle?.id ?? null,
        clockInOdometer: odometer != null ? parseFloat(odometer) : null,
      },
    })
    return res.json({ shift })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/shifts/clock-out', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const active = await prisma.shift.findFirst({ where: { driverId: req.driverId!, status: 'active' } })
    if (!active) return res.status(400).json({ error: 'No active shift to clock out of' })

    const { odometer } = req.body
    const shift = await prisma.shift.update({
      where: { id: active.id },
      data: {
        status: 'closed',
        clockOutAt: new Date(),
        clockOutOdometer: odometer != null ? parseFloat(odometer) : null,
      },
    })
    return res.json({ shift })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.get('/shifts/active', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const shift = await prisma.shift.findFirst({ where: { driverId: req.driverId!, status: 'active' } })
    return res.json({ shift })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ── Readings ──────────────────────────────────────────────────────────────────

router.post('/readings', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const { bookingId, type, odometer, soc } = req.body
    const validTypes = ['handoff', 'trip_start', 'trip_end', 'close_duty', 'clock_in']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` })
    }

    const reading = await prisma.driverReading.create({
      data: {
        driverId: req.driverId!,
        bookingId: bookingId || null,
        type,
        odometer: odometer != null ? parseFloat(odometer) : null,
        soc: soc != null ? parseFloat(soc) : null,
      },
    })

    // If we have soc reading, sync to vehicle record
    if (soc != null) {
      const vehicle = await prisma.vehicle.findFirst({ where: { driverId: req.driverId } })
      if (vehicle) {
        const updateData: any = { soc: Math.round(parseFloat(soc)) }
        if (odometer != null) updateData.odometer = Math.round(parseFloat(odometer))
        await prisma.vehicle.update({ where: { id: vehicle.id }, data: updateData })
      }
    }

    return res.json({ reading })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.get('/readings/today', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const readings = await prisma.driverReading.findMany({
      where: {
        driverId: req.driverId,
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'asc' },
    })

    return res.json({ readings })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ── Payment ───────────────────────────────────────────────────────────────────

// Direct UPI collection (BHIM / Google Pay for Business VPA) — no gateway fee.
// Returns a upi:// intent string; the app renders the QR locally. The business
// VPA is configured in Settings (pricing_config); driver's own UPI is the fallback.
router.post('/bookings/:id/create-qr', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const pricing = tryParse(b.pricingJson)
    const amount = Number(pricing?.totalPrice ?? b.price ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Booking has no fare amount — ask ops to set the price before collecting' })
    }

    const cfg = await prisma.pricingConfig.findMany({ where: { key: { in: ['business_upi_vpa', 'business_upi_name'] } } })
    const kv = Object.fromEntries(cfg.map((r) => [r.key, r.value]))
    let vpa = kv.business_upi_vpa?.trim()
    let payee = kv.business_upi_name?.trim() || 'Yellow'
    if (!vpa) {
      const driver = await prisma.driver.findUnique({ where: { id: req.driverId } })
      vpa = driver?.bankUpi?.trim() || ''
      payee = driver?.name || payee
    }
    if (!vpa) {
      return res.status(400).json({ error: 'No UPI ID configured — set the business UPI in admin Settings' })
    }

    const upiString = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Yellow Trip ${b.tripCode}`)}`
    return res.json({ upi_string: upiString, vpa, amount })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// Payment state is driver-reported (verified later by ops in Finance) — this
// only reflects what's on the booking record.
router.get('/bookings/:id/payment-status', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    return res.json({ paid: b.paymentStatus === 'paid', method: b.paymentMethod })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/bookings/:id/mark-paid', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const { method } = req.body
    if (!['cash', 'upi'].includes(method)) {
      return res.status(400).json({ error: 'method must be cash or upi' })
    }
    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.booking.update({
      where: { id: b.id },
      // driverReported: ops verifies these against the bank/UPI statement in Finance
      data: { paymentStatus: 'paid', paymentMethod: method, driverReported: true },
    })

    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export default router
