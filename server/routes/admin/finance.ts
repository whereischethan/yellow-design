import { Router } from 'express'
import prisma from '../../lib/prisma'
import { buildBooking } from './shared'

const router = Router()

// ─── Finance summary ──────────────────────────────────────────────────────────

// Driver-collected payments (direct UPI / cash) awaiting verification against
// the bank or UPI statement.
router.get('/finance/unverified', async (_req, res) => {
  try {
    const rows = await prisma.booking.findMany({
      where: { driverReported: true, paymentStatus: 'paid' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { invoice: true },
    })
    res.json({ bookings: rows.map(buildBooking) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/bookings/:id/verify-payment', async (req, res) => {
  try {
    const row = await prisma.booking.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Booking not found' })
    const updated = await prisma.booking.update({
      where: { id: row.id },
      data: { driverReported: false },
      include: { invoice: true },
    })
    res.json({ booking: buildBooking(updated) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/finance/summary', async (req, res) => {
  try {
    // Default: last 12 complete months + current month
    const now = new Date()
    const fromDefault = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const from = req.query.from ? new Date(String(req.query.from)) : fromDefault
    const to   = req.query.to   ? new Date(String(req.query.to))   : new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        trip_type,
        payment_status,
        payment_method,
        pricing_json,
        pickup_json,
        status
      FROM bookings
      WHERE status NOT IN ('cancelled')
        AND pickup_json::json->>'dateTime' >= ${from.toISOString()}
        AND pickup_json::json->>'dateTime' <  ${to.toISOString()}
    `

    // Aggregate helpers
    const getPrice = (row: any): number => {
      try {
        const p = typeof row.pricing_json === 'string' ? JSON.parse(row.pricing_json) : (row.pricing_json ?? {})
        return Number(p.totalPrice ?? p.total_price ?? row.price ?? 0)
      } catch { return 0 }
    }
    const getGst = (row: any): number => {
      try {
        const p = typeof row.pricing_json === 'string' ? JSON.parse(row.pricing_json) : (row.pricing_json ?? {})
        return Number(p.gst ?? 0)
      } catch { return 0 }
    }
    const getMonth = (row: any): string => {
      try {
        const dt = JSON.parse(row.pickup_json)?.dateTime
        if (!dt) return 'unknown'
        const d = new Date(dt)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      } catch { return 'unknown' }
    }
    const labelTripType = (tt: string | null): string => {
      if (tt === 'pickup')    return 'Airport Pickup'
      if (tt === 'drop')      return 'Airport Drop'
      if (tt === 'outstation') return 'Outstation'
      if (tt === 'hourly')    return 'Hourly'
      return 'Other'
    }

    // Monthly buckets: revenue = completed (earned), collected = paid, upcoming = confirmed/assigned
    const monthlyMap: Record<string, { revenue: number; collected: number; upcoming: number; gst: number; rides: number }> = {}
    // Revenue by trip type (completed only)
    const byType: Record<string, { revenue: number; gst: number; rides: number }> = {}
    // Payment method breakdown (completed + paid)
    const byMethod: Record<string, number> = {}
    // Receivables: completed but not paid
    let outstandingAmount = 0
    let outstandingCount  = 0
    let totalCollected    = 0

    for (const row of rows) {
      const price = getPrice(row)
      const gst   = getGst(row)
      const month = getMonth(row)
      const typeLabel = labelTripType(row.trip_type)
      const completed = row.status === 'completed'
      const upcoming  = ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress'].includes(row.status)
      const paid      = row.payment_status === 'paid'

      if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, collected: 0, upcoming: 0, gst: 0, rides: 0 }
      monthlyMap[month].rides++

      if (completed) {
        monthlyMap[month].revenue += price
        monthlyMap[month].gst    += gst
        if (paid) {
          monthlyMap[month].collected += price
          totalCollected += price
        } else {
          outstandingAmount += price
          outstandingCount++
        }
      } else if (upcoming) {
        monthlyMap[month].upcoming += price
      }

      // By type — completed only
      if (completed) {
        if (!byType[typeLabel]) byType[typeLabel] = { revenue: 0, gst: 0, rides: 0 }
        byType[typeLabel].revenue += price
        byType[typeLabel].gst    += gst
        byType[typeLabel].rides++
      }

      // Payment method — completed + paid
      if (completed && paid) {
        const method = row.payment_method || 'cash'
        byMethod[method] = (byMethod[method] ?? 0) + price
      }
    }

    // Sort months chronologically
    const monthly = Object.entries(monthlyMap)
      .filter(([k]) => k !== 'unknown')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }))

    const typeOrder = ['Airport Pickup', 'Airport Drop', 'Outstation', 'Hourly', 'Other']
    const byTypeSorted = typeOrder
      .filter(t => byType[t])
      .map(t => ({ type: t, ...byType[t] }))

    const totalRevenue  = monthly.reduce((s, m) => s + m.revenue, 0)
    const totalUpcoming = monthly.reduce((s, m) => s + m.upcoming, 0)
    const totalGst      = monthly.reduce((s, m) => s + m.gst, 0)
    const totalRides    = monthly.reduce((s, m) => s + m.rides, 0)

    res.json({
      totalRevenue, totalCollected, totalGst, totalRides,
      outstandingAmount, outstandingCount, totalUpcoming,
      monthly, byType: byTypeSorted, byMethod,
      from: from.toISOString(), to: to.toISOString(),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Invoice list ─────────────────────────────────────────────────────────────

router.get('/invoices', async (req, res) => {
  try {
    const limit  = Math.min(Number(req.query.limit)  || 50, 200)
    const offset = Number(req.query.offset) || 0
    const search = String(req.query.search || '').trim().toLowerCase()

    const rows = await prisma.invoice.findMany({
      orderBy: { generatedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        booking: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    })

    const invoices = rows
      .filter(inv => {
        if (!search) return true
        const b = inv.booking
        return [
          inv.invoiceNo, b.tripCode, b.guestName, b.guestPhone,
          b.user?.name, b.user?.phone,
        ].some(v => v && v.toLowerCase().includes(search))
      })
      .map(inv => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        generatedAt: inv.generatedAt,
        tripCode: inv.booking.tripCode,
        customerName: inv.booking.user?.name ?? inv.booking.guestName ?? null,
        customerPhone: inv.booking.user?.phone ?? inv.booking.guestPhone ?? null,
        amount: inv.booking.price ?? 0,
        paymentStatus: inv.booking.paymentStatus,
        paymentMethod: inv.booking.paymentMethod,
        razorpayPaymentId: inv.booking.razorpayPaymentId ?? null,
      }))

    const total = await prisma.invoice.count()
    res.json({ invoices, total })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── GSTIN lookup ─────────────────────────────────────────────────────────────

router.get('/gstin-lookup', async (req, res) => {
  try {
    const gstin = String(req.query.gstin || '').trim().toUpperCase()
    // Basic 15-char GSTIN format validation
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      return res.status(400).json({ error: 'Invalid GSTIN format' })
    }
    const apiKey = process.env.GSTN_API_KEY
    if (!apiKey) {
      // Return validated GSTIN with state code derived from first 2 digits
      return res.json({ gstin, tradeName: '', legalName: '', address: '' })
    }
    // Placeholder: call GSTN sandbox API when configured
    const apiRes = await fetch(`https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=${gstin}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!apiRes.ok) return res.json({ gstin, tradeName: '', legalName: '', address: '' })
    const data = await apiRes.json() as any
    res.json({
      gstin,
      tradeName: data?.pradr?.ntr ?? data?.tradeNam ?? '',
      legalName: data?.lgnm ?? '',
      address: data?.pradr?.adr ?? '',
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
