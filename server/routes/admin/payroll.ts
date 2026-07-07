import { Router } from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { requireSuperAdmin } from './shared'

const router = Router()

// ─── Salary structures ────────────────────────────────────────────────────────
// Fixed base salary + per-trip outstation allowance + % profit-share on external
// (Uber/Ola) platform earnings run on company vehicles. Payroll-run calculation
// (pulling shift/trip data, generating payslips) is a follow-up — this just
// stores the compensation terms per driver.

const salarySchema = z.object({
  base_monthly: z.union([z.number(), z.string()]),
  outstation_allowance: z.union([z.number(), z.string()]).optional(),
  profit_share_rate_pct: z.union([z.number(), z.string()]).optional(),
  effective_from: z.string(),
})

router.get('/drivers/:id/salary', async (req, res) => {
  try {
    const salary = await prisma.salaryStructure.findUnique({ where: { driverId: String(req.params.id) } })
    res.json({ salary })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/drivers/:id/salary', requireSuperAdmin, async (req, res) => {
  try {
    const parsed = salarySchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
    const driverId = String(req.params.id)
    const { base_monthly, outstation_allowance = 0, profit_share_rate_pct = 0, effective_from } = parsed.data

    const salary = await prisma.salaryStructure.upsert({
      where: { driverId },
      update: {
        baseMonthly: Number(base_monthly),
        outstationAllowance: Number(outstation_allowance),
        profitShareRatePct: Number(profit_share_rate_pct),
        effectiveFrom: effective_from,
      },
      create: {
        id: 'sal' + randomUUID().slice(0, 8),
        driverId,
        baseMonthly: Number(base_monthly),
        outstationAllowance: Number(outstation_allowance),
        profitShareRatePct: Number(profit_share_rate_pct),
        effectiveFrom: effective_from,
      },
    })
    res.json({ salary })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Shifts ────────────────────────────────────────────────────────────────────

router.get('/drivers/:id/shifts', async (req, res) => {
  try {
    const rows = await prisma.shift.findMany({
      where: { driverId: String(req.params.id) },
      orderBy: { clockInAt: 'desc' },
      take: 50,
    })
    res.json({ shifts: rows })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── External platform (Uber/Ola) earnings ───────────────────────────────────
// Manual entry — no API integration with Uber/Ola exists, so ops logs gross
// earnings per driver/period as the input to profit-share.

const earningSchema = z.object({
  platform: z.enum(['uber', 'ola']),
  vehicle_id: z.string().nullish(),
  period_start: z.string(),
  period_end: z.string(),
  gross_amount: z.union([z.number(), z.string()]),
  notes: z.string().nullish(),
})

router.get('/drivers/:id/external-earnings', async (req, res) => {
  try {
    const rows = await prisma.externalPlatformEarning.findMany({
      where: { driverId: String(req.params.id) },
      orderBy: { periodStart: 'desc' },
    })
    res.json({ earnings: rows })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/drivers/:id/external-earnings', async (req, res) => {
  try {
    const parsed = earningSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
    const { platform, vehicle_id, period_start, period_end, gross_amount, notes } = parsed.data

    const row = await prisma.externalPlatformEarning.create({
      data: {
        id: 'ext' + randomUUID().slice(0, 8),
        driverId: String(req.params.id),
        vehicleId: vehicle_id ?? null,
        platform,
        periodStart: period_start,
        periodEnd: period_end,
        grossAmount: Number(gross_amount),
        notes: notes ?? null,
      },
    })
    res.json({ earning: row })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Cash float ────────────────────────────────────────────────────────────────
// Bookings the driver collected cash/UPI for and self-reported (driverReported)
// but ops hasn't yet reconciled against the bank/UPI statement — this is money
// the driver is currently holding on the company's behalf, to be netted at the
// next payroll run.

router.get('/drivers/:id/cash-float', async (req, res) => {
  try {
    const driverId = String(req.params.id)
    const rows = await prisma.booking.findMany({
      where: { driverId, driverReported: true, paymentStatus: 'paid' },
      select: { id: true, tripCode: true, price: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    const outstanding = rows.reduce((sum, b) => sum + (b.price ?? 0), 0)
    res.json({ outstanding, bookings: rows })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
