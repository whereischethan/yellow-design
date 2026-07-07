export const BLR_AIRPORT_PLACE_ID = 'ChIJZWJEdf4crjsRjkEpoelwbCk'

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || ''

export async function getDistanceKm(originPlaceId: string, destPlaceId: string): Promise<{ distanceKm: number; durationMinutes: number }> {
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
export async function getTotalDistance(
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

export function calcAirportPrice(distanceKm: number, cfg: Record<string, number>) {
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

export function calcOutstationPrice(
  oneWayDistanceKm: number,
  cfg: Record<string, number>,
  opts: { tripKind?: 'oneway' | 'round'; nights?: number } = {}
) {
  const perKm      = cfg.outstation_per_km      ?? 18
  const driverBata = cfg.outstation_driver_bata ?? 500
  const nightHalt  = cfg.outstation_night_halt  ?? 1000
  const gstRate    = (cfg.outstation_gst        ?? 5) / 100

  const isRound = opts.tripKind === 'round'
  const distanceKm = isRound ? oneWayDistanceKm * 2 : oneWayDistanceKm
  const nights = opts.nights ?? (isRound ? 1 : 0)
  const days = nights + 1

  const distanceFare = distanceKm * perKm
  const bata = driverBata * days
  const haltCharge = nightHalt * nights
  const fareBeforeTax = distanceFare + bata + haltCharge
  const gst = Math.round(fareBeforeTax * gstRate)
  const total = Math.round(fareBeforeTax + gst)

  return {
    fareBeforeTax: Math.round(fareBeforeTax),
    gst,
    toll: 0,
    totalPrice: total,
    basePrice: Math.round(fareBeforeTax),
    breakdown: {
      distanceFare: `${distanceKm} km @ ₹${perKm}/km = ₹${Math.round(distanceFare)}`,
      driverBata: `₹${bata} (${days} day${days > 1 ? 's' : ''})`,
      ...(nights > 0 ? { nightHalt: `₹${haltCharge} (${nights} night${nights > 1 ? 's' : ''})` } : {}),
      gstIncluded: `${cfg.outstation_gst ?? 5}%`,
    },
  }
}

export function calcHourlyPrice(durationHours: number, cfg: Record<string, number>) {
  const hourlyRate = cfg.hourly_base_rate ?? 500
  const gstRate     = (cfg.hourly_gst      ?? 5) / 100

  const fareBeforeTax = Math.round(durationHours * hourlyRate)
  const gst = Math.round(fareBeforeTax * gstRate)
  const total = fareBeforeTax + gst

  return {
    fareBeforeTax,
    gst,
    toll: 0,
    totalPrice: total,
    basePrice: fareBeforeTax,
    breakdown: {
      durationFare: `${durationHours} hr × ₹${hourlyRate}/hr = ₹${fareBeforeTax}`,
      gstIncluded: `${cfg.hourly_gst ?? 5}%`,
    },
  }
}
