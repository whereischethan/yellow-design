import { Linking, Platform } from "react-native";
import type { PricingRequest, PricingResponse, VehicleKey } from "../types/pricing";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

function getApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location?.hostname || "";
    if (host.endsWith(".web.app") || host.endsWith(".ridewithyellow.com")) {
      return "";
    }
  }
  return API_BASE || "http://localhost:3001";
}

// ─── Resilient fetch ─────────────────────────────────────────
async function resilientFetch(
  url: string,
  options: RequestInit = {},
  { retries = 2, timeoutMs = 15000 } = {}
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  throw new Error("Network error. Please check your internet connection and try again.");
}

// ─── Storage ─────────────────────────────────────────────────
const TOKEN_KEY = "yellow_auth_token";
const REFRESH_KEY = "yellow_refresh_token";
const USER_KEY = "yellow_auth_user";
const SUPPORT_FALLBACK = "918628062808";

let authToken: string | null = null;
let refreshTokenValue: string | null = null;
let isRefreshing: Promise<boolean> | null = null;

async function saveToStorage(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    try {
      const SecureStore = require("expo-secure-store");
      await SecureStore.setItemAsync(key, value);
    } catch {}
  }
}

async function getFromStorage(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  try {
    const SecureStore = require("expo-secure-store");
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function removeFromStorage(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    try {
      const SecureStore = require("expo-secure-store");
      await SecureStore.deleteItemAsync(key);
    } catch {}
  }
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    saveToStorage(TOKEN_KEY, token);
  } else {
    removeFromStorage(TOKEN_KEY);
    removeFromStorage(REFRESH_KEY);
    removeFromStorage(USER_KEY);
    refreshTokenValue = null;
  }
}

export function setRefreshToken(token: string | null) {
  refreshTokenValue = token;
  if (token) saveToStorage(REFRESH_KEY, token);
  else removeFromStorage(REFRESH_KEY);
}

export function getAuthToken(): string | null { return authToken; }

export async function restoreAuthToken(): Promise<string | null> {
  const token = await getFromStorage(TOKEN_KEY);
  if (token) authToken = token;
  const rt = await getFromStorage(REFRESH_KEY);
  if (rt) refreshTokenValue = rt;
  return token;
}

export async function saveUserToStorage(user: { phone: string; name?: string; role?: string }) {
  await saveToStorage(USER_KEY, JSON.stringify(user));
}

export async function restoreUserFromStorage(): Promise<{ phone: string; name?: string; role?: string } | null> {
  const json = await getFromStorage(USER_KEY);
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

// ─── Auth API ────────────────────────────────────────────────
export async function sendOtp(phone: string, countryCode = "+91") {
  const res = await resilientFetch(`${getApiBase()}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, countryCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to send OTP" }));
    throw new Error(err.error || "Failed to send OTP");
  }
  return res.json() as Promise<{ message: string; otp?: string; isInternational?: boolean }>;
}

export async function resendOtp(phone: string, countryCode = "+91", retryType: "text" | "voice" = "text") {
  const res = await resilientFetch(`${getApiBase()}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, countryCode, retryType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to resend OTP" }));
    throw new Error(err.error || "Failed to resend OTP");
  }
  return res.json() as Promise<{ message: string }>;
}

export async function verifyOtp(phone: string, otp: string, countryCode = "+91") {
  const res = await resilientFetch(`${getApiBase()}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp, countryCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Invalid OTP" }));
    throw new Error(err.error || "Invalid OTP");
  }
  const data = await res.json();
  setAuthToken(data.token);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
  if (data.user) await saveUserToStorage(data.user);
  return data as { token: string; user: { id: string; phone: string; name?: string; email?: string; role?: string } };
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshTokenValue) return false;
  try {
    const res = await resilientFetch(`${getApiBase()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    }, { retries: 1, timeoutMs: 10000 });
    if (!res.ok) { setAuthToken(null); return false; }
    const data = await res.json();
    setAuthToken(data.token);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return true;
  } catch { return false; }
}

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!authToken) throw new Error("Not authenticated");
  const headers = { ...options.headers, Authorization: `Bearer ${authToken}` };
  const res = await resilientFetch(url, { ...options, headers });
  if (res.status === 401) {
    if (!isRefreshing) isRefreshing = refreshAccessToken().finally(() => { isRefreshing = null; });
    const refreshed = await isRefreshing;
    if (refreshed) {
      const retryHeaders = { ...options.headers, Authorization: `Bearer ${authToken}` };
      return resilientFetch(url, { ...options, headers: retryHeaders }, { retries: 0 });
    }
    throw new Error("Session expired. Please log in again.");
  }
  return res;
}

// ─── Pricing API ─────────────────────────────────────────────
export async function fetchPricing(request: PricingRequest): Promise<PricingResponse> {
  const res = await resilientFetch(`${getApiBase()}/pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Pricing calculation failed");
  }
  const data = await res.json() as PricingResponse;

  // Normalise vehicle keys: backend may still return sedan/suv from old deployments
  if (data.vehicleOptions && !data.vehicleOptions.yellow) {
    const vo = data.vehicleOptions as any;
    data.vehicleOptions = {
      yellow: vo.sedan || vo.yellow || { basePrice: data.basePrice, extraKmCharge: data.extraKmCharge, totalPrice: data.totalPrice, breakdown: data.breakdown },
      yellowSky: vo.suv || vo.yellowSky || { basePrice: data.basePrice, extraKmCharge: data.extraKmCharge, totalPrice: data.totalPrice, breakdown: data.breakdown },
    };
  }
  if (!data.vehicleOptions) {
    data.vehicleOptions = {
      yellow: { basePrice: data.basePrice, extraKmCharge: data.extraKmCharge, totalPrice: data.totalPrice, breakdown: data.breakdown },
      yellowSky: { basePrice: data.basePrice, extraKmCharge: data.extraKmCharge, totalPrice: data.totalPrice, breakdown: data.breakdown },
    };
  }
  return data;
}

// ─── Availability ─────────────────────────────────────────────
export async function checkAvailability(pickupDateTime: string) {
  try {
    const res = await authenticatedFetch(
      `${getApiBase()}/bookings/availability?pickupDateTime=${encodeURIComponent(pickupDateTime)}`
    );
    if (!res.ok) return { available: true, busyCount: 0, totalVehicles: 0, checkFailed: true };
    const data = await res.json();
    return { available: data.available, busyCount: data.busyCount, totalVehicles: data.totalVehicles };
  } catch {
    return { available: true, busyCount: 0, totalVehicles: 0, checkFailed: true };
  }
}

export async function checkBlocked(pickupDateTime: string): Promise<boolean> {
  const res = await authenticatedFetch(
    `${getApiBase()}/bookings/check-blocked?pickupDateTime=${encodeURIComponent(pickupDateTime)}`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.blocked;
}

// ─── Flight ───────────────────────────────────────────────────
export async function fetchFlight(flightNumber: string, date: Date = new Date()) {
  const yyyyMmDd = date.toISOString().split("T")[0];
  const res = await resilientFetch(
    `${getApiBase()}/flights/lookup?flight_number=${encodeURIComponent(flightNumber)}&date=${yyyyMmDd}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Flight lookup failed" }));
    throw new Error(res.status === 404 ? "Flight not found" : body.error || "Flight lookup failed");
  }
  return res.json();
}

// ─── Bookings ─────────────────────────────────────────────────
export interface CreateBookingRequest {
  tripType: string;
  rideType?: string;
  vehicleType?: VehicleKey;
  passengers?: number;
  luggage?: number;
  pickup: { location: string; placeName?: string; placeId: string; dateTime: string; terminal?: string; lat?: number; lng?: number };
  drop: { location: string; placeName?: string; placeId: string; dateTime: string; terminal?: string; lat?: number; lng?: number };
  stops?: { location: string; placeName?: string; placeId?: string }[];
  flight?: { flightNumber: string; airline: string; departure: string; arrival: string; status: string };
  pricing: { distanceKm: number; basePrice: number; extraKmCharge: number; totalPrice: number };
  guestName?: string;
  guestPhone?: string;
  // outstation
  tripVariant?: string;
  // hourly
  hours?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface AssignedDriverInfo { id: string; name: string; phone: string; photo?: string; rating: number; }
export interface AssignedVehicleInfo { id: string; make: string; model: string; color: string; licensePlate: string; type: string; }
export interface BookingRating { rating: number; comment?: string; ratedAt: string; }

export interface Booking extends CreateBookingRequest {
  id: string;
  tripCode?: string;
  userId: string;
  status: "pending" | "confirmed" | "assigned" | "arrived" | "in_progress" | "completed" | "cancelled";
  assignedDriver?: AssignedDriverInfo;
  assignedVehicle?: AssignedVehicleInfo;
  rating?: BookingRating;
  locationTrail?: { lat: number; lng: number; timestamp: string }[];
  pendingAmount?: number;
  paymentLinkUrl?: string;
  paymentStatus?: string;
  hidePrice?: boolean;
  createdAt: string;
}

export async function createBooking(booking: CreateBookingRequest): Promise<Booking> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create booking" }));
    throw new Error(error.error || "Failed to create booking");
  }
  return (await res.json()).booking;
}

export async function getBookings(): Promise<Booking[]> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings`, { method: "GET" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch bookings" }));
    throw new Error(error.error || "Failed to fetch bookings");
  }
  return (await res.json()).bookings || [];
}

export async function getBooking(bookingId: string): Promise<Booking> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings/${bookingId}`, { method: "GET" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch booking" }));
    throw new Error(error.error || "Failed to fetch booking");
  }
  return (await res.json()).booking;
}

export async function rateBooking(bookingId: string, rating: number, comment?: string): Promise<Booking> {
  const res = await authenticatedFetch(`${getApiBase()}/bookings/${bookingId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to rate booking" }));
    throw new Error(error.error || "Failed to rate booking");
  }
  return (await res.json()).booking;
}

// ─── User Profile ─────────────────────────────────────────────
export interface UserProfile { id: string; phone: string; name?: string; email?: string; }

export async function getUserProfile(): Promise<UserProfile> {
  const res = await authenticatedFetch(`${getApiBase()}/user/profile`, { method: "GET" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch profile" }));
    throw new Error(error.error || "Failed to fetch profile");
  }
  return (await res.json()).user;
}

export async function updateUserProfile(data: { name?: string; email?: string }): Promise<UserProfile> {
  const res = await authenticatedFetch(`${getApiBase()}/user/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update profile" }));
    throw new Error(error.error || "Failed to update profile");
  }
  return (await res.json()).user;
}

// ─── Payments ────────────────────────────────────────────────
export interface PaymentConfig { razorpayKeyId: string | null; onlinePaymentAvailable: boolean; supportedMethods: string[]; currency: string; }

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const res = await resilientFetch(`${getApiBase()}/payments/config`);
  if (!res.ok) throw new Error("Failed to get payment config");
  return (await res.json()).config;
}

export interface RazorpayOrder { id: string; amount: number; currency: string; receipt: string; status: string; }

export async function createPaymentOrder(bookingId: string, amount: number): Promise<RazorpayOrder> {
  const res = await authenticatedFetch(`${getApiBase()}/payments/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, amount, currency: "INR" }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create order" }));
    throw new Error(error.error || "Failed to create order");
  }
  return (await res.json()).order;
}

export async function verifyPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
  bookingId: string
): Promise<{ success: boolean; message: string; status?: string }> {
  const res = await authenticatedFetch(`${getApiBase()}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Payment verification failed" }));
    throw new Error(error.error || "Payment verification failed");
  }
  return res.json();
}

// ─── Journey tracking ────────────────────────────────────────
export type JourneyStage =
  | "fare_check_started" | "trip_summary_opened" | "booking_created_pending_payment"
  | "payment_checkout_opened" | "payment_verification_started" | "payment_confirmed" | "payment_failed_or_cancelled";

export async function trackJourneyStage(event: { journeyId?: string; stage: JourneyStage; page?: string; eventAt?: string; bookingId?: string; paymentId?: string; metadata?: Record<string, unknown> }): Promise<{ journeyId: string }> {
  const res = await resilientFetch(`${getApiBase()}/journey/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }, { retries: 0, timeoutMs: 8000 });
  if (!res.ok) throw new Error("Failed to track journey");
  return (await res.json());
}

// ─── Support ─────────────────────────────────────────────────
export async function getSupportContact(): Promise<{ whatsappNumber: string }> {
  try {
    const res = await authenticatedFetch(`${getApiBase()}/user/support-contact`);
    if (!res.ok) return { whatsappNumber: SUPPORT_FALLBACK };
    const data = await res.json();
    return { whatsappNumber: data?.support?.whatsappNumber || SUPPORT_FALLBACK };
  } catch {
    return { whatsappNumber: SUPPORT_FALLBACK };
  }
}

export function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsAppUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") { window.open(url, "_blank"); return; }
  await Linking.openURL(url);
}
