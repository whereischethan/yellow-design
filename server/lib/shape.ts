// Driver rows carry base64 documents (licence, Aadhaar, PAN, police, photo).
// Bookings must never embed or return those — only this whitelist.
export function slimAssignedDriver(d: any) {
  if (!d) return d
  const { id, name, phone, rating, licenseNo, plate, vehicle } = d
  return { id, name, phone, rating, licenseNo, plate, vehicle }
}
