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

  // Retry GETs once — covers Cloud Run cold starts dropping the first request
  const isGet = !init?.method || init.method === 'GET'
  let res: globalThis.Response
  try {
    res = await fetch(`/admin${path}`, { ...init, headers })
  } catch (e) {
    if (!isGet) throw e
    await new Promise(r => setTimeout(r, 1500))
    res = await fetch(`/admin${path}`, { ...init, headers })
  }
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) {
    const body = await res.text()
    try { throw new Error(JSON.parse(body).error || body) } catch (e: any) { throw e.message === body ? new Error(body) : e }
  }
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
export const deleteBooking = (id: string)   =>
  adminFetch(`/bookings/${id}`, { method: 'DELETE' })
export const createBooking = (body: object) =>
  adminFetch('/bookings', { method: 'POST', body: JSON.stringify(body) })

export const getDrivers   = ()             => adminFetch('/drivers')
export const createDriver = (body: object) => adminFetch('/drivers', { method: 'POST', body: JSON.stringify(body) })
export const patchDriver  = (id: string, body: object) =>
  adminFetch(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const getDriverBookings = (id: string) => adminFetch(`/drivers/${id}/bookings`)

export const getVehicles   = ()             => adminFetch('/vehicles')
export const createVehicle = (body: object) => adminFetch('/vehicles', { method: 'POST', body: JSON.stringify(body) })
export const patchVehicle  = (id: string, body: object) =>
  adminFetch(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const syncVehicleTrips = ()          => adminFetch('/vehicles/sync-trips', { method: 'POST' })
export const assignAllTripsToVehicle = (id: string) => adminFetch(`/vehicles/${id}/assign-all-trips`, { method: 'POST' })

export const getCustomers = () => adminFetch('/customers')
export const patchCustomer = (id: string, body: object) =>
  adminFetch(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const getCustomerBookings = (id: string) => adminFetch(`/customers/${id}/bookings`)
export const generateReferralCodes = () =>
  adminFetch('/customers/generate-referral-codes', { method: 'POST' })

export const getLeads   = ()             => adminFetch('/leads')
export const createLead = (body: object) => adminFetch('/leads', { method: 'POST', body: JSON.stringify(body) })
export const patchLead  = (id: string, body: object) =>
  adminFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const getPricing  = ()               => adminFetch('/pricing')
export const savePricing = (config: object) =>
  adminFetch('/pricing', { method: 'PUT', body: JSON.stringify({ config }) })
export const calcPricing = (body: { originPlaceId?: string; destPlaceId?: string; tripType?: string; distanceKm?: number; stopPlaceIds?: string[]; durationHours?: number }) =>
  adminFetch('/pricing/calculate', { method: 'POST', body: JSON.stringify(body) })

export const generatePaymentLink = (id: string, type: 'upi' | 'standard' = 'upi') =>
  adminFetch(`/bookings/${id}/payment-link`, { method: 'POST', body: JSON.stringify({ type }), headers: { 'Content-Type': 'application/json' } })

export const syncPaymentStatus = (id: string) =>
  adminFetch(`/bookings/${id}/sync-payment`, { method: 'POST' })

export const getStats = () => adminFetch('/stats')

export const getAvailabilityBlocks        = ()                          => adminFetch('/availability/blocks')
export const createAvailabilityBlock      = (body: object)              => adminFetch('/availability/blocks', { method: 'POST', body: JSON.stringify(body) })
export const deleteAvailabilityBlock      = (id: number)                => adminFetch(`/availability/blocks/${id}`, { method: 'DELETE' })
export const getAvailabilityNotifications = (skip = 0, take = 100)      => adminFetch(`/availability/notifications?skip=${skip}&take=${take}`)
export const markNotificationNotified     = (id: number)                => adminFetch(`/availability/notifications/${id}/notify`, { method: 'PATCH' })

export const getFinanceSummary = (from?: string, to?: string) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to)   params.set('to',   to)
  const qs = params.toString()
  return adminFetch(`/finance/summary${qs ? `?${qs}` : ''}`)
}

export function downloadCSV(rows: object[], filename: string) {
  if (!rows.length) return
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""')
    return /[",\n\r]/.test(s) ? `"${s}"` : s
  }
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export const lookupFlight = (flightNumber: string, date?: string) =>
  adminFetch(`/flights/lookup?flight_number=${encodeURIComponent(flightNumber)}${date ? `&date=${date}` : ''}`)

export const getInvoices = (offset = 0, search = '') =>
  adminFetch(`/invoices?offset=${offset}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`)

export function openInvoice(tripCode: string): void {
  const token = getStoredAdminToken()
  const url = `/invoices/${encodeURIComponent(tripCode)}${token ? `?token=${encodeURIComponent(token)}` : ''}`
  const win = window.open(url, '_blank')
  if (!win) alert('Pop-up blocked — please allow pop-ups for this site and try again.')
}

export async function emailInvoice(tripCode: string, to: string[]): Promise<void> {
  const token = getStoredAdminToken()
  const res = await fetch(`/invoices/${encodeURIComponent(tripCode)}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ to }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to send email')
  }
}

export type CustomInvoiceBody = {
  amount: number
  driverName?: string; vehiclePlate?: string; customerName?: string
  pickupLocation?: string; dropLocation?: string; pickupDateTime?: string
  distanceKm?: number; toll?: number; discount?: number
  stops?: string[]; note?: string
}

export const createCustomInvoice = (
  tripCode: string,
  body: CustomInvoiceBody,
): Promise<{ id: string; invoiceNo: string }> => {
  const token = getStoredAdminToken()
  return fetch(`/invoices/${encodeURIComponent(tripCode)}/custom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).then(async r => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed')
    return r.json()
  })
}

export const updateCustomInvoice = (
  tripCode: string,
  id: string,
  body: Partial<CustomInvoiceBody>,
): Promise<{ id: string; invoiceNo: string }> => {
  const token = getStoredAdminToken()
  return fetch(`/invoices/${encodeURIComponent(tripCode)}/custom/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).then(async r => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed')
    return r.json()
  })
}

export const listCustomInvoices = (tripCode: string): Promise<any[]> => {
  const token = getStoredAdminToken()
  return fetch(`/invoices/${encodeURIComponent(tripCode)}/custom`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(r => r.json())
}

export function openCustomInvoice(tripCode: string, id: string): void {
  const token = getStoredAdminToken()
  const url = `/invoices/${encodeURIComponent(tripCode)}/custom/${encodeURIComponent(id)}${token ? `?token=${encodeURIComponent(token)}` : ''}`
  const win = window.open(url, '_blank')
  if (!win) alert('Pop-up blocked — please allow pop-ups for this site and try again.')
}

export const getSettings  = ()               => adminFetch('/settings')
export const saveSettings = (config: object) =>
  adminFetch('/settings', { method: 'PUT', body: JSON.stringify({ config }) })

export const lookupGstin = (gstin: string) =>
  adminFetch(`/gstin-lookup?gstin=${encodeURIComponent(gstin)}`)

export const getTeam        = ()                  => adminFetch('/team')
export const addTeamMember  = (body: object)      => adminFetch('/team', { method: 'POST', body: JSON.stringify(body) })
export const removeTeamMember = (id: string)      => adminFetch(`/team/${id}`, { method: 'DELETE' })
export const updateMyProfile  = (body: { name: string }) =>
  adminFetch('/team/me', { method: 'PATCH', body: JSON.stringify(body) })

export const getEmptyLegStatus = () => adminFetch('/empty-leg/status')
export const setEmptyLegToggle = (key: string, value: 0 | 1) =>
  adminFetch('/empty-leg/toggle', { method: 'PATCH', body: JSON.stringify({ key, value }) })
export const saveEmptyLegConfig = (config: Record<string, number>) =>
  adminFetch('/empty-leg/config', { method: 'PATCH', body: JSON.stringify(config) })

// ─── Impersonation (superadmin) ───────────────────────────────────────────────
export const impersonate = (type: 'user' | 'driver', id: string) =>
  adminFetch('/impersonate', { method: 'POST', body: JSON.stringify({ type, id }) })

export const CUSTOMER_APP_URL = (import.meta as any).env?.VITE_CUSTOMER_APP_URL || 'https://book.ridewithyellow.com'
export const DRIVER_APP_URL = (import.meta as any).env?.VITE_DRIVER_APP_URL || 'https://yellow-design-driver.web.app'
