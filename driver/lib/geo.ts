/**
 * Haversine distance between two lat/lng points, returns kilometres.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

/**
 * Returns true if pos is within `km` kilometres of target.
 */
export function isWithinKm(
  pos: { lat: number; lng: number },
  target: { lat: number; lng: number },
  km: number
): boolean {
  return haversineKm(pos.lat, pos.lng, target.lat, target.lng) <= km
}
