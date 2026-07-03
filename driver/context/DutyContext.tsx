import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DUTY_KEY = 'yellow_driver_duty'

export interface DutyReading {
  id?: string
  type: 'handoff' | 'trip_start' | 'trip_end' | 'close_duty'
  bookingId?: string
  odometer?: number
  soc?: number
  timestamp: string
}

export interface DutyBooking {
  id: string
  tripCode: string
  status: string
  tripType: string | null
  vehicleType: string | null
  passengerCount: number | null
  paymentStatus: string
  paymentMethod: string | null
  driverCollect?: boolean
  guestName: string | null
  guestPhone: string | null
  pickup: {
    location: string
    placeName?: string
    placeId: string
    dateTime: string
    terminal?: string
    lat?: number
    lng?: number
  } | null
  drop: {
    location: string
    placeName?: string
    placeId: string
    lat?: number
    lng?: number
  } | null
  flight: {
    flightNumber: string
    airline: string
    departure: string
    arrival: string
    status: string
  } | null
  pricing: {
    distanceKm?: number
    totalPrice?: number
    basePrice?: number
    gst?: number
    toll?: number
  } | null
  assignedDriver: any | null
  assignedVehicle: any | null
  stops: {
    location: string
    placeName?: string
    placeId?: string
    lat?: number
    lng?: number
  }[] | null
  createdAt: string
}

interface DutyState {
  clockInTime: string | null
  bookings: DutyBooking[]
  currentBookingId: string | null
  readings: DutyReading[]
  date: string // YYYY-MM-DD
}

// Statuses a driver can still act on. 'in_progress' included so an interrupted
// trip can be resumed after an app restart.
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'assigned', 'arrived', 'in_progress']
export const DONE_STATUSES = ['completed', 'cancelled', 'no_show']

interface DutyContextType extends DutyState {
  setBookings: (bookings: DutyBooking[]) => void
  clockIn: () => void
  setCurrentBooking: (id: string | null) => void
  completeTrip: () => void
  addReading: (r: DutyReading) => void
  currentBooking: DutyBooking | null
  nextBooking: DutyBooking | null
  readingByType: (type: DutyReading['type'], bookingId?: string) => DutyReading | undefined
  clearDuty: () => void
  refreshBooking: (updated: DutyBooking) => void
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

const defaultState: DutyState = {
  clockInTime: null,
  bookings: [],
  currentBookingId: null,
  readings: [],
  date: today(),
}

const DutyContext = createContext<DutyContextType>({
  ...defaultState,
  currentBooking: null,
  nextBooking: null,
  setBookings: () => {},
  clockIn: () => {},
  setCurrentBooking: () => {},
  completeTrip: () => {},
  addReading: () => {},
  readingByType: () => undefined,
  clearDuty: () => {},
  refreshBooking: () => {},
})

// First actionable booking, in pickup-time order.
function deriveNextBooking(bookings: DutyBooking[], excludeId?: string | null): DutyBooking | null {
  return (
    [...bookings]
      .filter((b) => ACTIVE_STATUSES.includes(b.status) && b.id !== excludeId)
      .sort((a, b) => (a.pickup?.dateTime ?? '').localeCompare(b.pickup?.dateTime ?? ''))[0] ?? null
  )
}

export function DutyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DutyState>(defaultState)

  useEffect(() => {
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(DUTY_KEY)
        if (raw) {
          const saved = JSON.parse(raw)
          // Reset if it's a new day
          if (saved.date !== today()) {
            await AsyncStorage.removeItem(DUTY_KEY)
          } else {
            // Migrate pre-id duty state (currentTripIndex) to currentBookingId
            if (saved.currentBookingId === undefined) {
              saved.currentBookingId = saved.bookings?.[saved.currentTripIndex]?.id ?? null
              delete saved.currentTripIndex
            }
            setState(saved)
          }
        }
      } catch {
        // silent
      }
    })()
  }, [])

  async function persist(next: DutyState) {
    setState(next)
    try {
      await AsyncStorage.setItem(DUTY_KEY, JSON.stringify(next))
    } catch {
      // silent
    }
  }

  function setBookings(bookings: DutyBooking[]) {
    persist({ ...state, bookings })
  }

  function clockIn() {
    persist({ ...state, clockInTime: new Date().toISOString(), date: today() })
  }

  function setCurrentBooking(id: string | null) {
    persist({ ...state, currentBookingId: id })
  }

  // Current trip is done — hand focus to the next actionable booking.
  function completeTrip() {
    const next = deriveNextBooking(state.bookings, state.currentBookingId)
    persist({ ...state, currentBookingId: next?.id ?? null })
  }

  function addReading(r: DutyReading) {
    persist({ ...state, readings: [...state.readings, r] })
  }

  function readingByType(type: DutyReading['type'], bookingId?: string) {
    return state.readings.find((r) => r.type === type && (!bookingId || r.bookingId === bookingId))
  }

  function refreshBooking(updated: DutyBooking) {
    const next = state.bookings.map((b) => (b.id === updated.id ? updated : b))
    persist({ ...state, bookings: next })
  }

  async function clearDuty() {
    await AsyncStorage.removeItem(DUTY_KEY)
    setState({ ...defaultState, date: today() })
  }

  const currentBooking = state.bookings.find((b) => b.id === state.currentBookingId) ?? null
  const nextBooking = deriveNextBooking(state.bookings, state.currentBookingId)

  return (
    <DutyContext.Provider
      value={{
        ...state,
        currentBooking,
        nextBooking,
        setBookings,
        clockIn,
        setCurrentBooking,
        completeTrip,
        addReading,
        readingByType,
        clearDuty,
        refreshBooking,
      }}
    >
      {children}
    </DutyContext.Provider>
  )
}

export function useDuty() {
  return useContext(DutyContext)
}
