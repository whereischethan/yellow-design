// One-time backfill: generate Invoice records for all existing completed bookings.
// Run with: npx ts-node -r dotenv/config server/scripts/backfill-invoices.ts
// Safe to re-run — skips bookings that already have an invoice.

import { PrismaClient } from '@prisma/client'

const envPath = require('path').join(__dirname, '../.env')
try { require('dotenv').config({ path: envPath }) } catch {}
try { require('dotenv').config() } catch {}

const prisma = new PrismaClient()

async function getFY(date: Date): Promise<string> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const fyStart = month >= 4 ? year : year - 1
  const fyEnd = (fyStart + 1) % 100
  return `${fyStart % 100}${String(fyEnd).padStart(2, '0')}`
}

function getQuarter(date: Date): number {
  const month = date.getMonth() + 1
  if (month >= 4 && month <= 6)   return 1
  if (month >= 7 && month <= 9)   return 2
  if (month >= 10 && month <= 12) return 3
  return 4
}

async function nextSeq(fy: string, quarter: number): Promise<number> {
  const existing = await prisma.invoiceCounter.findUnique({ where: { fy_quarter: { fy, quarter } } })
  if (existing) {
    const updated = await prisma.invoiceCounter.update({
      where: { fy_quarter: { fy, quarter } },
      data: { lastSeq: { increment: 1 } },
    })
    return updated.lastSeq
  }
  const seedRow = await prisma.pricingConfig.findUnique({ where: { key: 'invoice_start_seq' } })
  const seed = seedRow ? Math.max(0, parseInt(seedRow.value) || 0) : 0
  const created = await prisma.invoiceCounter.create({ data: { fy, quarter, lastSeq: seed + 1 } })
  return created.lastSeq
}

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { status: 'completed', invoice: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, tripCode: true, createdAt: true },
  })

  console.log(`Found ${bookings.length} completed bookings without invoices.`)
  if (!bookings.length) { console.log('Nothing to backfill.'); return }

  let generated = 0
  for (const booking of bookings) {
    try {
      const date = new Date(booking.createdAt)
      const fy = await getFY(date)
      const quarter = getQuarter(date)
      const seq = await nextSeq(fy, quarter)
      const invoiceNo = `YL/${fy}/Q${quarter}/${String(seq).padStart(5, '0')}`
      await prisma.invoice.create({ data: { invoiceNo, bookingId: booking.id } })
      console.log(`  ${invoiceNo}  →  ${booking.tripCode}`)
      generated++
    } catch (err: any) {
      console.error(`  SKIP ${booking.tripCode}: ${err.message}`)
    }
  }

  console.log(`\nDone. Generated ${generated} invoices.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
