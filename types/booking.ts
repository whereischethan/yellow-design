export interface PricingBreakdown {
  baseRate: string;
  extraKm: string;
  tollsIncluded: string;
  gstIncluded: string;
}

export interface VehiclePricing {
  basePrice: number;
  extraKmCharge: number;
  totalPrice: number;
  breakdown: PricingBreakdown;
}

export interface VehicleOptions {
  yellowSky?: VehiclePricing;
  yellow?: VehiclePricing;
  // legacy fields from old API shape
  sedan?: VehiclePricing;
  suv?: VehiclePricing;
}

export interface EmptyLegInfo {
  type: 'emptyLeg' | 'homeBase' | 'manualOverride';
  savedAmount: number;   // ₹ saved vs. normal fare
  message: string;
}

export interface PricingResponse {
  distanceKm: number;
  durationMinutes: number;
  fareBeforeTax: number;   // km fare + trip charge (shown as single "Fare" line to customer)
  gst: number;             // 5% of fareBeforeTax
  toll: number;            // pass-through, no GST
  totalPrice: number;      // fareBeforeTax + gst + toll
  breakdown: PricingBreakdown;
  vehicleOptions: VehicleOptions;
  emptyLeg?: EmptyLegInfo;
  // legacy compat
  basePrice?: number;
  extraKmCharge?: number;
}

export type VehicleType = 'yellowSky' | 'yellow' | 'sedan' | 'suv';
export type TripType = 'pickup' | 'drop' | 'outstation' | 'hourly';

export interface LocationData {
  description: string;
  placeId: string;
  placeName?: string;
  lat?: number;
  lng?: number;
}

export interface FlightInfo {
  flightNumber: string;
  airline: string;
  departure: string;
  arrival: string;
  status: string;
}

export interface BookingLocation {
  location: string;
  placeName?: string;
  placeId: string;
  dateTime: string;
  terminal?: string;
  lat?: number;
  lng?: number;
}

export interface CreateBookingRequest {
  tripType: TripType;
  vehicleType?: VehicleType;
  passengers?: number;
  pickup: BookingLocation;
  drop: BookingLocation;
  stops?: { location: string; placeName?: string; placeId?: string }[];
  flight?: FlightInfo;
  pricing: {
    distanceKm: number;
    basePrice: number;
    extraKmCharge: number;
    totalPrice: number;
    fareBeforeTax?: number;
    gst?: number;
    toll?: number;
    creditsApplied?: number;
    emptyLegDiscount?: number;
  };
  guestName?: string;
  guestPhone?: string;
}

export interface AssignedDriverInfo {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  rating: number;
}

export interface AssignedVehicleInfo {
  id: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  type: string;
}

export interface Booking extends CreateBookingRequest {
  id: string;
  tripCode?: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'assigned' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  assignedDriver?: AssignedDriverInfo;
  assignedVehicle?: AssignedVehicleInfo;
  rating?: { rating: number; comment?: string; ratedAt: string };
  pendingAmount?: number;
  paymentStatus?: string;
  createdAt: string;
}
