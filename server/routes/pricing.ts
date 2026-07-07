import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { checkHomeBase, checkEmptyLeg, recordSpecialRateView, type SpecialRate } from '../lib/emptyLeg'
import { BLR_AIRPORT_PLACE_ID, getTotalDistance, calcAirportPrice, calcOutstationPrice, calcHourlyPrice } from '../lib/pricingCalc'

const router = Router()

async function getPricingConfig(): Promise<Record<string, number>> {
  const rows = await prisma.pricingConfig.findMany()
  return rows.reduce((cfg, r) => ({ ...cfg, [r.key]: parseFloat(r.value) }), {} as Record<string, number>)
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { originPlaceId, destPlaceId, tripType = 'airport', stops = [],
            pickupDateTime, originLat, originLng, tripKind, nights, durationHours } = req.body

    const cfg = await getPricingConfig()

    if (tripType === 'hourly') {
      if (durationHours == null) return res.status(400).json({ error: 'durationHours required' })
      const pricing = calcHourlyPrice(Number(durationHours), cfg)
      return res.json({
        distanceKm: 0, durationMinutes: Number(durationHours) * 60, tripType: 'hourly',
        ...pricing,
        vehicleOptions: { yellowSky: pricing },
      })
    }

    if (!originPlaceId) return res.status(400).json({ error: 'originPlaceId required' })

    if (tripType === 'outstation') {
      if (!destPlaceId) return res.status(400).json({ error: 'destPlaceId required' })
      const { distanceKm, durationMinutes } = await getTotalDistance(originPlaceId, destPlaceId, stops)
      const pricing = calcOutstationPrice(distanceKm, cfg, { tripKind, nights })
      return res.json({
        distanceKm, durationMinutes, tripType: 'outstation',
        ...pricing,
        vehicleOptions: { yellowSky: pricing },
      })
    }

    const { distanceKm, durationMinutes } = await getTotalDistance(originPlaceId, BLR_AIRPORT_PLACE_ID, stops)

    const gstRate = (cfg.airport_gst ?? 5) / 100
    let pricing = calcAirportPrice(distanceKm, cfg)

    let specialRate: SpecialRate | null = null

    if (originLat != null && originLng != null && (tripType === 'pickup' || tripType === 'drop')) {
      // 1. Manual override
      const manualOn =
        (tripType === 'drop'   && (cfg.empty_leg_drops_active   ?? 0) === 1) ||
        (tripType === 'pickup' && (cfg.empty_leg_pickups_active ?? 0) === 1)

      if (manualOn) {
        const discountPct = (cfg.empty_leg_discount_pct ?? 40) / 100
        const newFare = Math.round(pricing.fareBeforeTax * (1 - discountPct))
        const oldGst  = Math.round(pricing.fareBeforeTax * gstRate)
        const newGst  = Math.round(newFare * gstRate)
        specialRate = {
          type: 'manualOverride',
          savedAmount: (pricing.fareBeforeTax - newFare) + (oldGst - newGst),
          newFareBeforeTax: newFare,
          newTotal: newFare + newGst,
          message: 'Special rate · limited time',
        }
      }

      // 2. Auto empty leg detection
      if (!specialRate && pickupDateTime) {
        specialRate = await checkEmptyLeg({
          tripType: tripType as 'pickup' | 'drop',
          originLat: Number(originLat),
          originLng: Number(originLng),
          pickupDateTime,
          fareBeforeTax: pricing.fareBeforeTax,
          gstRate,
          toll: pricing.toll,
          cfg,
        })
      }

      // 3. Home base flat fare (always-on) — use if lower than current specialRate
      const homeBase = checkHomeBase(
        Number(originLat), Number(originLng), tripType,
        pricing.fareBeforeTax, gstRate, pricing.toll, cfg
      )
      if (homeBase && (!specialRate || homeBase.newTotal < specialRate.newTotal)) {
        specialRate = homeBase
      }
    }

    // Apply discount
    if (specialRate) {
      recordSpecialRateView()
      pricing = {
        ...pricing,
        fareBeforeTax: specialRate.newFareBeforeTax,
        gst: Math.round(specialRate.newFareBeforeTax * gstRate),
        totalPrice: specialRate.newTotal,
        basePrice: specialRate.newFareBeforeTax,
      }
    }

    return res.json({
      distanceKm, durationMinutes, tripType: 'airport',
      ...pricing,
      vehicleOptions: { yellowSky: pricing },
      ...(specialRate ? { emptyLeg: { type: specialRate.type, savedAmount: specialRate.savedAmount, message: specialRate.message } } : {}),
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Pricing calculation failed' })
  }
})

// Public endpoint: returns customer-facing config values (hourly rate, etc.)
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const cfg = await getPricingConfig()
    res.json({
      hourlyRate: cfg.hourly_base_rate ?? 500,
      hourlyGst: cfg.hourly_gst ?? 5,
      firstRideDiscountPct: cfg.first_ride_discount_pct ?? 10,
      firstRideDiscountThreshold: cfg.first_ride_discount_threshold ?? 1000,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
