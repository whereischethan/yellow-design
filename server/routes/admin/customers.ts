import { Router } from 'express'
import { randomUUID } from 'crypto'
import prisma from '../../lib/prisma'
import { requireSuperAdmin, tryParse, buildBooking } from './shared'

const router = Router()

// ─── Customers ────────────────────────────────────────────────────────────────

router.get('/customers', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const offset = Number(req.query.offset) || 0
    const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset })
    const userIds = rows.map(u => u.id)
    const [tripCounts, completedBookings] = await Promise.all([
      prisma.booking.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { id: true } }),
      prisma.booking.findMany({
        where: { status: 'completed', userId: { in: userIds } },
        select: { userId: true, price: true, pricingJson: true },
      }),
    ])
    const countMap = new Map(tripCounts.map(t => [t.userId, t._count.id]))
    const spendMap = new Map<string, number>()
    for (const b of completedBookings) {
      if (!b.userId) continue
      const pricing = tryParse(b.pricingJson)
      const amount = b.price || pricing?.totalPrice || 0
      spendMap.set(b.userId, (spendMap.get(b.userId) ?? 0) + amount)
    }

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
      total_spend: spendMap.get(u.id) ?? 0,
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

router.post('/customers/generate-referral-codes', requireSuperAdmin, async (req, res) => {
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

router.get('/leads', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500)
    const offset = Number(req.query.offset) || 0
    // Auto-expire open leads older than 24 hours to 'lost'
    const cutoff = new Date(Date.now() - 24 * 3600000).toISOString()
    await prisma.lead.updateMany({
      where: { status: { in: ['new', 'called'] }, quotedAt: { lt: cutoff } },
    data: { status: 'lost' },
    })

    const rows = await prisma.lead.findMany({
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { quotedAt: 'desc' },
      take: limit,
      skip: offset,
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
        pickup: tryParse(r.pickupJson),
        drop: tryParse(r.dropJson),
        stops: tryParse(r.stopsJson),
        pricing: tryParse(r.pricingJson),
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

export default router
