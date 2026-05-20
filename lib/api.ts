import { Linking, Platform } from 'react-native'
import type { Booking, CreateBookingRequest, PricingResponse } from '../types/booking'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location?.hostname || ''
    if (host.endsWith('.web.app') || host.endsWith('.ridewithyellow.com')) {
      return ''
    }
  }
  return API_BASE || 'http://localhost:3001'
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'yellow_auth_token'
const REFRESH_KEY = 'yellow_refresh_token'
const USER_KEY = 'yellow_auth_user'

let authToken: string | null = null
let refreshTokenValue: string | null = null
let isRefreshing: Promise<boolean> | null = null

async function saveToStorage(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value)
  } else {
    try {
      const SecureStore = require('expo-secure-store')
      await SecureStore.setItemAsync(key, value)
    } catch {
      console.warn('SecureStore not available')
    }
  }
}

async function getFromStorage(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key)
  }
  try {
    const SecureStore = require('expo-secure-store')
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

async function removeFromStorage(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key)
  } else {
    try {
      const SecureStore = require('expo-secure-store')
      await SecureStore.deleteItemAsync(key)
    } catch {}
  }
}

// ─── Auth token helpers ───────────────────────────────────────────────────────

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    saveToStorage(TOKEN_KEY, token)
  } else {
    removeFromStorage(TOKEN_KEY)
    removeFromStorage(REFRESH_KEY)
    removeFromStorage(USER_KEY)
    refreshTokenValue = null
  }
}

export function setRefreshToken(token: string | null) {
  refreshTokenValue = token
  if (token) saveToStorage(REFRESH_KEY, token)
  else removeFromStorage(REFRESH_KEY)
}

export function getAuthToken(): string | null {
  return authToken
}

export async function restoreAuthToken(): Promise<string | null> {
  const token = await getFromStorage(TOKEN_KEY)
  if (token) authToken = token
  const rt = await getFromStorage(REFRESH_KEY)
  if (rt) refreshTokenValue = rt
  return token
}

export async function saveUserToStorage(user: { phone: string; email?: string; name?: string; role?: string }): Promise<void> {
  await saveToStorage(USER_KEY, JSON.stringify(user))
}

export async function restoreUserFromStorage(): Promise<{ phone: string; email?: string; name?: string; role?: string } | null> {
  const json = await getFromStorage(USER_KEY)
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ─── Resilient fetch ──────────────────────────────────────────────────────────

async function resilientFetch(
  url: string,
  options: RequestInit = {},
  { retries = 2, timeoutMs = 15000 } = {}
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timer)
      return res
    } catch (err: any) {
      clearTimeout(timer)
      lastError = err
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000))
      }
    }
  }

  throw new Error('Network error. Please check your internet connection and try again.')
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshTokenValue) return false
  try {
    const res = await resilientFetch(
      `${getApiBase()}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      },
      { retries: 1, timeoutMs: 10000 }
    )
    if (!res.ok) {
      setAuthToken(null)
      return false
    }
    const data = await res.json()
    setAuthToken(data.token)
    if (data.refreshToken) setRefreshToken(data.refreshToken)
    return true
  } catch {
    return false
  }
}

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!authToken) throw new Error('Not authenticated')

  const headers = { ...options.headers, Authorization: `Bearer ${authToken}` }
  const res = await resilientFetch(url, { ...options, headers })

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = refreshAccessToken().finally(() => { isRefreshing = null })
    }
    const refreshed = await isRefreshing

    if (refreshed) {
      const retryHeaders = { ...options.headers, Authorization: `Bearer ${authToken}` }
      return resilientFetch(url, { ...options, headers: retryHeaders }, { retries: 0 })
    }

    throw new Error('Session expired. Please log in again.')
  }

  return res
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export async function sendOtp(
  phone: string,
  countryCode = '+91'
): Promise<{ message: string; otp?: string }> {
  const res = await resilientFetch(`${getApiBase()}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, countryCode }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to send OTP' }))
    throw new Error(err.error || 'Failed to send OTP')
  }
  return res.json()
}

export async function resendOtp(
  phone: string,
  countryCode = '+91',
  retryType: 'text' | 'voice' = 'text'
): Promise<{ message: string }> {
  const res = await resilientFetch(`${getApiBase()}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, countryCode, retryType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to resend OTP' }))
    throw new Error(err.error || 'Failed to resend OTP')
  }
  return res.json()
}

export async function verifyOtp(
  phone: string,
  otp: string,
  countryCode = '+91'
): Promise<{ token: string; user: { id: string; phone: string; name?: string; role?: string } }> {
  const res = await resilientFetch(`${getApiBase()}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp, countryCode }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid OTP' }))
    throw new Error(err.error || 'Invalid OTP')
  }
  const data = await res.json()
  setAuthToken(data.token)
  if (data.refreshToken) setRefreshToken(data.refreshToken)
  if (data.user) await saveUserToStorage(data.user)
  return data
}

// ─── Flight API ───────────────────────────────────────────────────────────────

export async function fetchFlight(flightNumber: string, date: Date = new Date()) {
  const yyyyMmDd = date.toISOString().split('T')[0]
  const res = await resilientFetch(
    `${getApiBase()}/flights/lookup?flight_number=${encodeURIComponent(flightNumber)}&date=${yyyyMmDd}`
  )
  if (!res.ok) {
    let message = 'Flight lookup failed'
    try {
      const body = await res.json()
      message = body.error || message
    } catch {}
    if (res.status === 404 || message.includes('not found')) throw new Error('Flight not found')
    throw new Error(message)
  }
  return res.json()
}

// ─── Pricing API ──────────────────────────────────────────────────────────────

export interface PricingRequest {
  originPlaceId: string;
  tripType: 'pickup' | 'drop' | 'outstation';
  stops?: string[];
  pickupDateTime?: string;
  originLat?: number;
  originLng?: number;
}

export async function fetchPricing(request: PricingRequest): Promise<PricingResponse> {
  const res = await resilientFetch(`${getApiBase()}/pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originPlaceId: request.originPlaceId,
      tripType: request.tripType,
      stops: request.stops || [],
      ...(request.pickupDateTime != null ? { pickupDateTime: request.pickupDateTime } : {}),
      ...(request.originLat != null ? { originLat: request.originLat } : {}),
      ...(request.originLng != null ? { originLng: request.originLng } : {}),
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Pricing calculation failed')
  }
  return res.json() as Promise<PricingResponse>
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function checkAvailability(
  pickupDateTime: string
): Promise<{ available: boolean; busyCount: number; totalVehicles: number; checkFailed?: boolean }> {
  try {
    const res = await authenticatedFetch(
      `${getApiBase()}/bookings/availability?pickupDateTime=${encodeURIComponent(pickupDateTime)}`
    )
    if (!res.ok) return { available: true, busyCount: 0, totalVehicles: 0, checkFailed: true }
    const data = await res.json()
    return { available: data.available, busyCount: data.busyCount, totalVehicles: data.totalVehicles }
  } catch {
    return { available: true, busyCount: 0, totalVehicles: 0, checkFailed: true }
  }
}

// ─── Bookings API ─────────────────────────────────────────────────────────────

export async function createBooking(booking: CreateBookingRequest): Promise<Booking> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create booking' }))
    throw new Error(err.error || 'Failed to create booking')
  }
  const data = await res.json()
  return data.booking
}

export async function getBooking(bookingId: string): Promise<Booking> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings/${bookingId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch booking' }))
    throw new Error(err.error || 'Failed to fetch booking')
  }
  const data = await res.json()
  return data.booking
}

export async function getBookings(): Promise<Booking[]> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch bookings' }))
    throw new Error(err.error || 'Failed to fetch bookings')
  }
  const data = await res.json()
  return data.bookings || []
}

// ─── Payment API ─────────────────────────────────────────────────────────────

export interface PaymentOrderResponse {
  orderId: string
  amount: number   // in paise
  currency: string
  keyId: string
}

export async function createPaymentOrder(amount: number): Promise<PaymentOrderResponse> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings/payment/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create payment order' }))
    throw new Error(err.error || 'Failed to create payment order')
  }
  return res.json()
}

export async function verifyPaymentAndCreateBooking(payload: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  bookingData: CreateBookingRequest
}): Promise<Booking> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings/payment/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Payment verification failed' }))
    throw new Error(err.error || 'Payment verification failed')
  }
  const data = await res.json()
  return data.booking
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<{ id: string; phone: string; name?: string; email?: string; referralCode?: string; referralCredits?: number; referredById?: string | null }> {
  const res = await authenticatedFetch(`${getApiBase()}/user/profile`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch profile' }))
    throw new Error(err.error || 'Failed to fetch profile')
  }
  const data = await res.json()
  return data.user
}

export async function updateProfile(updates: { name?: string; email?: string; appliedReferralCode?: string }): Promise<{ id: string; phone: string; name?: string; email?: string; referralCode?: string; referralCredits?: number; referredById?: string | null }> {
  const res = await authenticatedFetch(`${getApiBase()}/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update profile' }))
    throw new Error(err.error || 'Failed to update profile')
  }
  const data = await res.json()
  return data.user
}

// ─── Support ──────────────────────────────────────────────────────────────────

const SUPPORT_WHATSAPP_FALLBACK = '918628062808'

export async function getSupportContact(): Promise<{ whatsappNumber: string }> {
  try {
    const res = await authenticatedFetch(`${getApiBase()}/user/support-contact`)
    if (!res.ok) return { whatsappNumber: SUPPORT_WHATSAPP_FALLBACK }
    const data = await res.json()
    return { whatsappNumber: data?.support?.whatsappNumber || SUPPORT_WHATSAPP_FALLBACK }
  } catch {
    return { whatsappNumber: SUPPORT_WHATSAPP_FALLBACK }
  }
}

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  return `https://wa.me/${phoneNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`
}

export async function openWhatsAppUrl(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank')
    return
  }
  await Linking.openURL(url)
}

export async function logLead(data: {
  tripType?: string
  pickup?: object
  drop?: object
  stops?: object[]
  price?: number
  pickupTime?: string
  flight?: string
  pricing?: object
}): Promise<string | null> {
  try {
    // Ensure token is available — it may not be in memory yet on fresh page load
    // (AuthProvider restores it asynchronously; child effects fire before parent effects)
    if (!authToken) await restoreAuthToken()
    if (!authToken) return null // not logged in — skip silently

    const res = await authenticatedFetch(`${getApiBase()}/bookings/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.id as string) ?? null
  } catch {
    // Non-critical — don't surface lead logging failures to the user
    return null
  }
}

export async function updateBookingStatus(bookingId: string, status: string): Promise<void> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update booking' }))
    throw new Error(err.error || 'Failed to update booking')
  }
}

// ─── Saved places ─────────────────────────────────────────────────────────────

export interface SavedPlace {
  id: string
  label: string
  address: string
  placeId: string | null
  lat: number | null
  lng: number | null
}

export async function getSavedPlaces(): Promise<SavedPlace[]> {
  const res = await authenticatedFetch(`${getApiBase()}/user/places`)
  if (!res.ok) return []
  const data = await res.json()
  return data.places ?? []
}

export async function createSavedPlace(body: { label: string; address: string; placeId?: string; lat?: number; lng?: number }): Promise<SavedPlace> {
  const res = await authenticatedFetch(`${getApiBase()}/user/places`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save place' }))
    throw new Error(err.error || 'Failed to save place')
  }
  const data = await res.json()
  return data.place
}

export async function updateSavedPlace(id: string, body: Partial<{ label: string; address: string; placeId: string; lat: number; lng: number }>): Promise<SavedPlace> {
  const res = await authenticatedFetch(`${getApiBase()}/user/places/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update place' }))
    throw new Error(err.error || 'Failed to update place')
  }
  const data = await res.json()
  return data.place
}

export async function deleteSavedPlace(id: string): Promise<void> {
  await authenticatedFetch(`${getApiBase()}/user/places/${id}`, { method: 'DELETE' })
}

export interface ReferralData {
  earned: number
  invited: { name: string; date: string }[]
}

export async function fetchReferrals(): Promise<ReferralData> {
  const res = await authenticatedFetch(`${getApiBase()}/user/referrals`)
  if (!res.ok) throw new Error('Failed to fetch referrals')
  return res.json()
}

