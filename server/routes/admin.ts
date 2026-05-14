import { Router, Request, Response, NextFunction } from 'express'
import { randomUUID, createHmac } from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { sendStatusSms, collectPhones } from '../lib/sms'
import { genTripCode } from '../lib/tripcode'

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''
const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod'
const ADMIN_KEY = process.env.ADMIN_KEY || 'yellow-ops-dev'

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

const ADMIN_PHONES = (process.env.ADMIN_PHONES || '')
  .split(',').map(p => p.trim().replace(/\D/g, '').slice(-10)).filter(Boolean)

// Compare on last 10 digits so +91/91 prefix variations don't matter
const last10 = (s: string) => s.replace(/\D/g, '').slice(-10)

async function isAdminPhone(phone: string): Promise<boolean> {
  const n = last10(phone)
  try {
    const all = await prisma.adminUser.findMany({ select: { phone: true } })
    if (all.some(r => last10(r.phone) === n)) return true
  } catch {}
  if (ADMIN_PHONES.length > 0) return ADMIN_PHONES.includes(n)
  return false
}

router.post('/login/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone, countryCode = '+91' } = req.body
    if (!phone) return res.status(400).json({ error: 'phone required' })

    const mobile = `${countryCode.replace('+', '')}${phone}`

    if (!(await isAdminPhone(mobile))) {
      return res.status(403).json({ error: 'Phone not authorised as admin' })
    }

    const otp = genOtp()
    const id = randomUUID()
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + OTP_TTL_SECS)
    await prisma.otpSession.create({ data: { id, phone: mobile, otp, expiresAt } })

    const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || ''
    const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || ''
    if (MSG91_AUTH_KEY && countryCode === '+91') {
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
    const { phone, otp, countryCode = '+91' } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'phone and otp required' })
    const mobile = phone.includes(countryCode.replace('+', '')) ? phone : `${countryCode.replace('+', '')}${phone}`

    const now = BigInt(Math.floor(Date.now() / 1000))
    const session = await prisma.otpSession.findFirst({
      where: { phone: mobile, otp, expiresAt: { gt: now }, verified: 0 },
      orderBy: { createdAt: 'desc' },
    })

    if (!session) return res.status(400).json({ error: 'Invalid or expired OTP' })

    await prisma.otpSession.update({ where: { id: session.id }, data: { verified: 1 } })

    const normalizedPhone = last10(mobile)
    let adminName: string | null = null
    let adminRole = 'ops'
    try {
      const adminUser = await prisma.adminUser.upsert({
        where: { phone: normalizedPhone },
        update: {},
        create: { id: randomUUID(), phone: normalizedPhone, role: 'superadmin' },
      })
      adminName = adminUser.name ?? null
      adminRole = adminUser.role
    } catch {}
    const token = signAdminToken(normalizedPhone)
    return res.json({
      token,
      admin: { phone: mobile, name: adminName, role: adminRole },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ─── Razorpay webhook (public — no auth) ─────────────────────────────────────

router.post('/razorpay-webhook', async (req: Request, res: Response) => {
  try {
    if (RAZORPAY_WEBHOOK_SECRET) {
      const sig = req.headers['x-razorpay-signature'] as string
      const rawBody: Buffer = (req as any).rawBody
      if (!sig || !rawBody) return res.status(400).json({ error: 'Missing signature or body' })
      const computed = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')
      if (computed !== sig) return res.status(400).json({ error: 'Invalid signature' })
    }

    const event = req.body?.event as string
    if (event === 'payment_link.paid') {
      const linkId = req.body?.payload?.payment_link?.entity?.id as string
      const paymentId = req.body?.payload?.payment?.entity?.id as string
      if (linkId) {
        await prisma.booking.updateMany({
          where: { razorpayLinkId: linkId },
          data: { paymentStatus: 'paid', paymentMethod: 'upi', razorpayPaymentId: paymentId ?? null },
        })
      }
    }
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.use(requireAdmin)

// ─── Auth check ───────────────────────────────────────────────────────────────

router.get('/me', (_req, res) => {
  res.json({ ok: true })
})

// ─── OTP lookup (for WhatsApp verification relay) ─────────────────────────────

router.get('/otp-lookup', async (req, res) => {
  try {
    const { phone } = req.query
    if (!phone) return res.status(400).json({ error: 'phone required' })
    const now = BigInt(Math.floor(Date.now() / 1000))
    const session = await prisma.otpSession.findFirst({
      where: { phone: String(phone), expiresAt: { gt: now }, verified: 0 },
      orderBy: { createdAt: 'desc' },
    })
    if (!session) return res.status(404).json({ error: 'No active OTP found for this phone' })
    return res.json({ phone: session.phone, otp: session.otp })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBooking(row: any) {
  return {
    id: row.id,
    tripCode: row.tripCode,
    userId: row.userId,
    userName: row.user?.name ?? null,
    userPhone: row.user?.phone ?? null,
    status: row.status,
    tripType: row.tripType,
    vehicleType: row.vehicleType,
    passengers: row.passengerCount,
    luggage: row.bags,
    cabinBags: row.cabinBags ?? 0,
    pickup: row.pickupJson ? JSON.parse(row.pickupJson) : null,
    drop: row.dropJson ? JSON.parse(row.dropJson) : null,
    stops: row.stopsJson ? JSON.parse(row.stopsJson) : null,
    flight: row.flightJson ? JSON.parse(row.flightJson) : null,
    pricing: row.pricingJson ? JSON.parse(row.pricingJson) : null,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    assignedDriver: row.assignedDriverJson ? JSON.parse(row.assignedDriverJson) : null,
    assignedVehicle: row.assignedVehicleJson ? JSON.parse(row.assignedVehicleJson) : null,
    paymentStatus: row.paymentStatus || 'pending',
    paymentMethod: row.paymentMethod ?? null,
    razorpayPaymentId: row.razorpayPaymentId ?? null,
    razorpayLinkId: row.razorpayLinkId ?? null,
    razorpayLinkUrl: row.razorpayLinkUrl ?? null,
    createdAt: row.createdAt,
  }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

router.get('/bookings', async (_req, res) => {
  try {
    const rows = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' } })
    const userIds = [...new Set(rows.map(r => r.userId).filter((id): id is string => id != null))]
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true } })
    const userMap = new Map(users.map(u => [u.id, u]))
    res.json({ bookings: rows.map(r => buildBooking({ ...r, user: (r.userId ? userMap.get(r.userId) : null) ?? null })) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/bookings/:id', async (req, res) => {
  try {
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })
    const user = row.userId ? await prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, name: true, phone: true } }) : null
    res.json({ booking: buildBooking({ ...row, user }) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/bookings', async (req, res) => {
  try {
    const { tripType, vehicleType = 'yellowSky', passengers = 1, luggage = 0, cabinBags = 0,
      pickup, drop, stops, flight, pricing, guestName, guestPhone, userId,
      assignedDriver, assignedVehicle } = req.body
    if (!pickup || !drop || !pricing) return res.status(400).json({ error: 'pickup, drop, pricing required' })

    const id = randomUUID()
    const tripCode = await genTripCode()
    const bookingStatus = assignedDriver ? 'assigned' : 'confirmed'

    // Resolve userId: explicit > find/create by guestPhone > null
    let resolvedUserId: string | null = userId || null
    if (!resolvedUserId && guestPhone) {
      const normalizedPhone = guestPhone.replace(/\D/g, '').replace(/^0+/, '')
      let guestUser = await prisma.user.findFirst({ where: { phone: { endsWith: normalizedPhone.slice(-10) } } })
      if (!guestUser) {
        guestUser = await prisma.user.create({ data: { id: randomUUID(), phone: normalizedPhone, name: guestName ?? null } })
      }
      resolvedUserId = guestUser.id
    }

    const row = await prisma.booking.create({
      data: {
        id,
        tripCode,
        userId: resolvedUserId,
        tripType,
        vehicleType,
        price: pricing.totalPrice ?? 0,
        passengerCount: passengers,
        bags: luggage,
        cabinBags,
        pickupJson: JSON.stringify(pickup),
        dropJson: JSON.stringify(drop),
        stopsJson: stops?.length ? JSON.stringify(stops) : null,
        flightJson: flight ? JSON.stringify(flight) : null,
        pricingJson: JSON.stringify(pricing),
        guestName: guestName ?? null,
        guestPhone: guestPhone ?? null,
        assignedDriverJson: assignedDriver ? JSON.stringify(assignedDriver) : null,
        assignedVehicleJson: assignedVehicle ? JSON.stringify(assignedVehicle) : null,
        status: bookingStatus,
        paymentStatus: 'pending',
      },
    })

    // Driver status unchanged on creation — they're only marked on-trip when the trip goes in_progress

    // Fire confirmation SMS (non-blocking)
    ;(async () => {
      try {
        const user = resolvedUserId ? await prisma.user.findUnique({ where: { id: resolvedUserId }, select: { phone: true } }) : null
        const phones = collectPhones(user?.phone, guestPhone ?? null)
        const pickupDateTime = pickup?.dateTime
        for (const phone of phones) {
          sendStatusSms(phone, row.tripCode, bookingStatus, { tripType, pickupDateTime }).catch(() => {})
        }
      } catch {}
    })()

    const userForBooking = resolvedUserId ? await prisma.user.findUnique({ where: { id: resolvedUserId }, select: { id: true, name: true, phone: true } }) : null
    res.json({ booking: buildBooking({ ...row, user: userForBooking }) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/bookings/:id', async (req, res) => {
  try {
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })

    const { status, assignedDriver, assignedVehicle, paymentStatus, paymentMethod,
            pickupDateTime, guestName, guestPhone, price } = req.body
    const data: any = {}

    if (status !== undefined) data.status = status
    if (assignedDriver !== undefined) data.assignedDriverJson = assignedDriver ? JSON.stringify(assignedDriver) : null
    if (assignedVehicle !== undefined) data.assignedVehicleJson = assignedVehicle ? JSON.stringify(assignedVehicle) : null
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod
    if (guestName !== undefined) data.guestName = guestName || null
    if (guestPhone !== undefined) data.guestPhone = guestPhone || null
    if (price !== undefined) data.price = Number(price)
    if (pickupDateTime !== undefined && row.pickupJson) {
      const pickup = JSON.parse(row.pickupJson)
      pickup.dateTime = pickupDateTime
      data.pickupJson = JSON.stringify(pickup)
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.booking.update({ where: { id: String(req.params.id) }, data })

    if (assignedDriver?.id) {
      const activeStatuses = ['in_progress', 'arrived', 'enroute']
      const driverStatus = (status === 'completed' || status === 'cancelled') ? 'available'
        : activeStatuses.includes(status) ? 'on-trip'
        : undefined
      if (driverStatus) {
        await prisma.driver.update({ where: { id: assignedDriver.id }, data: { status: driverStatus } }).catch(() => {})
      }
    } else if (status === 'completed' || status === 'cancelled') {
      const existingDriverJson = updated.assignedDriverJson ?? row.assignedDriverJson
      if (existingDriverJson) {
        const existingDriver = JSON.parse(existingDriverJson)
        if (existingDriver?.id) {
          await prisma.driver.update({ where: { id: existingDriver.id }, data: { status: 'available' } }).catch(() => {})
        }
      }
    }

    // Fire SMS notifications (non-blocking)
    if (status && ['confirmed', 'assigned', 'in_progress', 'arrived', 'completed', 'cancelled'].includes(status)) {
      ;(async () => {
        try {
          const user = updated.userId ? await prisma.user.findUnique({ where: { id: updated.userId }, select: { phone: true } }) : null
          const phones = collectPhones(user?.phone, updated.guestPhone)
          const driver = assignedDriver ?? (updated.assignedDriverJson ? JSON.parse(updated.assignedDriverJson) : null)
          const vehicle = updated.assignedVehicleJson ? JSON.parse(updated.assignedVehicleJson) : null
          const pickup = updated.pickupJson ? JSON.parse(updated.pickupJson) : null
          const ctx = {
            tripType: updated.tripType ?? undefined,
            pickupDateTime: pickup?.dateTime,
            driverName: driver?.name,
            vehiclePlate: vehicle?.licensePlate ?? driver?.plate,
          }
          for (const phone of phones) {
            sendStatusSms(phone, updated.tripCode, status, ctx).catch(() => {})
          }
        } catch {}
      })()
    }

    // Increment driver and vehicle trip count on completion
    if (status === 'completed') {
      const driverJson = updated.assignedDriverJson ?? row.assignedDriverJson
      if (driverJson) {
        const d = JSON.parse(driverJson)
        if (d?.id) {
          await prisma.driver.update({ where: { id: d.id }, data: { trips: { increment: 1 } } }).catch(() => {})
        }
      }
      const vehicleJson = updated.assignedVehicleJson ?? row.assignedVehicleJson
      if (vehicleJson) {
        const v = JSON.parse(vehicleJson)
        if (v?.licensePlate) {
          await prisma.vehicle.updateMany({ where: { plate: v.licensePlate }, data: { trips: { increment: 1 } } }).catch(() => {})
        }
      }
    }

    // Award referrer ₹100 after referee's first completed ride
    if (status === 'completed' && updated.userId) {
      ;(async () => {
        try {
          const rider = await prisma.user.findUnique({
            where: { id: updated.userId! },
            select: { referredById: true },
          })
          if (rider?.referredById) {
            const completedCount = await prisma.booking.count({
              where: { userId: updated.userId!, status: 'completed' },
            })
            if (completedCount === 1) {
              await prisma.user.update({
                where: { id: rider.referredById },
                data: { referralCredits: { increment: 100 } },
              })
            }
          }
        } catch (err) {
          console.error('[REFERRAL] Failed to award referrer credits:', err)
        }
      })()
    }

    res.json({ booking: buildBooking(updated) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Delete booking ───────────────────────────────────────────────────────────

router.delete('/bookings/:id', async (req, res) => {
  try {
    await prisma.booking.delete({ where: { id: String(req.params.id) } })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Payment link ─────────────────────────────────────────────────────────────

router.post('/bookings/:id/payment-link', async (req, res) => {
  try {
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })
    if (row.paymentStatus === 'paid' && row.razorpayPaymentId) return res.status(400).json({ error: 'Booking already paid' })

    // Return existing link if already generated
    if (row.razorpayLinkUrl) {
      return res.json({ linkUrl: row.razorpayLinkUrl, linkId: row.razorpayLinkId })
    }

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)' })
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
    const r = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify({
        upi_link: true,
        amount: (row.price ?? 0) * 100,
        currency: 'INR',
        description: `Trip ${row.tripCode}`,
        reference_id: row.tripCode,
        notify: { sms: false, email: false },
      }),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return res.status(502).json({ error: `Razorpay error: ${body}` })
    }
    const data = await r.json() as any
    const linkId: string = data.id
    const linkUrl: string = data.short_url

    await prisma.booking.update({
      where: { id: row.id },
      data: { razorpayLinkId: linkId, razorpayLinkUrl: linkUrl },
    })

    res.json({ linkUrl, linkId })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Sync payment status from Razorpay ────────────────────────────────────────

router.post('/bookings/:id/sync-payment', async (req, res) => {
  try {
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })
    if (!row.razorpayLinkId) return res.status(400).json({ error: 'No payment link on this booking' })
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return res.status(500).json({ error: 'Razorpay not configured' })

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
    const r = await fetch(`https://api.razorpay.com/v1/payment_links/${row.razorpayLinkId}`, {
      headers: { 'Authorization': `Basic ${auth}` },
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return res.status(502).json({ error: `Razorpay error: ${body}` })
    }
    const data = await r.json() as any

    if (data.status === 'paid') {
      const paymentId = (data.payments?.[0]?.razorpay_payment_id) ?? null
      const updated = await prisma.booking.update({
        where: { id: row.id },
        data: { paymentStatus: 'paid', paymentMethod: 'upi', razorpayPaymentId: paymentId },
      })
      return res.json({ booking: buildBooking(updated), synced: true })
    }

    // Not yet paid — return current booking unchanged
    res.json({ booking: buildBooking(row), synced: false })
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

router.get('/drivers/:id/bookings', async (req, res) => {
  try {
    const driverId = String(req.params.id)
    const rows = await prisma.booking.findMany({
      where: { assignedDriverJson: { contains: driverId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const bookings = rows.map(buildBooking)
    const completed = bookings.filter(b => b.status === 'completed')
    const totalEarnings = completed.reduce((sum, b) => sum + (b.pricing?.totalPrice ?? 0), 0)
    // Sync trips count so the list stays accurate
    await prisma.driver.update({ where: { id: driverId }, data: { trips: completed.length } }).catch(() => {})
    res.json({ bookings, completedCount: completed.length, totalEarnings })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/drivers', async (req, res) => {
  const { name, phone, plate, vehicle, doc_license, doc_aadhaar, doc_pan, doc_police, license_no, license_exp, photo_url } = req.body
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
        docLicense: doc_license ?? null,
        docAadhaar: doc_aadhaar ?? null,
        docPan: doc_pan ?? null,
        docPolice: doc_police ?? null,
        licenseNo: license_no ?? null,
        licenseExp: license_exp ?? null,
        photoUrl: photo_url ?? null,
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

    const fieldMap: Record<string, string> = {
      status: 'status', name: 'name', phone: 'phone', rating: 'rating', plate: 'plate', vehicle: 'vehicle',
      doc_license: 'docLicense', doc_aadhaar: 'docAadhaar', doc_pan: 'docPan', doc_police: 'docPolice',
      license_no: 'licenseNo', license_exp: 'licenseExp', photo_url: 'photoUrl',
    }
    const data: any = {}
    for (const [rawKey, prismaKey] of Object.entries(fieldMap)) {
      if (req.body[rawKey] !== undefined) data[prismaKey] = req.body[rawKey]
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
    year = 2024, is_ev = 1, soc = 80, odometer = 0, insurance_expiry, fc_expiry, driver_id } = req.body
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
        fcExpiry: fc_expiry ?? null,
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
      insurance_expiry: 'insuranceExpiry', fc_expiry: 'fcExpiry', maintenance_note: 'maintenanceNote',
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

    // Sync driver records when driver assignment changes
    if (req.body.driver_id !== undefined) {
      const newDriverId = req.body.driver_id
      if (row.driverId && row.driverId !== newDriverId) {
        await prisma.driver.update({ where: { id: row.driverId }, data: { plate: null, vehicle: null } }).catch(() => {})
      }
      if (newDriverId) {
        await prisma.driver.update({ where: { id: newDriverId }, data: { plate: updated.plate, vehicle: `${updated.make} ${updated.model}` } }).catch(() => {})
      }
    }

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

router.post('/vehicles/sync-trips', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ select: { id: true, plate: true } })
    for (const v of vehicles) {
      const count = await prisma.booking.count({
        where: { assignedVehicleJson: { contains: v.plate }, status: 'completed' },
      })
      await prisma.vehicle.update({ where: { id: v.id }, data: { trips: count } })
    }
    res.json({ synced: vehicles.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Customers ────────────────────────────────────────────────────────────────

router.get('/customers', async (_req, res) => {
  try {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    const tripCounts = await prisma.booking.groupBy({ by: ['userId'], _count: { id: true } })
    const countMap = new Map(tripCounts.map(t => [t.userId, t._count.id]))

    // Referral data — fetched separately to stay resilient if columns are missing
    let referrerMap = new Map<string, { id: string; name: string | null; phone: string }>()
    let referralCountMap = new Map<string, number>()
    try {
      const referred = await prisma.user.findMany({
        where: { referredById: { not: null } },
        select: { id: true, referredById: true },
      })
      referred.forEach(u => {
        referralCountMap.set(u.referredById!, (referralCountMap.get(u.referredById!) ?? 0) + 1)
      })
      const referrerIds = [...new Set(referred.map(u => u.referredById!))]
      if (referrerIds.length) {
        const referrers = await prisma.user.findMany({
          where: { id: { in: referrerIds } },
          select: { id: true, name: true, phone: true },
        })
        referrers.forEach(r => referrerMap.set(r.id, r))
      }
    } catch {}

    const customers = rows.map(u => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      email: u.email,
      created_at: u.createdAt,
      trip_count: countMap.get(u.id) ?? 0,
      referral_code: (u as any).referralCode ?? null,
      referred_by: (u as any).referredById
        ? (referrerMap.get((u as any).referredById) ?? null)
        : null,
      referral_count: referralCountMap.get(u.id) ?? 0,
      referral_credits: (u as any).referralCredits ?? 0,
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

router.post('/customers/generate-referral-codes', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { referralCode: null } })
    let generated = 0
    for (const user of users) {
      const suffix = user.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase()
      const code = 'YLW' + suffix
      try {
        await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } })
        generated++
      } catch {}
    }
    res.json({ generated, total: users.length })
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
    const user = await prisma.user.findUnique({ where: { id: String(req.params.id) }, select: { id: true, name: true, phone: true } })
    res.json({ bookings: rows.map(r => buildBooking({ ...r, user: user ?? null })) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Leads ────────────────────────────────────────────────────────────────────

router.get('/leads', async (_req, res) => {
  try {
    // Auto-expire open leads older than 24 hours to 'lost'
    const cutoff = new Date(Date.now() - 24 * 3600000).toISOString()
    await prisma.lead.updateMany({
      where: { status: { in: ['new', 'called'] }, quotedAt: { lt: cutoff } },
    data: { status: 'lost' },
    })

    const rows = await prisma.lead.findMany({
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { quotedAt: 'desc' },
    })
    res.json({
      leads: rows.map(r => ({
        id: r.id,
        user_id: r.userId,
        status: r.status,
        trip_type: r.tripType,
        price: r.price,
        pickup_time: r.pickupTime,
        flight: r.flight,
        quoted_at: r.quotedAt,
        caller_note: r.callerNote,
        trip_code: r.tripCode,
        user_name: r.user?.name ?? null,
        user_phone: r.user?.phone ?? null,
        pickup: r.pickupJson ? JSON.parse(r.pickupJson) : null,
        drop: r.dropJson ? JSON.parse(r.dropJson) : null,
        pricing: r.pricingJson ? JSON.parse(r.pricingJson) : null,
      })),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/leads', async (req, res) => {
  const { userId, tripType, pickup, drop, price, pickupTime, flight, pricing } = req.body
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
        pricingJson: pricing ? JSON.stringify(pricing) : null,
        quotedAt: new Date().toISOString(),
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

router.post('/pricing/calculate', async (req, res) => {
  try {
    const { originPlaceId, tripType = 'airport', distanceKm: manualKm, stopPlaceIds = [] } = req.body
    const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || ''
    const BLR_AIRPORT_PLACE_ID = 'ChIJZWJEdf4crjsRjkEpoelwbCk'

    let distanceKm: number
    let durationMinutes: number

    if (manualKm !== undefined) {
      distanceKm = parseFloat(manualKm)
      durationMinutes = Math.round(distanceKm * 1.5)
    } else if (originPlaceId && GOOGLE_MAPS_KEY) {
      // Sum leg distances: origin → stop1 → stop2 → ... → airport
      const waypoints: string[] = [originPlaceId, ...stopPlaceIds, BLR_AIRPORT_PLACE_ID]
      const legResults = await Promise.all(
        waypoints.slice(0, -1).map(async (from, i) => {
          const to = waypoints[i + 1]
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=place_id:${encodeURIComponent(from)}&destinations=place_id:${encodeURIComponent(to)}&key=${GOOGLE_MAPS_KEY}&mode=driving`
          const r = await fetch(url)
          const data = await r.json() as any
          const el = data?.rows?.[0]?.elements?.[0]
          if (!el || el.status !== 'OK') throw new Error('Could not calculate distance for a leg')
          return { km: el.distance.value / 1000, mins: el.duration.value / 60 }
        })
      )
      distanceKm = Math.round(legResults.reduce((s, l) => s + l.km, 0) * 10) / 10
      durationMinutes = Math.round(legResults.reduce((s, l) => s + l.mins, 0))
    } else {
      return res.status(400).json({ error: 'originPlaceId or distanceKm required' })
    }

    const rows = await prisma.pricingConfig.findMany()
    const cfg: Record<string, number> = rows.reduce((acc, r) => ({ ...acc, [r.key]: parseFloat(r.value) }), {} as Record<string, number>)

    if (tripType === 'outstation') {
      const perKm = cfg.outstation_per_km ?? 18
      const driverBata = cfg.outstation_driver_bata ?? 500
      const gstRate = (cfg.outstation_gst ?? 5) / 100
      const base = distanceKm * perKm
      const total = Math.round((base + driverBata) * (1 + gstRate))
      return res.json({ distanceKm, durationMinutes, tripType, basePrice: Math.round(base), totalPrice: total,
        breakdown: { distanceFare: `₹${Math.round(base)} @ ₹${perKm}/km`, driverBata: `₹${driverBata}`, gst: `${cfg.outstation_gst ?? 5}%` } })
    }

    const perKm = cfg.airport_per_km ?? 32
    const tripCharge = cfg.airport_trip_charge ?? 100
    const toll = cfg.airport_toll ?? 185
    const gstRate = (cfg.airport_gst ?? 5) / 100
    const kmFare = Math.round(distanceKm * perKm)
    const fareBeforeTax = kmFare + tripCharge
    const gst = Math.round(fareBeforeTax * gstRate)
    const total = fareBeforeTax + gst + toll
    res.json({ distanceKm, durationMinutes, tripType, fareBeforeTax, gst, toll, totalPrice: total, basePrice: fareBeforeTax,
      breakdown: { kmFare: `₹${kmFare} @ ₹${perKm}/km`, tripCharge: `₹${tripCharge}`, gst: `${cfg.airport_gst ?? 5}% on ₹${fareBeforeTax}`, toll: `₹${toll} (pass-through)` } })
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

    // Count bookings with pickup date today (not created_at today — bookings can be made in advance)
    const todayStart = today.toISOString()
    const todayEnd = tomorrow.toISOString()

    const todayBookings = await prisma.$queryRaw<any[]>`
      SELECT * FROM bookings
      WHERE status != 'cancelled'
      AND pickup_json::json->>'dateTime' >= ${todayStart}
      AND pickup_json::json->>'dateTime' < ${todayEnd}
    `

    const ridesToday = todayBookings.length
    const revenueToday = todayBookings.reduce((s: number, b: any) => {
      try {
        const pricing = typeof b.pricing_json === 'string' ? JSON.parse(b.pricing_json) : (b.pricing_json ?? {})
        return s + (pricing.totalPrice ?? pricing.total_price ?? b.price ?? 0)
      } catch { return s + (b.price ?? 0) }
    }, 0)

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

// ─── Admin team management ────────────────────────────────────────────────────

router.get('/team', async (_req, res) => {
  try {
    const users = await prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } })
    // Normalize phone to last 10 digits in response
    const normalized = users.map(u => ({ ...u, phone: u.phone.replace(/\D/g, '').slice(-10) }))
    res.json({ users: normalized })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/team', async (req, res) => {
  try {
    const { phone: rawPhone, name, role = 'ops' } = req.body
    if (!rawPhone) return res.status(400).json({ error: 'phone required' })
    const phone = String(rawPhone).replace(/\D/g, '').slice(-10)
    if (phone.length !== 10) return res.status(400).json({ error: 'Phone must be 10 digits' })

    // Check by last-10 match to avoid duplicates from different formats
    const all = await prisma.adminUser.findMany({ select: { id: true, phone: true } })
    if (all.some(u => u.phone.replace(/\D/g, '').slice(-10) === phone)) {
      return res.status(409).json({ error: 'Admin user with this phone already exists' })
    }

    const id = 'au-' + randomUUID().slice(0, 8)
    const user = await prisma.adminUser.create({ data: { id, phone, name: name || null, role } })
    res.json({ user: { ...user, phone: user.phone.replace(/\D/g, '').slice(-10) } })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

router.patch('/team/me', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const payload = jwt.verify(token, JWT_SECRET) as any
    const phone = payload?.adminPhone
    if (!phone) return res.status(401).json({ error: 'Unauthorized' })

    const { name } = req.body
    const updated = await prisma.adminUser.upsert({
      where: { phone },
      update: { name: name ?? null },
      create: { id: randomUUID(), phone, name: name ?? null, role: 'superadmin' },
    })
    res.json({ admin: { phone: updated.phone, name: updated.name, role: updated.role } })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/team/:id', async (req, res) => {
  try {
    const user = await prisma.adminUser.findUnique({ where: { id: String(req.params.id) } })
    if (!user) return res.status(404).json({ error: 'Admin user not found' })
    if (user.role === 'superadmin') return res.status(403).json({ error: 'Cannot remove superadmin' })
    await prisma.adminUser.delete({ where: { id: String(req.params.id) } })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Flight lookup proxy ──────────────────────────────────────────────────────

const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY || ''

router.get('/flights/lookup', requireAdmin, async (req: Request, res: Response) => {
  const { flight_number, date } = req.query as { flight_number: string; date?: string }
  if (!flight_number) return res.status(400).json({ error: 'flight_number required' })

  if (!FLIGHT_API_KEY) {
    return res.json({
      flightNumber: flight_number.toUpperCase(),
      airline: 'IndiGo',
      departure: date ? `${date}T20:00:00+05:30` : new Date().toISOString(),
      arrival: date ? `${date}T22:00:00+05:30` : new Date().toISOString(),
      status: 'scheduled',
    })
  }

  try {
    const iata = flight_number.toUpperCase().replace(/\s/g, '')
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${iata}${date ? `/${date}` : ''}`
    const apiRes = await fetch(url, {
      headers: { 'x-rapidapi-host': 'aerodatabox.p.rapidapi.com', 'x-rapidapi-key': FLIGHT_API_KEY },
    })
    if (apiRes.status === 404) return res.status(404).json({ error: 'Flight not found in database' })
    if (!apiRes.ok) {
      const body = await apiRes.text().catch(() => '')
      return res.status(502).json({ error: `Flight API error ${apiRes.status}: ${body.slice(0, 200)}` })
    }
    const data = await apiRes.json() as any
    const f = Array.isArray(data) ? data[0] : data
    if (!f) return res.status(404).json({ error: 'Flight not found in database' })
    return res.json({
      flightNumber: f?.number ?? flight_number,
      airline: f?.airline?.name ?? '',
      departure: f?.departure?.scheduledTime?.local ?? f?.departure?.scheduledTime?.utc ?? '',
      arrival: f?.arrival?.revisedTime?.local ?? f?.arrival?.scheduledTime?.local ?? f?.arrival?.scheduledTime?.utc ?? '',
      status: f?.status ?? 'scheduled',
      terminal: f?.arrival?.terminal ?? '',
      gate: f?.arrival?.gate ?? '',
    })
  } catch (e: any) {
    return res.status(500).json({ error: `Flight lookup error: ${e?.message ?? 'unknown'}` })
  }
})

export default router
