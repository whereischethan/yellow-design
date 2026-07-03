import { useEffect } from 'react'
import { router } from 'expo-router'
import { useDuty } from '@/context/DutyContext'
import { getDriverBooking } from '@/lib/api'
import { BOOKING_STATUS_POLL_MS } from '@/lib/config'

// While the driver is mid-flow on a booking, watch for ops cancelling it
// and divert to the cancelled screen instead of letting them drive on.
export function useCancellationWatch(bookingId: string | null | undefined) {
  const { refreshBooking } = useDuty()

  useEffect(() => {
    if (!bookingId) return
    const t = setInterval(async () => {
      try {
        const r = await getDriverBooking(bookingId)
        if (r?.booking) {
          refreshBooking(r.booking)
          if (r.booking.status === 'cancelled') {
            router.replace(`/(duty)/cancelled?id=${bookingId}`)
          }
        }
      } catch {
        // transient network errors — try again next tick
      }
    }, BOOKING_STATUS_POLL_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])
}
