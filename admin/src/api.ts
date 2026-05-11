const TOKEN_KEY = 'yellow_admin_token'
const USER_KEY  = 'yellow_admin_user'

export interface AdminProfile { phone: string; name: string | null; role: string }

export function getStoredAdminToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setStoredAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredAdminUser(): AdminProfile | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
}

export function setStoredAdminUser(user: AdminProfile) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

// Legacy key helpers kept for backward compat
export function getStoredAdminKey(): string { return getStoredAdminToken() }
export function setStoredAdminKey(key: string) { setStoredAdminToken(key) }
export function clearAdminKey() { clearAdminToken() }

async function adminFetch(path: string, init?: RequestInit) {
  const token = getStoredAdminToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/admin${path}`, { ...init, headers })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ─── Admin OTP login ──────────────────────────────────────────────────────────

export const sendAdminOtp = (phone: string, countryCode = '+91') =>
  fetch('/admin/login/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, countryCode }),
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json()).error || 'Failed to send OTP')
    return r.json() as Promise<{ message: string }>
  })

export const verifyAdminOtp = (phone: string, otp: string, countryCode = '+91') =>
  fetch('/admin/login/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp, countryCode }),
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json()).error || 'Invalid OTP')
    return r.json() as Promise<{ token: string; admin: AdminProfile }>
  })

// Legacy key verify (kept so existing sessions survive)
export const verifyAdminKey = (key: string) =>
  fetch('/admin/me', { headers: { 'x-admin-key': key } }).then(r => r.ok)

export const getBookings   = ()             => adminFetch('/bookings')
export const getBooking    = (id: string)   => adminFetch(`/bookings/${id}`)
export const patchBooking  = (id: string, body: object) =>
  adminFetch(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const createBooking = (body: object) =>
  adminFetch('/bookings', { method: 'POST', body: JSON.stringify(body) })

export const getDrivers   = ()             => adminFetch('/drivers')
export const createDriver = (body: object) => adminFetch('/drivers', { method: 'POST', body: JSON.stringify(body) })
export const patchDriver  = (id: string, body: object) =>
  adminFetch(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const getVehicles   = ()             => adminFetch('/vehicles')
export const createVehicle = (body: object) => adminFetch('/vehicles', { method: 'POST', body: JSON.stringify(body) })
export const patchVehicle  = (id: string, body: object) =>
  adminFetch(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const getCustomers = () => adminFetch('/customers')
export const patchCustomer = (id: string, body: object) =>
  adminFetch(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const getCustomerBookings = (id: string) => adminFetch(`/customers/${id}/bookings`)

export const getLeads   = ()             => adminFetch('/leads')
export const createLead = (body: object) => adminFetch('/leads', { method: 'POST', body: JSON.stringify(body) })
export const patchLead  = (id: string, body: object) =>
  adminFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const getPricing  = ()               => adminFetch('/pricing')
export const savePricing = (config: object) =>
  adminFetch('/pricing', { method: 'PUT', body: JSON.stringify({ config }) })
export const calcPricing = (body: { originPlaceId?: string; tripType?: string; distanceKm?: number; stopPlaceIds?: string[] }) =>
  adminFetch('/pricing/calculate', { method: 'POST', body: JSON.stringify(body) })

export const generatePaymentLink = (id: string) =>
  adminFetch(`/bookings/${id}/payment-link`, { method: 'POST' })

export const getStats = () => adminFetch('/stats')

export const lookupFlight = (flightNumber: string, date?: string) =>
  adminFetch(`/flights/lookup?flight_number=${encodeURIComponent(flightNumber)}${date ? `&date=${date}` : ''}`)

export const getTeam        = ()                  => adminFetch('/team')
export const addTeamMember  = (body: object)      => adminFetch('/team', { method: 'POST', body: JSON.stringify(body) })
export const removeTeamMember = (id: string)      => adminFetch(`/team/${id}`, { method: 'DELETE' })
export const updateMyProfile  = (body: { name: string }) =>
  adminFetch('/team/me', { method: 'PATCH', body: JSON.stringify(body) })
