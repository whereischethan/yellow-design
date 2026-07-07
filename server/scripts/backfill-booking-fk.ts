/**
 * backfill-booking-fk.ts
 *
 * One-time backfill: populate Booking.driverId / Booking.vehicleId from the legacy
 * assignedDriverJson / assignedVehicleJson blobs, now that real FK columns exist.
 *
 * assignedVehicleJson rarely carries a real Vehicle.id (it was usually derived from the
 * driver's denormalized plate string), so vehicleId is resolved via the driver's plate
 * match against Vehicle.plate, falling back to whatever vehicle that driver is
 * currently assigned to.
 *
 * Idempotent — only touches rows where driverId/vehicleId is still null.
 * Run: npx ts-node --project server/tsconfig.json server/scripts/backfill-booking-fk.ts
 */

import prisma from '../lib/prisma'

async function main() {
  const rows = await prisma.booking.findMany({
    where: { OR: [{ driverId: null }, { vehicleId: null }] },
    select: { id: true, assignedDriverJson: true, assignedVehicleJson: true, driverId: true, vehicleId: true },
  })

  const vehiclesByPlate = new Map(
    (await prisma.vehicle.findMany({ select: { id: true, plate: true, driverId: true } })).map(v => [v.plate, v])
  )

  let driverUpdates = 0
  let vehicleUpdates = 0

  for (const row of rows) {
    const data: { driverId?: string; vehicleId?: string } = {}

    if (!row.driverId && row.assignedDriverJson) {
      try {
        const d = JSON.parse(row.assignedDriverJson)
        if (d?.id) { data.driverId = d.id; driverUpdates++ }
      } catch {}
    }

    if (!row.vehicleId) {
      let vehicle = null
      if (row.assignedVehicleJson) {
        try {
          const v = JSON.parse(row.assignedVehicleJson)
          const plate = v?.licensePlate ?? v?.plate
          if (plate) vehicle = vehiclesByPlate.get(plate)
        } catch {}
      }
      if (!vehicle && data.driverId) {
        vehicle = [...vehiclesByPlate.values()].find(v => v.driverId === data.driverId)
      }
      if (vehicle) { data.vehicleId = vehicle.id; vehicleUpdates++ }
    }

    if (Object.keys(data).length > 0) {
      await prisma.booking.update({ where: { id: row.id }, data })
    }
  }

  console.log(`Backfilled ${driverUpdates} driverId, ${vehicleUpdates} vehicleId out of ${rows.length} candidate bookings.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
