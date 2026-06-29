import { Router, Response } from 'express'
import { randomUUID, createHmac } from 'crypto'
import { requireAuth, AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { genTripCode } from '../lib/tripcode'
import { sendMetaEvent } from '../lib/metaPixel'
import { notifyBookingEvent } from '../lib/notify'
import { getEta } from '../lib/eta'
import { slimAssignedDriver, fixAirportStop } from '../lib/shape'

const router = Router()

// ─── Shared booking creation ──────────────────────────────────────────────────

interface BookingCreateParams {
  tripType: string
  vehicleType?: string
  passengers?: number
  pickup: any
  drop: any
  stops?: any[]
  flight?: any
  pricing: any
  guestName?: string
  guestPhone?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  paymentStatus?: string
  reqMeta?: { userAgent?: string; fbp?: string }
}

async function createBookingRecord(userId: string, p: BookingCreateParams) {
  const vehicleType = p.vehicleType ?? 'yellowSky'
  const passengers = p.passengers ?? 1

  // Deduct referral credits if applied
  const creditsApplied = Number(p.pricing.creditsApplied ?? 0)
  if (creditsApplied > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCredits: true } })
    const safeDeduct = Math.min(creditsApplied, user?.referralCredits ?? 0)
    if (safeDeduct > 0) {
      await prisma.user.update({ where: { id: userId }, data: { referralCredits: { decrement: safeDeduct } } })
    }
  }

  const id = randomUUID()
  const tripCode = await genTripCode()

  const booking = await prisma.booking.create({
    data: {
      id,
      tripCode,
      userId,
      tripType: p.tripType,
      vehicleType,
      price: p.pricing.totalPrice ?? p.pricing.basePrice ?? 0,
      passengerCount: passengers,
      pickupJson: JSON.stringify(p.pickup),
      dropJson: JSON.stringify(p.drop),
      stopsJson: p.stops?.length ? JSON.stringify(p.stops) : null,
      flightJson: p.flight ? JSON.stringify(p.flight) : null,
      pricingJson: JSON.stringify(p.pricing),
      guestName: p.guestName ?? null,
      guestPhone: p.guestPhone ?? null,
      razorpayOrderId: p.razorpayOrderId ?? null,
      razorpayPaymentId: p.razorpayPaymentId ?? null,
      paymentStatus: p.paymentStatus ?? 'paid',
      status: 'confirmed',
    },
  })

  // Meta Conversions API — Purchase (fire-and-forget)
  ;(async () => {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true } })
      sendMetaEvent('Purchase', {
        phone:          user?.phone,
        email:          user?.email,
        value:          booking.price ?? 0,
        userAgent:      p.reqMeta?.userAgent,
        fbp:            p.reqMeta?.fbp,
        eventId:        `purchase_${booking.id}`,
        eventSourceUrl: `https://book.ridewithyellow.com`,
      })
    } catch {}
  })()

  // Referrer reward: 10% of first booking price if referee
  ;(async () => {
    try {
      const referredUser = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } })
      if (referredUser?.referredById) {
        const prevCount = await prisma.booking.count({ where: { userId, id: { not: booking.id } } })
        if (prevCount === 0) {
          const reward = Math.round((booking.price ?? 0) * 0.1)
          if (reward > 0) await prisma.user.update({ where: { id: referredUser.referredById }, data: { referralCredits: { increment: reward } } })
        }
      }
    } catch {}
  })()

  // Auto-close any open leads for this user
  await prisma.lead.updateMany({
    where: { userId, status: { in: ['new', 'open'] } },
    data: { status: 'converted', tripCode: booking.tripCode },
  }).catch(() => {})

  // Confirmation SMS + push (non-blocking)
  notifyBookingEvent(booking, 'confirmed')

  return booking
}

async function checkSlotAvailable(pickupDateTime: string): Promise<{ available: boolean; blocked?: boolean; reason?: string; busyCount?: number; totalVehicles?: number }> {
  const dt = new Date(pickupDateTime)
  const lo = new Date(dt.getTime() - 2 * 3600000)
  const hi = new Date(dt.getTime() + 2 * 3600000)

  // Manual admin blocks take priority
  const block = await prisma.availabilityBlock.findFirst({
    where: { startAt: { lte: hi }, endAt: { gte: lo } },
  })
  if (block) {
    return { available: false, blocked: true, reason: block.reason || undefined }
  }

  // Fleet size: count active vehicles so 2+ vehicles can take concurrent bookings
  const totalVehicles = await prisma.vehicle.count({ where: { status: { not: 'retired' } } })
  const capacity = Math.max(totalVehicles, 1)

  const busy = await prisma.$queryRaw<[{ cnt: bigint }]>`
    SELECT COUNT(*) as cnt FROM bookings
    WHERE status NOT IN ('cancelled','completed')
    AND pickup_json::json->>'dateTime' BETWEEN ${lo.toISOString()} AND ${hi.toISOString()}
  `
  const busyCount = Number(busy[0]?.cnt ?? 0)
  return { available: busyCount < capacity, busyCount, totalVehicles: capacity }
}

router.get('/availability', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { pickupDateTime } = req.query as { pickupDateTime: string }
    if (!pickupDateTime) return res.status(400).json({ error: 'pickupDateTime required' })
    const result = await checkSlotAvailable(pickupDateTime)
    return res.json(result)
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Availability check failed' })
  }
})

router.post('/availability/notify', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { requestedAt } = req.body
    if (!requestedAt) return res.status(400).json({ error: 'requestedAt required' })
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { phone: true } })
    await prisma.availabilityNotification.create({
      data: { userId: req.userId!, phone: user?.phone ?? '', requestedAt: new Date(requestedAt) },
    })
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ─── Payment: create Razorpay order ──────────────────────────────────────────
// Must be before /:id to avoid route collision

router.post('/payment/create-order', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount required (rupees, integer)' })
    }

    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Payment service not configured' })
    }

    // Use Razorpay REST API directly (avoids SDK ESM/CJS issues)
    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount) * 100,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        payment_capture: 1,
      }),
    })

    if (!rzpRes.ok) {
      const err = await rzpRes.text()
      console.error('[PAYMENT] Razorpay order create error:', err)
      return res.status(502).json({ error: 'Failed to create payment order' })
    }

    const order = await rzpRes.json() as any
    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    })
  } catch (e: any) {
    console.error('[PAYMENT] create-order error:', e)
    return res.status(500).json({ error: e.message || 'Payment order creation failed' })
  }
})

// ─── Payment: verify and create booking ──────────────────────────────────────

router.post('/payment/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingData } = req.body

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingData) {
      return res.status(400).json({ error: 'Missing payment verification fields' })
    }

    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
    if (!RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Payment service not configured' })
    }

    // HMAC-SHA256 signature verification
    const expectedSig = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSig !== razorpaySignature) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' })
    }

    // Idempotency: return existing booking if this order was already processed
    const existing = await prisma.booking.findFirst({ where: { razorpayOrderId } })
    if (existing) {
      return res.json({ booking: buildBookingResponse(existing) })
    }

    // Create booking — trip code generated only here, after payment verified
    const {
      tripType, vehicleType = 'yellowSky', passengers = 1,
      pickup, drop, stops, flight, pricing, guestName, guestPhone,
    } = bookingData

    if (!pickup || !drop || !pricing) {
      return res.status(400).json({ error: 'pickup, drop, and pricing are required' })
    }

    // Availability guard — prevent double-booking the single vehicle
    if (pickup?.dateTime) {
      const slot = await checkSlotAvailable(pickup.dateTime)
      if (!slot.available) {
        return res.status(409).json({
          error: slot.blocked
            ? 'We are not available at this time. Please reach out to support.'
            : 'Another booking already exists at this time. Please choose a different time.',
          unavailable: true,
        })
      }
    }

    const booking = await createBookingRecord(req.userId!, {
      tripType, vehicleType, passengers, pickup, drop, stops, flight, pricing,
      guestName, guestPhone, razorpayOrderId, razorpayPaymentId, paymentStatus: 'paid',
      reqMeta: { userAgent: req.headers['user-agent'], fbp: req.cookies?.['_fbp'] },
    })

    return res.json({ booking: buildBookingResponse(booking) })
  } catch (e: any) {
    console.error('[PAYMENT] verify error:', e)
    if (e?.code === 'P2003' && e?.meta?.field_name?.includes('user_id')) {
      return res.status(401).json({ error: 'User account not found — please sign in again' })
    }
    return res.status(500).json({ error: e.message || 'Payment verification failed' })
  }
})

// ─── Direct booking creation (admin / legacy) ─────────────────────────────────

router.post('/lead', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tripType, pickup, drop, stops, price, pickupTime, flight, pricing } = req.body

    // Deduplicate: if the same user already has an open lead for the same pickup
    // location + time (within a 30-min window), update it instead of inserting
    const pickupPlaceId = pickup?.placeId ?? null
    const windowStart = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const existing = pickupPlaceId && pickupTime
      ? await prisma.lead.findFirst({
          where: {
            userId: req.userId!,
            status: { in: ['new', 'called'] },
            pickupTime,
            quotedAt: { gte: windowStart },
          },
          orderBy: { quotedAt: 'desc' },
        })
      : null

    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          price: price ?? existing.price,
          pricingJson: pricing ? JSON.stringify(pricing) : existing.pricingJson,
          flight: flight ?? existing.flight,
          quotedAt: new Date().toISOString(),
        },
      })
      return res.json({ ok: true, id: existing.id })
    }

    const id = randomUUID()
    await prisma.lead.create({
      data: {
        id,
        userId: req.userId!,
        tripType: tripType ?? null,
        pickupJson: pickup ? JSON.stringify(pickup) : null,
        dropJson: drop ? JSON.stringify(drop) : null,
        stopsJson: stops?.length ? JSON.stringify(stops) : null,
        price: price ?? 0,
        pickupTime: pickupTime ?? null,
        flight: flight ?? null,
        pricingJson: pricing ? JSON.stringify(pricing) : null,
        quotedAt: new Date().toISOString(),
        status: 'new',
      },
    })

    // Meta Conversions API — Lead + InitiateCheckout (fire-and-forget)
    ;(async () => {
      try {
        const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { phone: true, email: true } })
        const eventOpts = {
          phone:          user?.phone,
          email:          user?.email,
          value:          price ?? 0,
          userAgent:      req.headers['user-agent'],
          fbp:            req.cookies?.['_fbp'],
          eventSourceUrl: `https://book.ridewithyellow.com`,
        }
        sendMetaEvent('Lead',             { ...eventOpts, eventId: `lead_${id}` })
        sendMetaEvent('InitiateCheckout', { ...eventOpts, eventId: `checkout_${id}` })
      } catch {}
    })()

    return res.json({ ok: true, id })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tripType, vehicleType = 'yellowSky', passengers = 1,
      pickup, drop, stops, flight, pricing,
      guestName, guestPhone,
    } = req.body

    if (!pickup || !drop || !pricing) return res.status(400).json({ error: 'pickup, drop, and pricing are required' })

    // Availability guard — prevent double-booking the single vehicle
    if (pickup?.dateTime) {
      const slot = await checkSlotAvailable(pickup.dateTime)
      if (!slot.available) {
        return res.status(409).json({
          error: slot.blocked
            ? 'We are not available at this time. Please reach out to support.'
            : 'Another booking already exists at this time. Please choose a different time.',
          unavailable: true,
        })
      }
    }

    const booking = await createBookingRecord(req.userId!, {
      tripType, vehicleType, passengers, pickup, drop, stops, flight, pricing,
      guestName, guestPhone, paymentStatus: 'paid',
      reqMeta: { userAgent: req.headers['user-agent'], fbp: req.cookies?.['_fbp'] },
    })

    return res.json({ booking: buildBookingResponse(booking) })
  } catch (e: any) {
    if (e?.code === 'P2003' && e?.meta?.field_name?.includes('user_id')) {
      return res.status(401).json({ error: 'User account not found — please sign in again' })
    }
    return res.status(500).json({ error: e.message || 'Failed to create booking' })
  }
})

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const take = Math.min(Number(req.query.take ?? 20), 100)
    const skip = Number(req.query.skip ?? 0)
    const [rows, total] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.booking.count({ where: { userId: req.userId! } }),
    ])
    return res.json({ bookings: rows.map(buildBookingResponse), total, skip, take })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to fetch bookings' })
  }
})

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.booking.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    })
    if (!row) return res.status(404).json({ error: 'Booking not found' })
    return res.json({ booking: buildBookingResponse(row) })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to fetch booking' })
  }
})

// ─── Live tracking ────────────────────────────────────────────────────────────

const TRACKABLE_STATUSES = ['assigned', 'arrived', 'in_progress']
const LOCATION_STALE_MS = 60_000
const GEOCODE_CACHE_MAX = 500
const geocodeCache = new Map<string, { lat: number; lng: number; ts: number }>()

async function resolveCoords(point: any): Promise<{ lat: number; lng: number } | null> {
  if (point?.lat != null && point?.lng != null) return { lat: Number(point.lat), lng: Number(point.lng) }
  const placeId = point?.placeId
  if (!placeId) return null
  const cached = geocodeCache.get(placeId)
  if (cached && Date.now() - cached.ts < 86_400_000) return cached
  const key = process.env.GOOGLE_MAPS_KEY || ''
  if (!key) return null
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${key}`)
    const data = await res.json() as any
    const loc = data?.results?.[0]?.geometry?.location
    if (loc?.lat != null && loc?.lng != null) {
      const coords = { lat: loc.lat, lng: loc.lng, ts: Date.now() }
      if (geocodeCache.size >= GEOCODE_CACHE_MAX) geocodeCache.delete(geocodeCache.keys().next().value!)
      geocodeCache.set(placeId, coords)
      return coords
    }
  } catch {}
  return null
}

router.get('/:id/location', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.booking.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    })
    if (!row) return res.status(404).json({ error: 'Booking not found' })

    const assignedDriver = row.assignedDriverJson ? JSON.parse(row.assignedDriverJson) : null
    if (!TRACKABLE_STATUSES.includes(row.status) || !assignedDriver?.id) {
      return res.json({ tracking: false, status: row.status })
    }

    const loc = await prisma.driverLocation.findUnique({ where: { driverId: assignedDriver.id } })
    if (!loc) return res.json({ tracking: false, status: row.status })

    const pickupPoint = row.pickupJson ? JSON.parse(row.pickupJson) : null
    const dropPoint = row.dropJson ? JSON.parse(row.dropJson) : null
    const [pickup, drop] = await Promise.all([resolveCoords(pickupPoint), resolveCoords(dropPoint)])

    // Persist resolved coords back into the booking JSON so we geocode at most once
    const persist: any = {}
    if (pickup && pickupPoint && (pickupPoint.lat == null || pickupPoint.lng == null)) {
      persist.pickupJson = JSON.stringify({ ...pickupPoint, ...pickup })
    }
    if (drop && dropPoint && (dropPoint.lat == null || dropPoint.lng == null)) {
      persist.dropJson = JSON.stringify({ ...dropPoint, ...drop })
    }
    if (Object.keys(persist).length) {
      prisma.booking.update({ where: { id: row.id }, data: persist }).catch(() => {})
    }

    const target = row.status === 'in_progress' ? 'drop' : 'pickup'
    const targetCoords = target === 'drop' ? drop : pickup
    const stale = Date.now() - loc.updatedAt.getTime() > LOCATION_STALE_MS

    let etaMinutes: number | null = null
    let distanceKm: number | null = null
    if (!stale && targetCoords) {
      const eta = await getEta(`${row.id}:${target}`, { lat: loc.lat, lng: loc.lng }, targetCoords)
      etaMinutes = eta.etaMinutes
      distanceKm = eta.distanceKm
    }

    return res.json({
      tracking: true,
      status: row.status,
      target,
      driver: { lat: loc.lat, lng: loc.lng, heading: loc.heading, updatedAt: loc.updatedAt.toISOString(), stale },
      pickup,
      drop,
      etaMinutes,
      distanceKm,
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to fetch location' })
  }
})

// Trip status is driver/admin-managed only — there is intentionally no
// customer-facing status mutation endpoint.

function buildBookingResponse(row: any) {
  return {
    id: row.id,
    tripCode: row.tripCode,
    userId: row.userId,
    status: row.status,
    tripType: row.tripType,
    vehicleType: row.vehicleType,
    price: row.price,
    passengers: row.passengerCount,
    pickup: fixAirportStop(row.pickupJson ? JSON.parse(row.pickupJson) : null),
    drop: fixAirportStop(row.dropJson ? JSON.parse(row.dropJson) : null),
    flight: row.flightJson ? JSON.parse(row.flightJson) : null,
    pricing: row.pricingJson ? JSON.parse(row.pricingJson) : null,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    stops: row.stopsJson ? JSON.parse(row.stopsJson) : null,
    assignedDriver: slimAssignedDriver(row.assignedDriverJson ? JSON.parse(row.assignedDriverJson) : null),
    assignedVehicle: row.assignedVehicleJson ? JSON.parse(row.assignedVehicleJson) : null,
    paymentStatus: row.paymentStatus ?? 'paid',
    razorpayPaymentId: row.razorpayPaymentId ?? null,
    createdAt: row.createdAt,
  }
}

export default router
