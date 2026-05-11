import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

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
  const fareBeforeTax = kmFare + tripCharge           // trip charge folded in, not shown separately
  const gst = Math.round(fareBeforeTax * gstRate)     // GST on service only, not toll
  const total = fareBeforeTax + gst + toll

  return {
    fareBeforeTax,
    gst,
    toll,
    totalPrice: total,
    // legacy compat fields
    basePrice: fareBeforeTax,
    extraKmCharge: 0,
    optionalMeetGreet: meetGreet,
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
    // stops = array of intermediate place IDs between origin and airport
    const { originPlaceId, tripType = 'airport', stops = [] } = req.body
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

    const pricing = calcAirportPrice(distanceKm, cfg)
    return res.json({
      distanceKm, durationMinutes, tripType: 'airport',
      ...pricing,
      vehicleOptions: { yellowSky: pricing },
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Pricing calculation failed' })
  }
})

export default router
