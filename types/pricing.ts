export type RideType = 'airport' | 'outstation' | 'hourly';
export type TripVariant = 'one_way' | 'round_trip';
export type HourlyPackage = 4 | 8 | 12;
export type VehicleKey = 'yellow' | 'yellowSky';

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

export interface PricingResponse {
  rideType: RideType;
  distanceKm: number;
  durationMinutes: number;
  basePrice: number;
  extraKmCharge: number;
  totalPrice: number;
  breakdown: PricingBreakdown;
  vehicleOptions: Record<VehicleKey, VehiclePricing>;
  // hourly only
  hours?: HourlyPackage;
  hourlyRate?: number;
}

export interface PricingRequest {
  rideType: RideType;
  // airport / outstation
  originPlaceId?: string;
  origin?: string;
  // outstation
  destinationPlaceId?: string;
  tripVariant?: TripVariant;
  // airport
  tripType?: 'pickup' | 'drop';
  stops?: string[];
  // hourly
  hours?: HourlyPackage;
}
