export type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

export interface Driver {
  id: string
  name: string
  phone: string
  status: 'available' | 'on-trip' | 'offline'
  rating: number
  plate: string
  vehicle: string
  joined: string
  trips: number
  photoUrl?: string | null
  licenseNo?: string | null
  licenseExp?: string | null
  docLicense?: string | null
  docAadhaar?: string | null
  docPan?: string | null
  docPolice?: string | null
}

export interface Vehicle {
  id: string
  plate: string
  make: string
  model: string
  color: string
  type: string
  class_key: string
  year: number
  status: 'available' | 'assigned' | 'maintenance' | 'on-trip' | 'offline'
  driver_id: string | null
  driver_name: string | null
  driver_status: string | null
  driver_phone: string | null
  trips: number
  is_ev: number
  soc: number
  odometer: number
  insurance_expiry: string | null
  fc_expiry: string | null
  maintenance_note: string | null
}

export interface BookingLocation {
  location: string
  placeName?: string
  placeId?: string
  dateTime: string
  terminal?: string
  lat?: number
  lng?: number
}

export interface FlightInfo {
  flightNumber: string
  airline: string
  departure: string
  arrival: string
  status: string
}

export interface Pricing {
  distanceKm: number
  basePrice: number
  extraKmCharge: number
  totalPrice: number
  fareBeforeTax?: number
  gst?: number
  discount?: number
  toll?: number
  durationMinutes?: number
}

export interface StopLocation {
  location: string
  placeName?: string
  placeId?: string
}

export interface Booking {
  id: string
  tripCode: string
  userId: string
  userName?: string | null
  userPhone?: string | null
  status: BookingStatus
  tripType: 'pickup' | 'drop' | 'outstation' | 'hourly'
  vehicleType: string
  passengers: number
  pickup: BookingLocation
  drop: BookingLocation
  stops?: StopLocation[] | null
  flight?: FlightInfo
  pricing: Pricing
  guestName?: string
  guestPhone?: string
  assignedDriver?: Driver
  assignedVehicle?: { make: string; model: string; licensePlate: string; color: string }
  paymentStatus?: string
  paymentMethod?: 'cash' | 'upi' | null
  razorpayPaymentId?: string
  razorpayLinkId?: string | null
  razorpayLinkUrl?: string | null
  customerGstin?: string | null
  customerGstName?: string | null
  invoiceNo?: string | null
  createdAt: string
}

export interface Invoice {
  id: string
  invoiceNo: string
  generatedAt: string
  tripCode: string
  customerName: string | null
  customerPhone: string | null
  amount: number
  paymentStatus: string
  paymentMethod: string | null
  razorpayPaymentId: string | null
}

export interface CustomInvoice {
  id: string
  invoiceNo: string
  generatedAt: string
  customAmount: number
  driverName: string | null
  vehiclePlate: string | null
  customerName: string | null
  pickupLocation: string | null
  dropLocation: string | null
  pickupDateTime: string | null
  distanceKm: number | null
  toll: number | null
  discount: number | null
  stopsJson: string | null
  note: string | null
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  created_at: string
  trip_count: number
  referral_code?: string | null
  referred_by?: { id: string; name: string | null; phone: string } | null
  referral_count?: number
  referral_credits?: number
}

export interface LeadPricing {
  distanceKm?: number
  fareBeforeTax?: number
  gst?: number
  toll?: number
  totalPrice?: number
  breakdown?: {
    kmFare?: string
    tripCharge?: string
    gst?: string
    toll?: string
    baseRate?: string
    distanceFare?: string
    driverBata?: string
  }
  vehicleOptions?: {
    yellowSky?: { totalPrice?: number; basePrice?: number }
  }
}

export interface Lead {
  id: string
  user_id: string
  user_name: string | null
  user_phone: string | null
  status: 'new' | 'called' | 'converted' | 'lost'
  trip_type: string
  pickup: { placeName?: string; location: string; dateTime?: string } | null
  drop: { placeName?: string; location: string } | null
  price: number
  pickup_time: string | null
  flight: string | null
  quoted_at: string
  caller_note: string | null
  trip_code: string | null
  pricing: LeadPricing | null
}

export interface Stats {
  ridesToday: number
  revenueToday: number
  driversActive: number
  pendingCount: number
  nextTwoHours: number
  openLeads: number
}

export type PricingConfig = Record<string, string>
