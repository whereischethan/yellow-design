import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { notifyBookingEvent } from '../../lib/notify'
import { getInvoiceCounter } from '../../lib/invoice'
import { genTripCode } from '../../lib/tripcode'
import { slimAssignedDriver } from '../../lib/shape'
import { razorpayConfigured, createPaymentLink, fetchPaymentLink, cancelPaymentLink } from '../../lib/razorpay'
import { requireSuperAdmin, tryParse, buildBooking } from './shared'

const router = Router()

// ─── Bookings ─────────────────────────────────────────────────────────────────

router.get('/bookings', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const offset = Number(req.query.offset) || 0
    const rows = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset, include: { invoice: true } })
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
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) }, include: { invoice: true } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })
    const user = row.userId ? await prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, name: true, phone: true } }) : null
    res.json({ booking: buildBooking({ ...row, user }) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const bookingCreateSchema = z.object({
  tripType: z.string().optional(),
  vehicleType: z.string().optional(),
  passengers: z.number().optional(),
  pickup: z.record(z.string(), z.any()).optional(),
  drop: z.record(z.string(), z.any()).optional(),
  stops: z.array(z.any()).nullish(),
  flight: z.record(z.string(), z.any()).nullish(),
  pricing: z.record(z.string(), z.any()).optional(),
  guestName: z.string().nullish(),
  guestPhone: z.string().nullish(),
  userId: z.string().nullish(),
  assignedDriver: z.record(z.string(), z.any()).nullish(),
  assignedVehicle: z.record(z.string(), z.any()).nullish(),
  sendSms: z.boolean().optional(),
}).passthrough()

router.post('/bookings', async (req, res) => {
  try {
    const parsed = bookingCreateSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
    const { tripType, vehicleType = 'yellowSky', passengers = 1,
      pickup, drop, stops, flight, pricing, guestName, guestPhone, userId,
      assignedDriver, assignedVehicle, sendSms: sendSmsBody } = req.body
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
        pickupJson: JSON.stringify(pickup),
        dropJson: JSON.stringify(drop),
        stopsJson: stops?.length ? JSON.stringify(stops) : null,
        flightJson: flight ? JSON.stringify(flight) : null,
        pricingJson: JSON.stringify(pricing),
        guestName: guestName ?? null,
        guestPhone: guestPhone ?? null,
        assignedDriverJson: assignedDriver ? JSON.stringify(slimAssignedDriver(assignedDriver)) : null,
        assignedVehicleJson: assignedVehicle ? JSON.stringify(assignedVehicle) : null,
        status: bookingStatus,
        paymentStatus: 'pending',
        sendSms: sendSmsBody !== undefined ? Boolean(sendSmsBody) : true,
      },
    })

    // Driver status unchanged on creation — they're only marked on-trip when the trip goes in_progress

    // Fire confirmation SMS + push (non-blocking; gated on sendSms inside)
    notifyBookingEvent(row, bookingStatus)
    if (assignedDriver?.id) notifyBookingEvent(row, 'driver_assigned')

    const userForBooking = resolvedUserId ? await prisma.user.findUnique({ where: { id: resolvedUserId }, select: { id: true, name: true, phone: true } }) : null
    res.json({ booking: buildBooking({ ...row, user: userForBooking }) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const bookingPatchSchema = z.object({
  status: z.string().optional(),
  assignedDriver: z.record(z.string(), z.any()).nullish(),
  assignedVehicle: z.record(z.string(), z.any()).nullish(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().nullish(),
  pickupDateTime: z.string().optional(),
  guestName: z.string().nullish(),
  guestPhone: z.string().nullish(),
  price: z.union([z.number(), z.string()]).optional(),
  fareBreakdown: z.object({
    fareBeforeTax: z.number(),
    discount: z.number().optional(),
    durationHours: z.number().optional(),
  }).passthrough().optional(),
  durationHours: z.union([z.number(), z.string()]).optional(),
  tripType: z.string().optional(),
  vehicleType: z.string().optional(),
  passengerCount: z.union([z.number(), z.string()]).optional(),
  meetAndGreet: z.union([z.number(), z.string(), z.boolean()]).optional(),
  petFriendly: z.union([z.number(), z.string(), z.boolean()]).optional(),
  pickup: z.record(z.string(), z.any()).optional(),
  drop: z.record(z.string(), z.any()).optional(),
  flight: z.record(z.string(), z.any()).nullish(),
  stops: z.array(z.any()).nullish(),
  customerGstin: z.string().nullish(),
  customerGstName: z.string().nullish(),
  completedAt: z.string().optional(),
  sendSms: z.union([z.boolean(), z.number(), z.string()]).optional(),
  driverCollect: z.union([z.boolean(), z.number(), z.string()]).optional(),
}).passthrough()

router.patch('/bookings/:id', async (req, res) => {
  try {
    const parsedBody = bookingPatchSchema.safeParse(req.body ?? {})
    if (!parsedBody.success) return res.status(400).json({ error: parsedBody.error.message })
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })

    const { status, assignedDriver, assignedVehicle, paymentStatus, paymentMethod,
            pickupDateTime, guestName, guestPhone, price, fareBreakdown, durationHours,
            tripType, vehicleType, passengerCount, meetAndGreet, petFriendly,
            pickup, drop, flight, stops, customerGstin, customerGstName, completedAt,
            sendSms, driverCollect } = req.body
    const data: any = {}

    if (status !== undefined) data.status = status
    if (assignedDriver !== undefined) data.assignedDriverJson = assignedDriver ? JSON.stringify(slimAssignedDriver(assignedDriver)) : null
    // Assigning a driver moves the booking to "assigned" unless a status was sent explicitly
    if (assignedDriver && status === undefined && ['pending', 'confirmed'].includes(row.status)) data.status = 'assigned'
    if (assignedVehicle !== undefined) data.assignedVehicleJson = assignedVehicle ? JSON.stringify(assignedVehicle) : null
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod
    if (driverCollect !== undefined) data.driverCollect = Boolean(driverCollect)
    if (guestName !== undefined) data.guestName = guestName || null
    if (guestPhone !== undefined) data.guestPhone = guestPhone || null
    if (price !== undefined) {
      if (row.razorpayPaymentId && row.paymentStatus === 'paid') {
        return res.status(400).json({ error: 'Price cannot be edited after Razorpay payment is received' })
      }
      data.price = Number(price)
      // Keep pricingJson.totalPrice in sync so invoice and admin displays stay consistent
      if (fareBreakdown === undefined) {
        const existing = tryParse(row.pricingJson) ?? {}
        data.pricingJson = JSON.stringify({ ...existing, totalPrice: Number(price) })
      }
    }
    if (fareBreakdown !== undefined) {
      if (row.razorpayPaymentId && row.paymentStatus === 'paid') {
        return res.status(400).json({ error: 'Fare cannot be edited after Razorpay payment is received' })
      }
      const { fareBeforeTax, discount, durationHours } = fareBreakdown as { fareBeforeTax: number; discount?: number; durationHours?: number }
      const taxable = Math.max(0, fareBeforeTax - (discount ?? 0))
      const gst = Math.round(taxable * 0.05)
      const total = taxable + gst
      const existing = tryParse(row.pricingJson) ?? {}
      data.pricingJson = JSON.stringify({
        ...existing,
        fareBeforeTax,
        basePrice: fareBeforeTax,
        discount: discount ?? 0,
        gst,
        toll: 0,
        totalPrice: total,
        ...(durationHours != null ? { durationMinutes: durationHours * 60 } : {}),
      })
      data.price = total
    }
    if (durationHours !== undefined && fareBreakdown === undefined) {
      const existing = tryParse(row.pricingJson) ?? {}
      data.pricingJson = JSON.stringify({ ...existing, durationMinutes: Number(durationHours) * 60 })
    }

    // Auto-compute actual fare when completing a hourly booking (unless fareBreakdown was explicitly sent)
    if (status === 'completed' && fareBreakdown === undefined && row.tripType === 'hourly') {
      const existingPickup = tryParse(row.pickupJson)
      if (existingPickup?.dateTime) {
        const startMs = new Date(existingPickup.dateTime).getTime()
        // Use admin-supplied completedAt (edited end time) if provided, otherwise now.
        // Clamp to current time so future dates can't inflate the fare.
        const endMs = Math.min(
          completedAt ? new Date(completedAt).getTime() : Date.now(),
          Date.now()
        )
        const elapsedHours = Math.max(0, (endMs - startMs) / 3_600_000)
        // Round up to nearest 0.5 hr, minimum 0.5 hr, maximum 24 hr
        const actualHours = Math.min(Math.max(0.5, Math.ceil(elapsedHours * 2) / 2), 24)
        const cfgRows = await prisma.pricingConfig.findMany()
        const cfgMap: Record<string, number> = cfgRows.reduce(
          (acc, r) => ({ ...acc, [r.key]: parseFloat(r.value) }),
          {} as Record<string, number>
        )
        const hourlyRate = cfgMap.hourly_base_rate ?? 500
        const gstRate = (cfgMap.hourly_gst ?? 5) / 100
        const base = Math.round(actualHours * hourlyRate)
        const gst = Math.round(base * gstRate)
        const existingPricing = tryParse(row.pricingJson) ?? {}
        const existingToll = existingPricing.toll ?? 0
        const total = base + gst + existingToll
        data.pricingJson = JSON.stringify({
          ...existingPricing,
          fareBeforeTax: base,
          basePrice: base,
          gst,
          toll: existingToll,
          totalPrice: total,
          durationMinutes: actualHours * 60,
          actualEndTime: new Date(endMs).toISOString(),
          breakdown: {
            ...(existingPricing.breakdown ?? {}),
            hours: `${actualHours}h`,
            rate: `₹${hourlyRate}/hr`,
            gst: `${cfgMap.hourly_gst ?? 5}%`,
          },
        })
        data.price = total
      }
    }

    if (tripType !== undefined) data.tripType = tripType
    if (vehicleType !== undefined) data.vehicleType = vehicleType
    if (passengerCount !== undefined) data.passengerCount = Number(passengerCount)
    if (meetAndGreet !== undefined) data.meetAndGreet = Number(meetAndGreet)
    if (petFriendly !== undefined) data.petFriendly = Number(petFriendly)
    if (pickup !== undefined) data.pickupJson = JSON.stringify(pickup)
    if (drop !== undefined) data.dropJson = JSON.stringify(drop)
    if (stops !== undefined) data.stopsJson = stops?.length ? JSON.stringify(stops) : null
    if (flight !== undefined) data.flightJson = flight ? JSON.stringify(flight) : null
    if (customerGstin !== undefined) data.customerGstin = customerGstin || null
    if (customerGstName !== undefined) data.customerGstName = customerGstName || null
    if (sendSms !== undefined) data.sendSms = Boolean(sendSms)
    if (pickupDateTime !== undefined && row.pickupJson) {
      const existingPickup = tryParse(row.pickupJson) ?? {}
      existingPickup.dateTime = pickupDateTime
      data.pickupJson = JSON.stringify(existingPickup)
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    // If price changed and there's an unpaid Razorpay link, cancel it so the old URL goes void
    const priceChanged = data.price !== undefined && data.price !== row.price
    if (priceChanged && row.razorpayLinkId && row.paymentStatus !== 'paid' && razorpayConfigured()) {
      await cancelPaymentLink(row.razorpayLinkId) // best-effort; don't block the save
      data.razorpayLinkId = null
      data.razorpayLinkUrl = null
    }

    const updated = await prisma.booking.update({ where: { id: String(req.params.id) }, data, include: { invoice: true } })

    if (assignedDriver?.id) {
      const activeStatuses = ['in_progress', 'arrived', 'enroute']
      const driverStatus = (status === 'completed' || status === 'cancelled' || status === 'no_show') ? 'available'
        : activeStatuses.includes(status) ? 'on-trip'
        : undefined
      if (driverStatus) {
        await prisma.driver.update({ where: { id: assignedDriver.id }, data: { status: driverStatus } }).catch(() => {})
      }
    } else if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
      const existingDriverJson = updated.assignedDriverJson ?? row.assignedDriverJson
      const existingDriver = tryParse(existingDriverJson)
      if (existingDriver?.id) {
        await prisma.driver.update({ where: { id: existingDriver.id }, data: { status: 'available' } }).catch(() => {})
      }
    }

    // Fire SMS + push notifications (non-blocking; sendSms gate handled inside)
    if (status && ['confirmed', 'assigned', 'in_progress', 'arrived', 'completed', 'cancelled', 'no_show'].includes(status)) {
      notifyBookingEvent(updated, status)
    }

    // Driver-directed pushes: assignment changes, time changes, cancellations
    const prevDriverId = tryParse(row.assignedDriverJson)?.id ?? null
    const newDriverId = tryParse(updated.assignedDriverJson)?.id ?? null
    if (assignedDriver !== undefined && newDriverId !== prevDriverId) {
      if (newDriverId) notifyBookingEvent(updated, 'driver_assigned')
      if (prevDriverId) notifyBookingEvent(updated, 'driver_unassigned', { previousDriverId: prevDriverId })
    } else if (newDriverId) {
      if (status === 'cancelled') notifyBookingEvent(updated, 'driver_cancelled')
      else if (pickupDateTime !== undefined) notifyBookingEvent(updated, 'time_changed')
    }

    // Increment driver and vehicle trip count on completion — only if the booking
    // wasn't already completed (guards against double-increment when admin patches
    // an already-completed booking, e.g. the driver already marked it done).
    if (status === 'completed' && row.status !== 'completed') {
      const d = tryParse(updated.assignedDriverJson ?? row.assignedDriverJson)
      if (d?.id) {
        await prisma.driver.update({ where: { id: d.id }, data: { trips: { increment: 1 } } }).catch(() => {})
      }
      const v = tryParse(updated.assignedVehicleJson ?? row.assignedVehicleJson)
      if (v?.licensePlate) {
        await prisma.vehicle.updateMany({ where: { plate: v.licensePlate }, data: { trips: { increment: 1 } } }).catch(() => {})
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

    // Generate invoice on completion (if not already generated)
    if (status === 'completed' && !updated.invoice) {
      ;(async () => {
        try {
          const invoiceNo = await getInvoiceCounter(prisma)
          const inv = await prisma.invoice.create({ data: { invoiceNo, bookingId: updated.id } })
          ;(updated as any).invoice = inv
        } catch (err) {
          console.error('[INVOICE] Failed to generate invoice:', err)
        }
      })()
    }

    res.json({ booking: buildBooking(updated) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Delete booking ───────────────────────────────────────────────────────────

router.delete('/bookings/:id', requireSuperAdmin, async (req, res) => {
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
    const type: 'upi' | 'standard' = req.body?.type === 'standard' ? 'standard' : 'upi'
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })
    if (row.paymentStatus === 'paid' && row.razorpayPaymentId) return res.status(400).json({ error: 'Booking already paid' })

    // Return cached link if one already exists
    if (row.razorpayLinkUrl) {
      return res.json({ linkUrl: row.razorpayLinkUrl, linkId: row.razorpayLinkId })
    }

    if (!razorpayConfigured()) {
      return res.status(500).json({ error: 'Razorpay not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)' })
    }

    const body: Record<string, any> = {
      amount: (row.price ?? 0) * 100,
      currency: 'INR',
      description: `Trip ${row.tripCode}`,
      reference_id: `${row.tripCode}-${type}`,
      notify: { sms: false, email: false },
    }
    if (type === 'upi') body.upi_link = true

    const r = await createPaymentLink(body)
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return res.status(502).json({ error: `Razorpay error: ${text}` })
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
    if (!razorpayConfigured()) return res.status(500).json({ error: 'Razorpay not configured' })

    const r = await fetchPaymentLink(row.razorpayLinkId)
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

    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 3600000)
    const nowStr = now.toISOString()
    const twoHoursLaterStr = twoHoursLater.toISOString()

    const [todayBookings, driversActive, pendingCount, nextTwoHoursResult, openLeads] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT price, pricing_json FROM bookings
        WHERE status != 'cancelled'
        AND pickup_json::json->>'dateTime' >= ${todayStart}
        AND pickup_json::json->>'dateTime' < ${todayEnd}
      `,
      prisma.driver.count({ where: { status: { not: 'offline' } } }),
      prisma.booking.count({ where: { status: 'pending' } }),
      prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(*) as cnt FROM bookings
        WHERE status IN ('pending','confirmed','assigned')
        AND pickup_json::json->>'dateTime' BETWEEN ${nowStr} AND ${twoHoursLaterStr}
      `,
      prisma.lead.count({ where: { status: { in: ['new', 'called'] } } }),
    ])

    const ridesToday = todayBookings.length
    const revenueToday = todayBookings.reduce((s: number, b: any) => {
      try {
        const pricing = typeof b.pricing_json === 'string' ? JSON.parse(b.pricing_json) : (b.pricing_json ?? {})
        return s + (pricing.totalPrice ?? pricing.total_price ?? b.price ?? 0)
      } catch { return s + (b.price ?? 0) }
    }, 0)

    const nextTwoHours = Number(nextTwoHoursResult[0]?.cnt ?? 0)

    res.json({ ridesToday, revenueToday, driversActive, pendingCount, nextTwoHours, openLeads })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Flight lookup proxy ──────────────────────────────────────────────────────

const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY || ''

router.get('/flights/lookup', async (req: Request, res: Response) => {
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
