// Driver rows carry base64 documents (licence, Aadhaar, PAN, police, photo).
// Bookings must never embed or return those — only this whitelist.
export function slimAssignedDriver(d: any) {
  if (!d) return d
  const { id, name, phone, rating, licenseNo, plate, vehicle } = d
  return { id, name, phone, rating, licenseNo, plate, vehicle }
}

// Legacy rows stored "BLR Airport TT2" (terminal was already "T2"); normalise on read.
export function fixAirportStop(stop: any) {
  if (!stop) return stop
  const fix = (s: any) => (typeof s === 'string' ? s.replace(/Airport TT(\d)/, 'Airport T$1') : s)
  return { ...stop, placeName: fix(stop.placeName), location: fix(stop.location) }
}
