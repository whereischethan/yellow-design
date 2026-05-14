import { Router, Response } from 'express'
import { randomUUID, createHmac } from 'crypto'
import { requireAuth, AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { sendStatusSms, collectPhones } from '../lib/sms'
import { genTripCode } from '../lib/tripcode'

const router = Router()

router.get('/availability', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { pickupDateTime } = req.query as { pickupDateTime: string }
    if (!pickupDateTime) return res.status(400).json({ error: 'pickupDateTime required' })

    const dt = new Date(pickupDateTime)
    const lo = new Date(dt.getTime() - 2 * 3600000).toISOString()
    const hi = new Date(dt.getTime() + 2 * 3600000).toISOString()

    const busy = await prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*) as cnt FROM bookings
      WHERE status NOT IN ('cancelled','completed')
      AND pickup_json::json->>'dateTime' BETWEEN ${lo} AND ${hi}
    `
    const busyCount = Number(busy[0]?.cnt ?? 0)

    const totalVehicles = 5
    return res.json({ available: busyCount < totalVehicles, busyCount, totalVehicles })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Availability check failed' })
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
      tripType, vehicleType = 'yellowSky', passengers = 1, luggage = 0, cabinBags = 0,
      pickup, drop, stops, flight, pricing, guestName, guestPhone,
    } = bookingData

    if (!pickup || !drop || !pricing) {
      return res.status(400).json({ error: 'pickup, drop, and pricing are required' })
    }

    const id = randomUUID()
    const tripCode = await genTripCode()

    const booking = await prisma.booking.create({
      data: {
        id,
        tripCode,
        userId: req.userId!,
        tripType,
        vehicleType,
        price: pricing.totalPrice ?? pricing.basePrice ?? 0,
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
        razorpayOrderId,
        razorpayPaymentId,
        paymentStatus: 'paid',
        status: 'confirmed',
      },
    })

    // Auto-close any open leads for this user
    await prisma.lead.updateMany({
      where: { userId: req.userId!, status: { in: ['new', 'open'] } },
      data: { status: 'converted', tripCode: booking.tripCode },
    }).catch(() => {})

    // Confirmation SMS (non-blocking)
    ;(async () => {
      try {
        const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { phone: true } })
        const phones = collectPhones(user?.phone, booking.guestPhone)
        for (const phone of phones) {
          sendStatusSms(phone, booking.tripCode, 'confirmed', {
            tripType,
            pickupDateTime: pickup?.dateTime,
          }).catch(() => {})
        }
      } catch {}
    })()

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

    return res.json({ ok: true, id })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      tripType, vehicleType = 'yellowSky', passengers = 1, luggage = 0, cabinBags = 0,
      pickup, drop, stops, flight, pricing,
      guestName, guestPhone,
    } = req.body

    if (!pickup || !drop || !pricing) return res.status(400).json({ error: 'pickup, drop, and pricing are required' })

    const id = randomUUID()
    const tripCode = await genTripCode()

    const booking = await prisma.booking.create({
      data: {
        id,
        tripCode,
        userId: req.userId!,
        tripType,
        vehicleType,
        price: pricing.totalPrice ?? pricing.basePrice ?? 0,
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
        paymentStatus: 'paid',
      },
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
    const rows = await prisma.booking.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ bookings: rows.map(buildBookingResponse) })
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

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const row = await prisma.booking.findFirst({
      where: { id: String(req.params.id), userId: req.userId! },
    })
    if (!row) return res.status(404).json({ error: 'Booking not found' })

    const { status } = req.body
    const allowed = ['completed', 'cancelled']
    if (!status || !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    const updated = await prisma.booking.update({
      where: { id: String(req.params.id) },
      data: { status },
    })
    return res.json({ booking: buildBookingResponse(updated) })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to update booking' })
  }
})

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
    luggage: row.bags,
    cabinBags: row.cabinBags ?? 0,
    pickup: row.pickupJson ? JSON.parse(row.pickupJson) : null,
    drop: row.dropJson ? JSON.parse(row.dropJson) : null,
    flight: row.flightJson ? JSON.parse(row.flightJson) : null,
    pricing: row.pricingJson ? JSON.parse(row.pricingJson) : null,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    stops: row.stopsJson ? JSON.parse(row.stopsJson) : null,
    assignedDriver: row.assignedDriverJson ? JSON.parse(row.assignedDriverJson) : null,
    assignedVehicle: row.assignedVehicleJson ? JSON.parse(row.assignedVehicleJson) : null,
    paymentStatus: row.paymentStatus ?? 'paid',
    razorpayPaymentId: row.razorpayPaymentId ?? null,
    createdAt: row.createdAt,
  }
}

export default router
