import { Router } from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { requireSuperAdmin, buildBooking } from './shared'

const router = Router()

// ─── Drivers ──────────────────────────────────────────────────────────────────

router.get('/drivers', async (_req, res) => {
  try {
    const rows = await prisma.driver.findMany({ orderBy: { name: 'asc' } })
    res.json({ drivers: rows })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/drivers/:id/bookings', async (req, res) => {
  try {
    const driverId = String(req.params.id)
    const rows = await prisma.booking.findMany({
      where: { assignedDriverJson: { contains: driverId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const bookings = rows.map(buildBooking)
    const completed = bookings.filter(b => b.status === 'completed')
    const totalEarnings = completed.reduce((sum, b) => sum + (b.pricing?.totalPrice ?? 0), 0)
    // Sync trips count so the list stays accurate
    await prisma.driver.update({ where: { id: driverId }, data: { trips: completed.length } }).catch(() => {})
    res.json({ bookings, completedCount: completed.length, totalEarnings })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const driverCreateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  plate: z.string().nullish(),
  vehicle: z.string().nullish(),
  doc_license: z.string().nullish(),
  doc_aadhaar: z.string().nullish(),
  doc_pan: z.string().nullish(),
  doc_police: z.string().nullish(),
  license_no: z.string().nullish(),
  license_exp: z.string().nullish(),
  photo_url: z.string().nullish(),
  bank_holder: z.string().nullish(),
  bank_ifsc: z.string().nullish(),
  bank_account: z.string().nullish(),
  bank_upi: z.string().nullish(),
}).passthrough()

router.post('/drivers', async (req, res) => {
  const parsed = driverCreateSchema.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
  const { name, phone, plate, vehicle, doc_license, doc_aadhaar, doc_pan, doc_police, license_no, license_exp, photo_url,
    bank_holder, bank_ifsc, bank_account, bank_upi } = req.body
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' })
  try {
    const id = 'd' + randomUUID().slice(0, 8)
    const today = new Date().toISOString().slice(0, 10)
    const row = await prisma.driver.create({
      data: {
        id,
        name,
        phone,
        plate: plate ?? null,
        vehicle: vehicle ?? 'Kia Carens Clavis',
        joined: today,
        docLicense: doc_license ?? null,
        docAadhaar: doc_aadhaar ?? null,
        docPan: doc_pan ?? null,
        docPolice: doc_police ?? null,
        licenseNo: license_no ?? null,
        licenseExp: license_exp ?? null,
        photoUrl: photo_url ?? null,
        bankHolder: bank_holder ?? null,
        bankIfsc: bank_ifsc ?? null,
        bankAccount: bank_account ?? null,
        bankUpi: bank_upi ?? null,
      },
    })
    res.json({ driver: row })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

const driverPatchSchema = z.object({
  status: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  plate: z.string().nullish(),
  vehicle: z.string().nullish(),
  doc_license: z.string().nullish(),
  doc_aadhaar: z.string().nullish(),
  doc_pan: z.string().nullish(),
  doc_police: z.string().nullish(),
  license_no: z.string().nullish(),
  license_exp: z.string().nullish(),
  photo_url: z.string().nullish(),
  bank_holder: z.string().nullish(),
  bank_ifsc: z.string().nullish(),
  bank_account: z.string().nullish(),
  bank_upi: z.string().nullish(),
}).passthrough()

router.patch('/drivers/:id', async (req, res) => {
  try {
    const parsed = driverPatchSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
    const row = await prisma.driver.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Driver not found' })

    const fieldMap: Record<string, string> = {
      status: 'status', name: 'name', phone: 'phone', rating: 'rating', plate: 'plate', vehicle: 'vehicle',
      doc_license: 'docLicense', doc_aadhaar: 'docAadhaar', doc_pan: 'docPan', doc_police: 'docPolice',
      license_no: 'licenseNo', license_exp: 'licenseExp', photo_url: 'photoUrl',
      bank_holder: 'bankHolder', bank_ifsc: 'bankIfsc', bank_account: 'bankAccount', bank_upi: 'bankUpi',
    }
    const data: any = {}
    for (const [rawKey, prismaKey] of Object.entries(fieldMap)) {
      if (req.body[rawKey] !== undefined) data[prismaKey] = req.body[rawKey]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.driver.update({ where: { id: String(req.params.id) }, data })
    res.json({ driver: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const driverExitSchema = z.object({
  note: z.union([z.string(), z.number()]).nullish(),
}).passthrough()

// Offboarding: exited drivers keep their history but can't log in or be assigned.
router.post('/drivers/:id/exit', requireSuperAdmin, async (req, res) => {
  try {
    const parsed = driverExitSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
    const id = String(req.params.id)
    const row = await prisma.driver.findUnique({ where: { id } })
    if (!row) return res.status(404).json({ error: 'Driver not found' })
    if (row.employmentStatus === 'exited') return res.status(400).json({ error: 'Driver already exited' })

    const { note } = req.body ?? {}
    const updated = await prisma.driver.update({
      where: { id },
      data: {
        employmentStatus: 'exited',
        exitedAt: new Date().toISOString().slice(0, 10),
        exitNote: note ? String(note) : null,
        status: 'unavailable',
      },
    })
    await prisma.vehicle.updateMany({ where: { driverId: id }, data: { driverId: null } })
    res.json({ driver: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/drivers/:id/reactivate', requireSuperAdmin, async (req, res) => {
  try {
    const id = String(req.params.id)
    const row = await prisma.driver.findUnique({ where: { id } })
    if (!row) return res.status(404).json({ error: 'Driver not found' })
    const updated = await prisma.driver.update({
      where: { id },
      data: { employmentStatus: 'active', exitedAt: null, exitNote: null, status: 'available' },
    })
    res.json({ driver: updated })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Vehicles ─────────────────────────────────────────────────────────────────

function mapVehicle(v: any) {
  return {
    id: v.id,
    plate: v.plate,
    make: v.make,
    model: v.model,
    color: v.color,
    type: v.type,
    class_key: v.classKey ?? v.class_key,
    year: v.year,
    status: v.status,
    driver_id: v.driverId ?? v.driver_id ?? null,
    trips: v.trips,
    is_ev: v.isEv ?? v.is_ev ?? 0,
    soc: v.soc,
    odometer: v.odometer,
    insurance_expiry: v.insuranceExpiry ?? v.insurance_expiry ?? null,
    fc_expiry: v.fcExpiry ?? v.fc_expiry ?? null,
    maintenance_note: v.maintenanceNote ?? v.maintenance_note ?? null,
    driver_name: v.driver?.name ?? v.driver_name ?? null,
    driver_status: v.driver?.status ?? v.driver_status ?? null,
    driver_phone: v.driver?.phone ?? v.driver_phone ?? null,
  }
}

router.get('/vehicles', async (_req, res) => {
  try {
    const rows = await prisma.vehicle.findMany({
      include: { driver: { select: { name: true, status: true, phone: true } } },
      orderBy: { plate: 'asc' },
    })
    const vehicles = rows.map(mapVehicle)
    res.json({ vehicles })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

const vehicleCreateSchema = z.object({
  plate: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  type: z.string().optional(),
  class_key: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional(),
  is_ev: z.union([z.number(), z.boolean(), z.string()]).optional(),
  soc: z.union([z.number(), z.string()]).optional(),
  odometer: z.union([z.number(), z.string()]).optional(),
  insurance_expiry: z.string().nullish(),
  fc_expiry: z.string().nullish(),
  driver_id: z.string().nullish(),
}).passthrough()

router.post('/vehicles', async (req, res) => {
  const parsed = vehicleCreateSchema.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
  const { plate, make, model, color = 'Yellow', type = 'yellowSky', class_key = 'yellowSky',
    year = 2024, is_ev = 1, soc = 80, odometer = 0, insurance_expiry, fc_expiry, driver_id } = req.body
  if (!plate || !make || !model) return res.status(400).json({ error: 'plate, make, model required' })
  try {
    const id = 'v' + randomUUID().slice(0, 8)
    const vehicle = await prisma.vehicle.create({
      data: {
        id,
        plate: plate.toUpperCase(),
        make,
        model,
        color,
        type,
        classKey: class_key,
        year,
        isEv: is_ev,
        soc,
        odometer,
        insuranceExpiry: insurance_expiry ?? null,
        fcExpiry: fc_expiry ?? null,
        driverId: driver_id ?? null,
      },
      include: { driver: { select: { name: true } } },
    })

    if (driver_id) {
      await prisma.driver.update({
        where: { id: driver_id },
        data: { plate: plate.toUpperCase(), vehicle: `${make} ${model}` },
      }).catch(() => {})
    }

    res.json({ vehicle: mapVehicle(vehicle) })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

const vehiclePatchSchema = z.object({
  status: z.string().optional(),
  driver_id: z.string().nullish(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  plate: z.string().optional(),
  soc: z.union([z.number(), z.string()]).optional(),
  odometer: z.union([z.number(), z.string()]).optional(),
  insurance_expiry: z.string().nullish(),
  fc_expiry: z.string().nullish(),
  maintenance_note: z.string().nullish(),
  class_key: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional(),
  is_ev: z.union([z.number(), z.boolean(), z.string()]).optional(),
}).passthrough()

router.patch('/vehicles/:id', async (req, res) => {
  try {
    const parsed = vehiclePatchSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message })
    const row = await prisma.vehicle.findUnique({ where: { id: String(req.params.id) } })
    if (!row) return res.status(404).json({ error: 'Vehicle not found' })

    const fieldMap: Record<string, string> = {
      status: 'status', driver_id: 'driverId', make: 'make', model: 'model',
      color: 'color', plate: 'plate', soc: 'soc', odometer: 'odometer',
      insurance_expiry: 'insuranceExpiry', fc_expiry: 'fcExpiry', maintenance_note: 'maintenanceNote',
      class_key: 'classKey', year: 'year', is_ev: 'isEv',
    }
    const data: any = {}
    for (const [rawKey, prismaKey] of Object.entries(fieldMap)) {
      if (req.body[rawKey] !== undefined) data[prismaKey] = req.body[rawKey]
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const updated = await prisma.vehicle.update({
      where: { id: String(req.params.id) },
      data,
      include: { driver: { select: { name: true, status: true, phone: true } } },
    })

    // Sync driver records when driver assignment changes
    if (req.body.driver_id !== undefined) {
      const newDriverId = req.body.driver_id
      if (row.driverId && row.driverId !== newDriverId) {
        await prisma.driver.update({ where: { id: row.driverId }, data: { plate: null, vehicle: null } }).catch(() => {})
      }
      if (newDriverId) {
        await prisma.driver.update({ where: { id: newDriverId }, data: { plate: updated.plate, vehicle: `${updated.make} ${updated.model}` } }).catch(() => {})
      }
    }

    res.json({ vehicle: mapVehicle(updated) })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/vehicles/sync-trips', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({ select: { id: true, plate: true } })
    for (const v of vehicles) {
      const count = await prisma.booking.count({
        where: { assignedVehicleJson: { contains: v.plate }, status: 'completed' },
      })
      await prisma.vehicle.update({ where: { id: v.id }, data: { trips: count } })
    }
    res.json({ synced: vehicles.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/vehicles/:id/assign-all-trips', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: String(req.params.id) } })
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' })

    const vehicleJson = JSON.stringify({
      make: vehicle.make, model: vehicle.model,
      licensePlate: vehicle.plate, color: vehicle.color,
    })

    // Only update completed bookings that have no vehicle assigned yet
    const { count } = await prisma.booking.updateMany({
      where: {
        status: 'completed',
        OR: [{ assignedVehicleJson: null }, { assignedVehicleJson: '' }],
      },
      data: { assignedVehicleJson: vehicleJson },
    })

    // Re-sync trip count for this vehicle
    const tripCount = await prisma.booking.count({
      where: { assignedVehicleJson: { contains: vehicle.plate }, status: 'completed' },
    })
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { trips: tripCount } })

    res.json({ assigned: count, trips: tripCount })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
