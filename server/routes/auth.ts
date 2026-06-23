import { Router, Request, Response } from 'express'
import { randomUUID, randomInt } from 'crypto'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma'
import { signAccessToken, signRefreshToken } from '../middleware/auth'

const router = Router()

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || ''
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || ''
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

function generateOtp(): string {
  return String(randomInt(1000, 10000))
}

async function sendOtpViaMSG91(phone: string, otp: string): Promise<void> {
  if (!MSG91_AUTH_KEY) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`)
    return
  }
  const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(MSG91_TEMPLATE_ID)}&mobile=${encodeURIComponent(phone)}&otp=${encodeURIComponent(otp)}`
  const res = await fetch(url, { headers: { authkey: MSG91_AUTH_KEY } })
  if (!res.ok) throw new Error('Failed to send OTP via MSG91')
}

router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone, countryCode = '+91' } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone number required' })

    const fullPhone = `${countryCode.replace('+', '')}${phone}`

    const windowStart = BigInt(Math.floor(Date.now() / 1000) - SEND_WINDOW_SECS)
    const recentCount = await prisma.otpSession.count({
      where: { phone: fullPhone, createdAt: { gt: windowStart } },
    })
    if (recentCount >= MAX_SENDS_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' })
    }

    await prisma.otpSession.deleteMany({ where: { phone: fullPhone, verified: 0 } })

    const otp = generateOtp()
    const id = randomUUID()
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + OTP_TTL_SECS)
    await prisma.otpSession.create({ data: { id, phone: fullPhone, otp, expiresAt } })

    await sendOtpViaMSG91(fullPhone, otp)

    return res.json({ message: 'OTP sent' })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to send OTP' })
  }
})

router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { phone, countryCode = '+91' } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone number required' })

    const fullPhone = `${countryCode.replace('+', '')}${phone}`

    const windowStart = BigInt(Math.floor(Date.now() / 1000) - SEND_WINDOW_SECS)
    const recentCount = await prisma.otpSession.count({
      where: { phone: fullPhone, createdAt: { gt: windowStart } },
    })
    if (recentCount >= MAX_SENDS_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many OTP requests. Please try again later.' })
    }

    await prisma.otpSession.deleteMany({ where: { phone: fullPhone, verified: 0 } })

    const otp = generateOtp()
    const id = randomUUID()
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + OTP_TTL_SECS)
    await prisma.otpSession.create({ data: { id, phone: fullPhone, otp, expiresAt } })

    await sendOtpViaMSG91(fullPhone, otp)

    return res.json({ message: 'OTP resent' })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to resend OTP' })
  }
})

router.post('/verify-otp', verifyRateLimit, async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' })

    const now = BigInt(Math.floor(Date.now() / 1000))

    const session = await prisma.otpSession.findFirst({
      where: {
        phone,
        otp,
        expiresAt: { gt: now },
        verified: 0,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!session) return res.status(400).json({ error: 'Invalid or expired OTP' })

    await prisma.otpSession.update({
      where: { id: session.id },
      data: { verified: 1 },
    })

    let user = await prisma.user.findFirst({ where: { phone } })
    if (!user) {
      const userId = randomUUID()
      user = await prisma.user.create({ data: { id: userId, phone } })
    }

    const [accessToken, refreshToken, bookingCount] = await Promise.all([
      Promise.resolve(signAccessToken(user.id)),
      Promise.resolve(signRefreshToken(user.id)),
      prisma.booking.count({ where: { userId: user.id, status: { not: 'cancelled' } } }),
    ])
    const rtExpiry = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 3600)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: rtExpiry },
    })

    return res.json({
      token: accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, name: user.name, email: user.email, role: user.role, referralCode: user.referralCode, referralCredits: user.referralCredits, referredById: user.referredById, bookingCount },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to verify OTP' })
  }
})

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' })

    const now = BigInt(Math.floor(Date.now() / 1000))

    const rt = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: { gt: now },
      },
    })

    if (!rt) return res.status(401).json({ error: 'Invalid or expired refresh token' })

    const newAccessToken = signAccessToken(rt.userId)
    return res.json({ token: newAccessToken })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to refresh token' })
  }
})

export default router
