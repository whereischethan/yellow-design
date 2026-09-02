import { Router } from 'express'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { COMPANY_KEYS } from '../../lib/invoice'
import { getEmptyLegStatus } from '../../lib/emptyLeg'
import { requireSuperAdmin } from './shared'
import { BLR_AIRPORT_PLACE_ID, getTotalDistance, calcAirportPrice, calcOutstationPrice, calcHourlyPrice } from '../../lib/pricingCalc'

const router = Router()

// ─── Availability blocks ──────────────────────────────────────────────────────

router.get('/availability/blocks', async (_req, res) => {
  try {
    const blocks = await prisma.availabilityBlock.findMany({ orderBy: { startAt: 'asc' } })
    return res.json({ blocks })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/availability/blocks', async (req, res) => {
  try {
    const { startAt, endAt, reason } = req.body
    if (!startAt || !endAt) return res.status(400).json({ error: 'startAt and endAt required' })
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (end <= start) return res.status(400).json({ error: 'endAt must be after startAt' })

    const block = await prisma.availabilityBlock.create({
      data: { startAt: start, endAt: end, reason: reason?.trim() || null },
    })

    // Warn about confirmed bookings that fall inside this block
    const affected = await prisma.$queryRaw<{ id: string; trip_code: string; pickup_json: string }[]>`
      SELECT id, trip_code, pickup_json FROM bookings
      WHERE status NOT IN ('cancelled','completed')
      AND pickup_json::json->>'dateTime' BETWEEN ${start.toISOString()} AND ${end.toISOString()}
    `
    return res.json({ block, affectedBookings: affected.map(b => ({ id: b.id, tripCode: b.trip_code, pickup: JSON.parse(b.pickup_json) })) })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.delete('/availability/blocks/:id', async (req, res) => {
  try {
    await prisma.availabilityBlock.delete({ where: { id: Number(req.params.id) } })
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.get('/availability/notifications', async (req, res) => {
  try {
    const skip = Number(req.query.skip ?? 0)
    const take = Math.min(Number(req.query.take ?? 100), 200)
    const [notifications, total] = await Promise.all([
      prisma.availabilityNotification.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.availabilityNotification.count(),
    ])
    return res.json({ notifications, total, skip, take })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.patch('/availability/notifications/:id/notify', async (req, res) => {
  try {
    const updated = await prisma.availabilityNotification.update({
      where: { id: Number(req.params.id) },
      data: { notifiedAt: new Date() },
    })
    return res.json({ notification: updated })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
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

const configPutSchema = z.object({
  // Values are coerced with String(...) in the handlers, so accept anything.
  config: z.record(z.string(), z.any()).optional(),
}).passthrough()

router.put('/pricing', requireSuperAdmin, async (req, res) => {
  try {
    const parsed = configPutSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
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
    const { originPlaceId, destPlaceId, tripType = 'airport', distanceKm: manualKm, stopPlaceIds = [], durationHours, tripKind, nights } = req.body

    const rows = await prisma.pricingConfig.findMany()
    const cfg: Record<string, number> = rows.reduce((acc, r) => ({ ...acc, [r.key]: parseFloat(r.value) }), {} as Record<string, number>)

    // Hourly: no distance calculation needed
    if (tripType === 'hourly') {
      const hours = parseFloat(durationHours) || 4
      const pricing = calcHourlyPrice(hours, cfg)
      return res.json({ distanceKm: 0, durationMinutes: hours * 60, tripType, ...pricing })
    }

    let distanceKm: number
    let durationMinutes: number

    if (manualKm !== undefined) {
      distanceKm = parseFloat(manualKm)
      durationMinutes = Math.round(distanceKm * 1.5)
    } else if (originPlaceId) {
      if (tripType === 'outstation') {
        if (!destPlaceId) return res.status(400).json({ error: 'destPlaceId required' })
        ;({ distanceKm, durationMinutes } = await getTotalDistance(originPlaceId, destPlaceId, stopPlaceIds))
      } else {
        ;({ distanceKm, durationMinutes } = await getTotalDistance(originPlaceId, BLR_AIRPORT_PLACE_ID, stopPlaceIds))
      }
    } else {
      return res.status(400).json({ error: 'originPlaceId or distanceKm required' })
    }

    if (tripType === 'outstation') {
      const pricing = calcOutstationPrice(distanceKm, cfg, { tripKind, nights })
      return res.json({ distanceKm, durationMinutes, tripType, ...pricing })
    }

    const pricing = calcAirportPrice(distanceKm, cfg)
    res.json({ distanceKm, durationMinutes, tripType, ...pricing })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Settings (company config stored in pricing_config KV table) ──────────────

router.get('/settings', async (_req, res) => {
  try {
    const rows = await prisma.pricingConfig.findMany({ where: { key: { in: COMPANY_KEYS } } })
    const config: Record<string, string> = {}
    for (const { key, value } of rows) config[key] = value
    res.json({ config })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/settings', requireSuperAdmin, async (req, res) => {
  try {
    const parsed = configPutSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
    const { config } = req.body
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'config object required' })

    const allowed = Object.fromEntries(
      Object.entries(config).filter(([k]) => COMPANY_KEYS.includes(k))
    )
    await Promise.all(
      Object.entries(allowed).map(([key, value]) =>
        prisma.pricingConfig.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    )
    const rows = await prisma.pricingConfig.findMany({ where: { key: { in: COMPANY_KEYS } } })
    const updated: Record<string, string> = {}
    for (const { key, value } of rows) updated[key] = value
    res.json({ config: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Empty leg ────────────────────────────────────────────────────────────────

router.get('/empty-leg/status', async (_req, res) => {
  try {
    const status = await getEmptyLegStatus()
    res.json(status)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/empty-leg/toggle', requireSuperAdmin, async (req, res) => {
  try {
    const { key, value } = req.body
    const allowed = ['empty_leg_drops_active', 'empty_leg_pickups_active', 'promo_flat_active']
    if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid key' })
    await prisma.pricingConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/empty-leg/config', requireSuperAdmin, async (req, res) => {
  try {
    const allowed = [
      'empty_leg_discount_pct',
      'empty_leg_pre_start_min', 'empty_leg_pre_end_min',
      'empty_leg_post_start_min', 'empty_leg_post_end_min',
      'empty_leg_pre_radius_km', 'empty_leg_post_radius_km',
      'home_base_fare', 'home_base_radius_km',
      'first_ride_discount_pct', 'first_ride_discount_threshold',
      'promo_flat_fare', 'promo_flat_km_threshold', 'promo_flat_per_km_beyond',
    ]
    const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k))
    await Promise.all(entries.map(([key, value]) =>
      prisma.pricingConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    ))
    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
