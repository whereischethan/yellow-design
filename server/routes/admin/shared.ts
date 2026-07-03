import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { slimAssignedDriver, fixAirportStop } from '../../lib/shape'

export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET env var is required in production')
  return 'dev_secret_change_in_prod'
})()
// Legacy key fallback is dev-only: in production it works only when ADMIN_KEY is explicitly set.
export const ADMIN_KEY = process.env.ADMIN_KEY || (process.env.NODE_ENV === 'production' ? null : 'yellow-ops-dev')

export function signAdminToken(phone: string, adminRole = 'ops'): string {
  return jwt.sign({ adminPhone: phone, role: 'admin', adminRole }, JWT_SECRET, { expiresIn: '30d' })
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Accept legacy key header — treated as superadmin (dev fallback)
  if (ADMIN_KEY && req.headers['x-admin-key'] === ADMIN_KEY) {
    ;(req as any).adminRole = 'superadmin'
    return next()
  }

  // Accept admin JWT via Bearer token
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any
      if (payload?.role === 'admin') {
        ;(req as any).adminRole = payload.adminRole || 'ops'
        return next()
      }
    } catch {}
  }

  return res.status(401).json({ error: 'Unauthorized' })
}

/** Only superadmin may call this route. Must be used after requireAdmin (or router.use(requireAdmin)). */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).adminRole !== 'superadmin') {
    return res.status(403).json({ error: 'Super admin access required' })
  }
  next()
}

export function tryParse(json: string | null | undefined): any {
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}

export function buildBooking(row: any) {
  return {
    id: row.id,
    tripCode: row.tripCode,
    userId: row.userId,
    userName: row.user?.name ?? null,
    userPhone: row.user?.phone ?? null,
    status: row.status,
    tripType: row.tripType,
    vehicleType: row.vehicleType,
    passengers: row.passengerCount,
    pickup: fixAirportStop(tryParse(row.pickupJson)),
    drop: fixAirportStop(tryParse(row.dropJson)),
    stops: tryParse(row.stopsJson),
    flight: tryParse(row.flightJson),
    pricing: tryParse(row.pricingJson),
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    assignedDriver: slimAssignedDriver(tryParse(row.assignedDriverJson)),
    assignedVehicle: tryParse(row.assignedVehicleJson),
    paymentStatus: row.paymentStatus || 'pending',
    paymentMethod: row.paymentMethod ?? null,
    razorpayPaymentId: row.razorpayPaymentId ?? null,
    razorpayLinkId: row.razorpayLinkId ?? null,
    razorpayLinkUrl: row.razorpayLinkUrl ?? null,
    customerGstin: row.customerGstin ?? null,
    customerGstName: row.customerGstName ?? null,
    invoiceNo: row.invoice?.invoiceNo ?? null,
    sendSms: row.sendSms ?? true,
    driverCollect: row.driverCollect ?? false,
    driverReported: row.driverReported ?? false,
    createdAt: row.createdAt,
  }
}
