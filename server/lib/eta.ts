// Driver → target ETA with a 60s per-booking cache to bound Google API spend.
// Falls back to haversine at an assumed city speed when no key / API failure.

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || ''

const CACHE_TTL_MS = 60_000
const CACHE_EVICT_MS = 10 * 60_000
const FALLBACK_SPEED_KMH = 25

interface LatLng { lat: number; lng: number }
interface EtaResult { etaMinutes: number; distanceKm: number }

const etaCache = new Map<string, { at: number; result: EtaResult }>()

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function fallbackEta(origin: LatLng, dest: LatLng): EtaResult {
  const distanceKm = Math.round(haversineKm(origin, dest) * 10) / 10
  return { distanceKm, etaMinutes: Math.max(1, Math.round((distanceKm / FALLBACK_SPEED_KMH) * 60)) }
}

async function googleEta(origin: LatLng, dest: LatLng): Promise<EtaResult | null> {
  // Routes API first (same pattern as routes/pricing.ts), Distance Matrix fallback
  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    })
    const data = await res.json() as any
    const route = data?.routes?.[0]
    if (route?.distanceMeters) {
      return {
        distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
        etaMinutes: Math.max(1, Math.round(parseInt(String(route.duration)) / 60)),
      }
    }
  } catch {}

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${dest.lat},${dest.lng}&key=${GOOGLE_MAPS_KEY}&mode=driving`
    const res = await fetch(url)
    const data = await res.json() as any
    const element = data?.rows?.[0]?.elements?.[0]
    if (element?.status === 'OK') {
      return {
        distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
        etaMinutes: Math.max(1, Math.round(element.duration.value / 60)),
      }
    }
  } catch {}

  return null
}

export async function getEta(cacheKey: string, origin: LatLng, dest: LatLng): Promise<EtaResult> {
  const cached = etaCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result

  let result: EtaResult | null = null
  if (GOOGLE_MAPS_KEY) result = await googleEta(origin, dest)
  if (!result) result = fallbackEta(origin, dest)

  // Opportunistic eviction of stale entries to bound memory
  for (const [key, entry] of etaCache) {
    if (Date.now() - entry.at > CACHE_EVICT_MS) etaCache.delete(key)
  }
  etaCache.set(cacheKey, { at: Date.now(), result })
  return result
}
