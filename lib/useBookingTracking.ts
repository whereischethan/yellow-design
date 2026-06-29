import { useEffect, useRef, useState } from 'react'
import { getBooking, getBookingLocation, type BookingTracking } from './api'
import type { Booking } from '../types/booking'

const POLL_MS = 8000
const CONNECTION_ERROR_THRESHOLD = 3

// Polls booking status + driver location every 8s. After 3 consecutive failures
// the `connectionError` flag is set so the UI can show a retry banner.
export function useBookingTracking(initialBooking: Booking | null) {
  const [booking, setBooking] = useState<Booking | null>(initialBooking)
  const [trackingInfo, setTrackingInfo] = useState<BookingTracking | null>(null)
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null)
  const [nowTick, setNowTick] = useState(Date.now())
  const [connectionError, setConnectionError] = useState(false)
  const failCountRef = useRef(0)

  const bookingId = initialBooking?.id

  useEffect(() => {
    if (!bookingId) return
    let active = true

    const poll = async () => {
      const [b, t] = await Promise.allSettled([getBooking(bookingId), getBookingLocation(bookingId)])
      if (!active) return
      const anySuccess = b.status === 'fulfilled' || t.status === 'fulfilled'
      if (anySuccess) {
        failCountRef.current = 0
        setConnectionError(false)
      } else {
        failCountRef.current += 1
        if (failCountRef.current >= CONNECTION_ERROR_THRESHOLD) setConnectionError(true)
      }
      if (b.status === 'fulfilled') setBooking(b.value)
      if (t.status === 'fulfilled') {
        setTrackingInfo(t.value)
        setLastFetchAt(Date.now())
      }
    }

    poll()
    const iv = setInterval(poll, POLL_MS)
    return () => { active = false; clearInterval(iv) }
  }, [bookingId])

  useEffect(() => {
    const iv = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const secondsAgo = lastFetchAt != null ? Math.max(0, Math.round((nowTick - lastFetchAt) / 1000)) : null
  const isLive = trackingInfo?.tracking === true && trackingInfo.driver?.stale !== true

  return { booking, trackingInfo, secondsAgo, isLive, connectionError }
}
