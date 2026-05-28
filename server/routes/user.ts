import { Router, Response } from 'express'
import { randomUUID } from 'crypto'
import { requireAuth, AuthRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { sendMetaEvent } from '../lib/metaPixel'

const router = Router()

function buildReferralCode(name: string, phone: string): string {
  const first = name.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)
  const suffix = phone.replace(/\D/g, '').slice(-4)
  return `${first || 'RIDER'}${suffix}`
}

async function generateUniqueReferralCode(name: string, phone: string): Promise<string> {
  const base = buildReferralCode(name, phone)
  let candidate = base
  let attempt = 0
  while (true) {
    const exists = await prisma.user.findUnique({ where: { referralCode: candidate } })
    if (!exists) return candidate
    candidate = `${base}${++attempt}`
  }
}

router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [userRow, bookingCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, phone: true, name: true, email: true, role: true,
                  referralCode: true, referralCredits: true, referredById: true },
      }),
      prisma.booking.count({ where: { userId: req.userId! } }),
    ])
    if (!userRow) return res.status(404).json({ error: 'User not found' })

    let user = userRow

    // Backfill referral code for users who registered before the referral system
    if (!user.referralCode && user.name) {
      const code = await generateUniqueReferralCode(user.name, user.phone)
      user = await prisma.user.update({
        where: { id: req.userId! },
        data: { referralCode: code },
        select: { id: true, phone: true, name: true, email: true, role: true,
                  referralCode: true, referralCredits: true, referredById: true },
      })
    }

    return res.json({ user: { ...user, bookingCount } })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to fetch profile' })
  }
})

router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, appliedReferralCode } = req.body
    const data: any = {}

    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email

    if (Object.keys(data).length === 0 && !appliedReferralCode) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const current = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { name: true, phone: true, referralCode: true, referredById: true },
    })
    if (!current) return res.status(404).json({ error: 'User not found' })

    // Generate referral code when name is set for the first time
    if (name && !current.referralCode) {
      data.referralCode = await generateUniqueReferralCode(name, current.phone)
    }

    // Apply an incoming referral code (only once per user)
    if (appliedReferralCode && !current.referredById) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: String(appliedReferralCode).toUpperCase().trim() },
        select: { id: true },
      })
      if (!referrer) return res.status(400).json({ error: 'Invalid referral code' })
      if (referrer.id === req.userId) return res.status(400).json({ error: 'Cannot use your own referral code' })

      data.referredById = referrer.id
    }

    const isFirstName = name && !current.name  // name set for the first time = onboarding complete

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
      select: { id: true, phone: true, name: true, email: true, role: true,
                referralCode: true, referralCredits: true, referredById: true },
    })

    // Meta Conversions API — CompleteRegistration when onboarding name step completes
    if (isFirstName) {
      sendMetaEvent('CompleteRegistration', {
        phone:          user.phone,
        email:          user.email,
        userAgent:      req.headers['user-agent'],
        fbp:            req.cookies?.['_fbp'],
        eventId:        `reg_${user.id}`,
        eventSourceUrl: 'https://book.ridewithyellow.com',
      })
    }

    return res.json({ user })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to update profile' })
  }
})

router.get('/referrals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { referralCode: true, referralCredits: true, referrals: { select: { name: true, createdAt: true } } },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const invited = (user.referrals ?? []).map(r => ({
      name: r.name ?? 'Yellow rider',
      date: r.createdAt,
    }))

    return res.json({ earned: user.referralCredits, invited })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.get('/support-contact', requireAuth, (_req: AuthRequest, res: Response) => {
  const number = process.env.SUPPORT_WHATSAPP_NUMBER || '918628062808'
  return res.json({ support: { whatsappNumber: number } })
})

router.get('/places', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const places = await prisma.savedPlace.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ places })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.post('/places', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { label, address, placeId, lat, lng } = req.body
    if (!label || !address) return res.status(400).json({ error: 'label and address required' })
    const place = await prisma.savedPlace.create({
      data: {
        id: randomUUID(),
        userId: req.userId!,
        label,
        address,
        placeId: placeId ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
      },
    })
    return res.json({ place })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.patch('/places/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const place = await prisma.savedPlace.findUnique({ where: { id } })
    if (!place || place.userId !== req.userId) return res.status(404).json({ error: 'Place not found' })
    const { label, address, placeId, lat, lng } = req.body
    const updated = await prisma.savedPlace.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(address !== undefined && { address }),
        ...(placeId !== undefined && { placeId }),
        ...(lat !== undefined && { lat }),
        ...(lng !== undefined && { lng }),
      },
    })
    return res.json({ place: updated })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

router.delete('/places/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id)
    const place = await prisma.savedPlace.findUnique({ where: { id } })
    if (!place || place.userId !== req.userId) return res.status(404).json({ error: 'Place not found' })
    await prisma.savedPlace.delete({ where: { id } })
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
})

export default router
