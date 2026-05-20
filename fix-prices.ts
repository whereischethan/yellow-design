import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const fixes = [
  { tripCode: 'YLW-9C88E3', newPrice: 1000 },
  { tripCode: 'YLW-53ZD8J', newPrice: 1000 },
  { tripCode: 'YLW-FUMMTJ', newPrice: 1635 },
  { tripCode: 'YLW-CNTH9Y', newPrice: 1250 },
  { tripCode: 'YLW-6QEUCS', newPrice: 1250 },
]

async function main() {
  for (const { tripCode, newPrice } of fixes) {
    const booking = await prisma.booking.findUnique({
      where: { tripCode },
      select: { id: true, price: true, pricingJson: true },
    })

    if (!booking) {
      console.log(`❌ Not found: ${tripCode}`)
      continue
    }

    const existing = booking.pricingJson ? JSON.parse(booking.pricingJson) : {}
    const updatedPricingJson = JSON.stringify({ ...existing, totalPrice: newPrice })

    await prisma.booking.update({
      where: { tripCode },
      data: {
        price: newPrice,
        pricingJson: updatedPricingJson,
      },
    })

    console.log(`✅ ${tripCode}: ₹${booking.price} → ₹${newPrice}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
