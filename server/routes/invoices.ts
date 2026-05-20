import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { getCompanyConfig, generateInvoiceHtml } from '../lib/invoice'
import { sendInvoiceEmail } from '../lib/email'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod'
const ADMIN_KEY  = process.env.ADMIN_KEY  || 'yellow-ops-dev'

function extractToken(req: Request): string | null {
  if (req.headers['x-admin-key'] === ADMIN_KEY) return '__admin_key__'
  if (req.headers.authorization?.startsWith('Bearer ')) return req.headers.authorization.slice(7)
  if (typeof req.query.token === 'string') return req.query.token
  return null
}

function verifyToken(raw: string): { role: 'admin' } | { userId: string } | null {
  if (raw === '__admin_key__') return { role: 'admin' }
  try {
    const p = jwt.verify(raw, JWT_SECRET) as any
    if (p?.role === 'admin') return { role: 'admin' }
    if (p?.userId) return { userId: p.userId }
  } catch {}
  return null
}

async function getInvoiceData(tripCode: string) {
  const booking = await prisma.booking.findUnique({
    where: { tripCode },
    include: { user: { select: { name: true, phone: true, email: true } }, invoice: true },
  })
  if (!booking) return null
  const company = await getCompanyConfig(prisma)
  const invoiceNo = booking.invoice?.invoiceNo ?? '—'
  // Invoice date = ride pickup date, fallback to booking created date
  const pickupJson = booking.pickupJson ? JSON.parse(booking.pickupJson) : null
  const rideDate = pickupJson?.dateTime ? new Date(pickupJson.dateTime) : new Date(booking.createdAt)
  const html = generateInvoiceHtml(booking, invoiceNo, rideDate, company, booking.user)
  return { booking, invoiceNo, html }
}

// View invoice — admin can see any; customer can only see their own completed booking
router.get('/:tripCode', async (req, res) => {
  try {
    const raw = extractToken(req)
    if (!raw) return res.status(401).send('<h1>Unauthorized</h1>')
    const caller = verifyToken(raw)
    if (!caller) return res.status(401).send('<h1>Unauthorized</h1>')

    const data = await getInvoiceData(String(req.params.tripCode))
    if (!data) return res.status(404).send('<h1>Invoice not found</h1>')

    // Customers can only view their own invoices
    if (!('role' in caller)) {
      if (data.booking.userId !== caller.userId) return res.status(403).send('<h1>Forbidden</h1>')
      if (data.booking.status !== 'completed') return res.status(403).send('<h1>Invoice not available</h1>')
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(data.html)
  } catch (e: any) {
    res.status(500).send(`<h1>Error</h1><pre>${e.message}</pre>`)
  }
})

// Email invoice — admin only
router.post('/:tripCode/email', async (req, res) => {
  const raw = extractToken(req)
  const caller = raw ? verifyToken(raw) : null
  if (!caller || !('role' in caller)) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { to } = req.body as { to: string | string[] }
    if (!to) return res.status(400).json({ error: 'Missing "to" field' })

    const data = await getInvoiceData(String(req.params.tripCode))
    if (!data) return res.status(404).json({ error: 'Invoice not found' })

    const recipients = (Array.isArray(to) ? to : [to]).map(e => e.trim()).filter(Boolean)
    if (!recipients.length) return res.status(400).json({ error: 'No valid recipients' })

    await Promise.all(
      recipients.map(addr =>
        sendInvoiceEmail(addr, data.invoiceNo, String(req.params.tripCode), data.html)
      )
    )
    res.json({ sent: recipients })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
