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
  currentTripIndex: number
  readings: DutyReading[]
  date: string // YYYY-MM-DD
}

interface DutyContextType extends DutyState {
  setBookings: (bookings: DutyBooking[]) => void
  clockIn: () => void
  advanceTrip: () => void
  setCurrentTripIndex: (idx: number) => void
  addReading: (r: DutyReading) => void
  currentBooking: DutyBooking | null
  readingByType: (type: DutyReading['type'], bookingId?: string) => DutyReading | undefined
  clearDuty: () => void
  refreshBooking: (updated: DutyBooking) => void
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

const defaultState: DutyState = {
  clockInTime: null,
  bookings: [],
  currentTripIndex: 0,
  readings: [],
  date: today(),
}

const DutyContext = createContext<DutyContextType>({
  ...defaultState,
  currentBooking: null,
  setBookings: () => {},
  clockIn: () => {},
  advanceTrip: () => {},
  setCurrentTripIndex: () => {},
  addReading: () => {},
  readingByType: () => undefined,
  clearDuty: () => {},
  refreshBooking: () => {},
})

export function DutyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DutyState>(defaultState)

  useEffect(() => {
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(DUTY_KEY)
        if (raw) {
          const saved: DutyState = JSON.parse(raw)
          // Reset if it's a new day
          if (saved.date !== today()) {
            await AsyncStorage.removeItem(DUTY_KEY)
          } else {
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

  function advanceTrip() {
    persist({ ...state, currentTripIndex: state.currentTripIndex + 1 })
  }

  function setCurrentTripIndex(idx: number) {
    persist({ ...state, currentTripIndex: idx })
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

  const currentBooking = state.bookings[state.currentTripIndex] ?? null

  return (
    <DutyContext.Provider
      value={{
        ...state,
        currentBooking,
        setBookings,
        clockIn,
        advanceTrip,
        setCurrentTripIndex,
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
