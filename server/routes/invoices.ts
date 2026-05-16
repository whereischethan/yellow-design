import { Router } from 'express'
import prisma from '../lib/prisma'
import { getCompanyConfig, generateInvoiceHtml } from '../lib/invoice'

const router = Router()

// Public: accessible via SMS link — tripCode is the access credential
router.get('/:tripCode', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { tripCode: String(req.params.tripCode) },
      include: { user: { select: { name: true, phone: true } }, invoice: true },
    })
    if (!booking) return res.status(404).send('<h1>Invoice not found</h1>')

    const company = await getCompanyConfig(prisma)
    const invoiceNo   = booking.invoice?.invoiceNo ?? '—'
    const invoiceDate = booking.invoice?.generatedAt ?? new Date()

    const html = generateInvoiceHtml(booking, invoiceNo, invoiceDate, company, booking.user)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e: any) {
    res.status(500).send(`<h1>Error</h1><pre>${e.message}</pre>`)
  }
})

export default router
