import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { getCompanyConfig, generateInvoiceHtml, getInvoiceCounter } from '../lib/invoice'
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

// Create custom invoice — admin only
router.post('/:tripCode/custom', async (req, res) => {
  const raw = extractToken(req)
  const caller = raw ? verifyToken(raw) : null
  if (!caller || !('role' in caller)) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const booking = await prisma.booking.findUnique({
      where: { tripCode: String(req.params.tripCode) },
      include: { user: { select: { name: true, phone: true } } },
    })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const {
      amount, driverName, vehiclePlate, customerName,
      pickupLocation, dropLocation, pickupDateTime,
      distanceKm, toll, discount, stops, note,
    } = req.body as {
      amount: number
      driverName?: string; vehiclePlate?: string; customerName?: string
      pickupLocation?: string; dropLocation?: string; pickupDateTime?: string
      distanceKm?: number; toll?: number; discount?: number
      stops?: string[]; note?: string
    }
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ error: 'amount is required' })

    const invoiceNo = await getInvoiceCounter(prisma, 'C')
    const ci = await prisma.customInvoice.create({
      data: {
        invoiceNo,
        bookingId: booking.id,
        customAmount: Math.round(Number(amount)),
        driverName: driverName || null,
        vehiclePlate: vehiclePlate || null,
        customerName: customerName || null,
        pickupLocation: pickupLocation || null,
        dropLocation: dropLocation || null,
        pickupDateTime: pickupDateTime || null,
        distanceKm: distanceKm != null ? Number(distanceKm) : null,
        toll: toll != null ? Math.round(Number(toll)) : null,
        discount: discount != null ? Math.round(Number(discount)) : null,
        stopsJson: stops !== undefined ? JSON.stringify(stops) : null,
        note: note || null,
      },
    })
    res.json({ id: ci.id, invoiceNo })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// View custom invoice — admin or booking owner
router.get('/:tripCode/custom/:id', async (req, res) => {
  try {
    const raw = extractToken(req)
    if (!raw) return res.status(401).send('<h1>Unauthorized</h1>')
    const caller = verifyToken(raw)
    if (!caller) return res.status(401).send('<h1>Unauthorized</h1>')

    const booking = await prisma.booking.findUnique({
      where: { tripCode: String(req.params.tripCode) },
      include: { user: { select: { name: true, phone: true } } },
    })
    if (!booking) return res.status(404).send('<h1>Booking not found</h1>')

    if (!('role' in caller) && booking.userId !== caller.userId) {
      return res.status(403).send('<h1>Forbidden</h1>')
    }

    const ci = await prisma.customInvoice.findFirst({
      where: { id: String(req.params.id), bookingId: booking.id },
    })
    if (!ci) return res.status(404).send('<h1>Custom invoice not found</h1>')

    const company = await getCompanyConfig(prisma)
    const pickupJson = booking.pickupJson ? JSON.parse(booking.pickupJson) : null
    const invoiceDate = pickupJson?.dateTime ? new Date(pickupJson.dateTime) : new Date(booking.createdAt)

    const overrides = {
      amount: ci.customAmount,
      driverName: ci.driverName,
      vehiclePlate: ci.vehiclePlate,
      customerName: ci.customerName,
      pickupLocation: ci.pickupLocation,
      dropLocation: ci.dropLocation,
      pickupDateTime: ci.pickupDateTime,
      distanceKm: ci.distanceKm,
      toll: ci.toll,
      discount: ci.discount,
      stops: ci.stopsJson ? (() => { try { return JSON.parse(ci.stopsJson!) } catch { return null } })() : null,
    }

    const html = generateInvoiceHtml(booking, ci.invoiceNo, invoiceDate, company, booking.user, overrides)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e: any) {
    res.status(500).send(`<h1>Error</h1><pre>${e.message}</pre>`)
  }
})

// Update custom invoice — admin only
router.patch('/:tripCode/custom/:id', async (req, res) => {
  const raw = extractToken(req)
  const caller = raw ? verifyToken(raw) : null
  if (!caller || !('role' in caller)) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const booking = await prisma.booking.findUnique({ where: { tripCode: String(req.params.tripCode) } })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const ci = await prisma.customInvoice.findFirst({ where: { id: String(req.params.id), bookingId: booking.id } })
    if (!ci) return res.status(404).json({ error: 'Not found' })

    const {
      amount, driverName, vehiclePlate, customerName,
      pickupLocation, dropLocation, pickupDateTime,
      distanceKm, toll, discount, stops, note,
    } = req.body as {
      amount?: number; driverName?: string; vehiclePlate?: string; customerName?: string
      pickupLocation?: string; dropLocation?: string; pickupDateTime?: string
      distanceKm?: number; toll?: number; discount?: number
      stops?: string[]; note?: string
    }

    const updated = await prisma.customInvoice.update({
      where: { id: ci.id },
      data: {
        ...(amount != null && { customAmount: Math.round(Number(amount)) }),
        driverName: driverName !== undefined ? (driverName || null) : ci.driverName,
        vehiclePlate: vehiclePlate !== undefined ? (vehiclePlate || null) : ci.vehiclePlate,
        customerName: customerName !== undefined ? (customerName || null) : ci.customerName,
        pickupLocation: pickupLocation !== undefined ? (pickupLocation || null) : ci.pickupLocation,
        dropLocation: dropLocation !== undefined ? (dropLocation || null) : ci.dropLocation,
        pickupDateTime: pickupDateTime !== undefined ? (pickupDateTime || null) : ci.pickupDateTime,
        distanceKm: distanceKm !== undefined ? (distanceKm != null ? Number(distanceKm) : null) : ci.distanceKm,
        toll: toll !== undefined ? (toll != null ? Math.round(Number(toll)) : null) : ci.toll,
        discount: discount !== undefined ? (discount != null ? Math.round(Number(discount)) : null) : ci.discount,
        stopsJson: stops !== undefined ? JSON.stringify(stops) : ci.stopsJson,
        note: note !== undefined ? (note || null) : ci.note,
      },
    })
    res.json({ id: updated.id, invoiceNo: updated.invoiceNo })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// List custom invoices for a booking — admin only
router.get('/:tripCode/custom', async (req, res) => {
  const raw = extractToken(req)
  const caller = raw ? verifyToken(raw) : null
  if (!caller || !('role' in caller)) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const booking = await prisma.booking.findUnique({ where: { tripCode: String(req.params.tripCode) } })
    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    const list = await prisma.customInvoice.findMany({
      where: { bookingId: booking.id },
      orderBy: { generatedAt: 'desc' },
    })
    res.json(list)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
