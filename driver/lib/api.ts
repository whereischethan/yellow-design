import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3001'
const TOKEN_KEY = 'yellow_driver_token'

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function setToken(token: string) {
  return AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function clearToken() {
  return AsyncStorage.removeItem(TOKEN_KEY)
}

async function driverFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}/driver${path}`, { ...opts, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function sendDriverOtp(phone: string, countryCode = '+91') {
  return driverFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, countryCode }),
  })
}

export async function verifyDriverOtp(phone: string, otp: string, countryCode = '+91') {
  return driverFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, countryCode }),
  })
}

// ── Driver ────────────────────────────────────────────────────────────────────

export async function getDriverMe() {
  return driverFetch('/me')
}

export async function getDriverBookings(date?: string) {
  const qs = date ? `?date=${date}` : ''
  return driverFetch(`/bookings${qs}`)
}

export async function getDriverBooking(id: string) {
  return driverFetch(`/bookings/${id}`)
}

export async function updateBookingStatus(id: string, status: string) {
  return driverFetch(`/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

// ── Readings ──────────────────────────────────────────────────────────────────

export async function saveReading(data: {
  bookingId?: string
  type: 'handoff' | 'trip_start' | 'trip_end' | 'close_duty'
  odometer?: number
  soc?: number
}) {
  return driverFetch('/readings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getTodayReadings() {
  return driverFetch('/readings/today')
}

// ── Payment ───────────────────────────────────────────────────────────────────

export async function createPaymentQr(bookingId: string) {
  return driverFetch(`/bookings/${bookingId}/create-qr`, { method: 'POST' })
}

export async function getPaymentStatus(bookingId: string) {
  return driverFetch(`/bookings/${bookingId}/payment-status`)
}

export async function markPaid(bookingId: string, method: 'cash' | 'upi' = 'cash') {
  return driverFetch(`/bookings/${bookingId}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  })
}
