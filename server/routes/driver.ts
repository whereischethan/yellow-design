import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import prisma from '../lib/prisma'
import { requireDriver, signDriverToken, DriverRequest } from '../middleware/auth'
import { notifyBookingEvent } from '../lib/notify'
import { slimAssignedDriver, fixAirportStop } from '../lib/shape'

const router = Router()

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || ''
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || ''
const OTP_TTL_SECS = 10 * 60
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

async function sendOtpViaMSG91(phone: string, otp: string): Promise<void> {
  if (!MSG91_AUTH_KEY) {
    console.log(`[DEV] Driver OTP for ${phone}: ${otp}`)
    return
  }
  const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${phone}&otp=${otp}&authkey=${MSG91_AUTH_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to send OTP via MSG91')
}

function tryParse(s: string | null | undefined) {
  if (!s) return null
  try { return JSON.parse(s) } catch { return null }
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

router.post('/auth/verify-otp', async (req: Request, res: Response) => {
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
        pricing: tryParse(b.pricingJson),
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
        pricing: tryParse(b.pricingJson),
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
    // Cancellations are admin-only — drivers report no-shows to ops
    const allowed = ['arrived', 'in_progress', 'completed']
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` })
    }

    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const updated = await prisma.booking.update({
      where: { id: String(req.params.id) },
      data: { status },
    })

    // Update driver status
    if (['in_progress', 'arrived'].includes(status)) {
      await prisma.driver.update({ where: { id: req.driverId }, data: { status: 'on-trip' } })
    } else if (status === 'completed') {
      await prisma.driver.update({
        where: { id: req.driverId },
        data: { status: 'available', trips: { increment: 1 } },
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

router.post('/bookings/:id/create-qr', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const pricing = tryParse(b.pricingJson)
    const amountPaise = (pricing?.totalPrice ?? b.price ?? 0) * 100

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      // Dev fallback: return a UPI deep-link QR
      const driver = await prisma.driver.findUnique({ where: { id: req.driverId } })
      const upiId = driver?.bankUpi || 'yellow@upi'
      const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(driver?.name || 'Yellow Driver')}&am=${pricing?.totalPrice ?? b.price ?? 0}&cu=INR&tn=${encodeURIComponent(`Yellow Trip ${b.tripCode}`)}`
      return res.json({ qr_id: null, image_url: null, upi_string: upiString, amount: pricing?.totalPrice ?? b.price ?? 0, dev_mode: true })
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
    const rpRes = await fetch('https://api.razorpay.com/v1/payments/qr-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        type: 'upi_qr',
        name: `Yellow Trip ${b.tripCode}`,
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: amountPaise,
        description: `Yellow cab fare for ${b.tripCode}`,
        close_by: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      }),
    })

    if (!rpRes.ok) {
      const err = await rpRes.text()
      return res.status(500).json({ error: `Razorpay error: ${err}` })
    }

    const qr = (await rpRes.json()) as any

    // Store QR id on booking
    await prisma.booking.update({
      where: { id: String(req.params.id) },
      data: { razorpayLinkId: qr.id, razorpayLinkUrl: qr.image_url },
    })

    return res.json({ qr_id: qr.id, image_url: qr.image_url, amount: qr.payment_amount / 100 })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.get('/bookings/:id/payment-status', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // If already marked paid
    if (b.paymentStatus === 'paid') {
      return res.json({ paid: true, method: b.paymentMethod })
    }

    // If no QR created yet
    if (!b.razorpayLinkId || !RAZORPAY_KEY_ID) {
      return res.json({ paid: false })
    }

    // Check Razorpay QR payment
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
    const rpRes = await fetch(`https://api.razorpay.com/v1/payments/qr-codes/${b.razorpayLinkId}/payments`, {
      headers: { Authorization: `Basic ${auth}` },
    })

    if (!rpRes.ok) return res.json({ paid: false })

    const data = (await rpRes.json()) as any
    const payments = data.items || []

    if (payments.length > 0 && payments[0].status === 'captured') {
      await prisma.booking.update({
        where: { id: b.id },
        data: { paymentStatus: 'paid', paymentMethod: 'upi', razorpayPaymentId: payments[0].id },
      })
      return res.json({ paid: true, method: 'upi' })
    }

    return res.json({ paid: false })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/bookings/:id/mark-paid', requireDriver, async (req: DriverRequest, res: Response) => {
  try {
    const { method = 'direct' } = req.body
    const b = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!b) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = tryParse(b.assignedDriverJson)
    if (!assignedDriver || assignedDriver.id !== req.driverId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    await prisma.booking.update({
      where: { id: b.id },
      data: { paymentStatus: 'paid', paymentMethod: method },
    })

    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export default router
