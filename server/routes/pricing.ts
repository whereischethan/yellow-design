import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { checkHomeBase, checkEmptyLeg, recordSpecialRateView, type SpecialRate } from '../lib/emptyLeg'

const router = Router()

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || ''

async function getPricingConfig(): Promise<Record<string, number>> {
  const rows = await prisma.pricingConfig.findMany()
  return rows.reduce((cfg, r) => ({ ...cfg, [r.key]: parseFloat(r.value) }), {} as Record<string, number>)
}

async function getDistanceKm(originPlaceId: string, destPlaceId: string): Promise<{ distanceKm: number; durationMinutes: number }> {
  if (!GOOGLE_MAPS_KEY) {
    return { distanceKm: 28, durationMinutes: 45 }
  }

  // Try Routes API first (supports avoidTolls:false to force highway route)
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { placeId: originPlaceId },
        destination: { placeId: destPlaceId },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: true },
      }),
    })
    const data = await res.json() as any
    const route = data?.routes?.[0]
    if (route?.distanceMeters) {
      return {
        distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
        // duration comes back as e.g. "1234s"
        durationMinutes: Math.round(parseInt(String(route.duration)) / 60),
      }
    }
    console.warn('[pricing] Routes API failed, falling back to Distance Matrix:', JSON.stringify(data?.error ?? data))
  } catch (e) {
    console.warn('[pricing] Routes API error, falling back to Distance Matrix:', e)
  }

  // Fallback: Distance Matrix API
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=place_id:${encodeURIComponent(originPlaceId)}&destinations=place_id:${encodeURIComponent(destPlaceId)}&key=${GOOGLE_MAPS_KEY}&mode=driving`
  const res = await fetch(url)
  const data = await res.json() as any
  const element = data?.rows?.[0]?.elements?.[0]
  if (!element || element.status !== 'OK') throw new Error('Could not calculate distance')
  return {
    distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
    durationMinutes: Math.round(element.duration.value / 60),
  }
}

// Sum leg distances when stops are present: origin → stop1 → stop2 → ... → destination
async function getTotalDistance(
  originPlaceId: string,
  destPlaceId: string,
  stopPlaceIds: string[] = []
): Promise<{ distanceKm: number; durationMinutes: number }> {
  const waypoints = [originPlaceId, ...stopPlaceIds, destPlaceId]
  if (waypoints.length === 2) return getDistanceKm(waypoints[0], waypoints[1])
  const legs = await Promise.all(
    waypoints.slice(0, -1).map((from, i) => getDistanceKm(from, waypoints[i + 1]))
  )
  return {
    distanceKm: Math.round(legs.reduce((s, l) => s + l.distanceKm, 0) * 10) / 10,
    durationMinutes: legs.reduce((s, l) => s + l.durationMinutes, 0),
  }
}

function calcAirportPrice(distanceKm: number, cfg: Record<string, number>) {
  const perKm      = cfg.airport_per_km       ?? 32
  const tripCharge = cfg.airport_trip_charge  ?? 100
  const toll       = cfg.airport_toll         ?? 185
  const gstRate    = (cfg.airport_gst         ?? 5) / 100
  const meetGreet  = cfg.airport_meet_greet   ?? 100

  const kmFare = Math.round(distanceKm * perKm)
  const fareBeforeTax = kmFare + tripCharge + toll    // toll baked in before GST
  const gst = Math.round(fareBeforeTax * gstRate)
  const total = fareBeforeTax + gst

  return {
    fareBeforeTax,
    gst,
    toll: 0,
    totalPrice: total,
    // legacy compat fields
    basePrice: fareBeforeTax,
    extraKmCharge: 0,
    optionalMeetGreet: meetGreet,
    breakdown: {
      distanceFare: `${distanceKm} km × ₹${perKm}/km = ₹${kmFare}`,
      tripCharge: `+₹${tripCharge} trip charge`,
      toll: `+₹${toll} toll`,
      fareExGst: `= ₹${fareBeforeTax} (ex-GST)`,
      gst: `+₹${gst} GST (${(gstRate * 100).toFixed(0)}%)`,
    },
  }
}

function calcOutstationPrice(distanceKm: number, cfg: Record<string, number>) {
  const perKm      = cfg.outstation_per_km     ?? 18
  const driverBata = cfg.outstation_driver_bata ?? 500
  const gstRate    = (cfg.outstation_gst        ?? 5) / 100

  const base = distanceKm * perKm
  const withBata = base + driverBata
  const total = Math.round(withBata * (1 + gstRate))

  return {
    basePrice: Math.round(base),
    totalPrice: total,
    breakdown: {
      distanceFare: `₹${Math.round(base)} @ ₹${perKm}/km`,
      driverBata: `₹${driverBata}`,
      gstIncluded: `${cfg.outstation_gst ?? 5}%`,
    },
  }
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { originPlaceId, tripType = 'airport', stops = [],
            pickupDateTime, originLat, originLng } = req.body
    if (!originPlaceId) return res.status(400).json({ error: 'originPlaceId required' })

    const BLR_AIRPORT_PLACE_ID = 'ChIJZWJEdf4crjsRjkEpoelwbCk'

    const [{ distanceKm, durationMinutes }, cfg] = await Promise.all([
      getTotalDistance(originPlaceId, BLR_AIRPORT_PLACE_ID, stops),
      getPricingConfig(),
    ])

    if (tripType === 'outstation') {
      const pricing = calcOutstationPrice(distanceKm, cfg)
      return res.json({
        distanceKm, durationMinutes, tripType: 'outstation',
        ...pricing,
        vehicleOptions: { yellowSky: pricing },
      })
    }

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
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
