import { Router, Request, Response } from 'express'
import { randomUUID, createHmac, randomInt } from 'crypto'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { JWT_SECRET, signAdminToken, requireSuperAdmin } from './shared'

const RAZORPAY_WEBHOOK_SECRET = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()

// ─── Admin OTP login (public — no auth) ──────────────────────────────────────

export const publicRouter = Router()

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

function genOtp(): string {
  return String(randomInt(1000, 10000))
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

publicRouter.post('/login/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone, countryCode = '+91' } = req.body
    if (!phone) return res.status(400).json({ error: 'phone required' })

    const mobile = `${countryCode.replace('+', '')}${phone}`

    if (!(await isAdminPhone(mobile))) {
      return res.status(403).json({ error: 'Phone not authorised as admin' })
    }

    const windowStart = BigInt(Math.floor(Date.now() / 1000) - SEND_WINDOW_SECS)
    const recentCount = await prisma.otpSession.count({
      where: { phone: mobile, createdAt: { gt: windowStart } },
    })
    if (recentCount >= MAX_SENDS_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' })
    }

    await prisma.otpSession.deleteMany({ where: { phone: mobile, verified: 0 } })

    const otp = genOtp()
    const id = randomUUID()
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + OTP_TTL_SECS)
    await prisma.otpSession.create({ data: { id, phone: mobile, otp, expiresAt } })

    const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || ''
    const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || ''
    if (MSG91_AUTH_KEY && countryCode === '+91') {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(MSG91_TEMPLATE_ID)}&mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(otp)}`
      const r = await fetch(url, { headers: { authkey: MSG91_AUTH_KEY } })
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

publicRouter.post('/login/verify-otp', verifyRateLimit, async (req: Request, res: Response) => {
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
        create: { id: randomUUID(), phone: normalizedPhone, role: 'ops' },
      })
      adminName = adminUser.name ?? null
      adminRole = adminUser.role
    } catch {}
    const token = signAdminToken(normalizedPhone, adminRole)
    return res.json({
      token,
      admin: { phone: mobile, name: adminName, role: adminRole },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ─── Razorpay webhook (public — no auth) ─────────────────────────────────────

publicRouter.post('/razorpay-webhook', async (req: Request, res: Response) => {
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

// ─── Protected auth/session/team routes (mounted after requireAdmin) ─────────

export const protectedRouter = Router()

// ─── Auth check ───────────────────────────────────────────────────────────────

protectedRouter.get('/me', (_req, res) => {
  res.json({ ok: true })
})

// Short-lived token for opening invoice HTML in a new tab — avoids putting the
// 30-day admin JWT in a URL (browser history, server logs).
protectedRouter.post('/invoice-token', (_req, res) => {
  res.json({ token: jwt.sign({ role: 'admin', scope: 'invoice' }, JWT_SECRET, { expiresIn: '5m' }) })
})

// ─── Impersonation (superadmin) ───────────────────────────────────────────────
// Issues a short-lived customer/driver token so ops can see the app exactly as
// that person does. The token expires in 1h and never touches their real session.

protectedRouter.post('/impersonate', requireSuperAdmin, async (req, res) => {
  try {
    const { type, id } = req.body
    if (!['user', 'driver'].includes(type) || !id) {
      return res.status(400).json({ error: 'type (user|driver) and id required' })
    }

    if (type === 'user') {
      const user = await prisma.user.findUnique({ where: { id: String(id) } })
      if (!user) return res.status(404).json({ error: 'User not found' })
      const token = jwt.sign({ userId: user.id, impersonated: true }, JWT_SECRET, { expiresIn: '1h' })
      console.log(`[IMPERSONATE] admin → user ${user.id} (${user.phone})`)
      return res.json({ token, name: user.name, phone: user.phone, expiresInMinutes: 60 })
    }

    const driver = await prisma.driver.findUnique({ where: { id: String(id) } })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    const token = jwt.sign({ role: 'driver', driverId: driver.id, phone: driver.phone, impersonated: true }, JWT_SECRET, { expiresIn: '1h' })
    console.log(`[IMPERSONATE] admin → driver ${driver.id} (${driver.phone})`)
    return res.json({ token, name: driver.name, phone: driver.phone, expiresInMinutes: 60 })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

// ─── OTP lookup (for WhatsApp verification relay) ─────────────────────────────

protectedRouter.get('/otp-lookup', requireSuperAdmin, async (req, res) => {
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

// ─── Admin team management ────────────────────────────────────────────────────

protectedRouter.get('/team', async (_req, res) => {
  try {
    const users = await prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } })
    // Normalize phone to last 10 digits in response
    const normalized = users.map(u => ({ ...u, phone: u.phone.replace(/\D/g, '').slice(-10) }))
    res.json({ users: normalized })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const teamCreateSchema = z.object({
  phone: z.union([z.string(), z.number()]).optional(),
  name: z.string().nullish(),
  role: z.string().optional(),
}).passthrough()

protectedRouter.post('/team', requireSuperAdmin, async (req, res) => {
  try {
    const parsed = teamCreateSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
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

protectedRouter.patch('/team/me', async (req: Request, res: Response) => {
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
      create: { id: randomUUID(), phone, name: name ?? null, role: 'ops' },
    })
    res.json({ admin: { phone: updated.phone, name: updated.name, role: updated.role } })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

protectedRouter.delete('/team/:id', requireSuperAdmin, async (req, res) => {
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
