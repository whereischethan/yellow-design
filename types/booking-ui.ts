import { HourlyPackage, RideType, TripVariant, VehicleKey } from './pricing';

export interface LocationPoint {
  description: string;
  placeName?: string;
  placeId: string;
  lat?: number;
  lng?: number;
}

export interface BookingUI {
  rideType: RideType;
  vehicle: VehicleKey;

  // airport
  tripType?: 'pickup' | 'drop';
  pickup: LocationPoint & { time: string; dateTime: string };
  drop: LocationPoint & { dateTime?: string };
  stops?: Omit<LocationPoint, 'lat' | 'lng'>[];

  // outstation
  tripVariant?: TripVariant;

  // hourly
  hours?: HourlyPackage;
  startDateTime?: string;

  // passengers
  passengers: number;
  luggage: number;

  // guest
  guestName?: string;
  guestPhone?: string;

  // pricing
  price: number;
  pricing: {
    distanceKm: number;
    basePrice: number;
    extraKmCharge: number;
    totalPrice: number;
  };

  // flight (airport only)
  flight?: {
    airline: string;
    flightNumber: string;
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    terminal: string;
    status: string;
    date: string;
    departureDate: string;
    arrivalDate: string;
  };
}
