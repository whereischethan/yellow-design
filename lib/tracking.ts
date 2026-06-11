import type { Booking } from '../types/booking'

export const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'assigned', 'arrived', 'in_progress'])

/** The tracking screen (and params) that matches a booking's current status. */
export function trackingRouteForBooking(b: Booking): { pathname: string; params: Record<string, string> } {
  switch (b.status) {
    case 'in_progress':
      return { pathname: '/(app)/ontrip', params: { booking: JSON.stringify(b) } }
    case 'assigned':
    case 'arrived':
      return { pathname: '/(app)/enroute', params: { booking: JSON.stringify(b) } }
    case 'completed':
    case 'cancelled':
      return { pathname: '/(app)/complete', params: { bookingId: b.id, booking: JSON.stringify(b) } }
    default: // pending / confirmed — but a driver may already be assigned without a status bump
      if (b.assignedDriver) return { pathname: '/(app)/enroute', params: { booking: JSON.stringify(b) } }
      return { pathname: '/(app)/awaiting', params: { booking: JSON.stringify(b) } }
  }
}

/** The active booking with the soonest pickup (input is createdAt-desc, so ties fall to newest). */
export function pickActiveBooking(bookings: Booking[]): Booking | null {
  const active = bookings.filter(b => ACTIVE_STATUSES.has(b.status))
  if (!active.length) return null
  return active.slice().sort((a, b) => {
    const ta = Date.parse(a.pickup?.dateTime ?? '') || Infinity
    const tb = Date.parse(b.pickup?.dateTime ?? '') || Infinity
    return ta - tb
  })[0]
}
