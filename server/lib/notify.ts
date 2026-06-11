// Single co-location point for booking notifications: customer SMS + customer push
// + driver-directed push. Fire-and-forget by contract — never throws, never blocks.

import type { Booking } from '@prisma/client'
import prisma from './prisma'
import { sendStatusSms, collectPhones } from './sms'
import { sendPushToOwner, type PushMessage } from './push'

export type BookingEvent =
  // Customer status events (SMS + push, gated on booking.sendSms)
  | 'confirmed' | 'assigned' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  // Driver-directed events (push only)
  | 'driver_assigned' | 'driver_unassigned' | 'driver_cancelled' | 'time_changed'

const CUSTOMER_EVENTS = ['confirmed', 'assigned', 'arrived', 'in_progress', 'completed', 'cancelled']

function tryParse(json: string | null | undefined): any {
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}

function istTime(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      hour12: true, timeZone: 'Asia/Kolkata',
    })
  } catch { return '—' }
}

function customerPushCopy(event: string, b: Booking): PushMessage | null {
  const driver = tryParse(b.assignedDriverJson)
  const vehicle = tryParse(b.assignedVehicleJson)
  const plate = vehicle?.licensePlate ?? driver?.plate ?? ''
  switch (event) {
    case 'confirmed':
      return { title: 'Booking confirmed', body: `Trip ${b.tripCode} is confirmed. See you soon!` }
    case 'assigned':
      return { title: 'Driver assigned', body: `${driver?.name ?? 'Your driver'}${plate ? ` (${plate})` : ''} will pick you up · ${b.tripCode}` }
    case 'in_progress':
      return { title: 'Driver on the way', body: `${driver?.name ?? 'Your driver'} is heading to you${plate ? ` in ${plate}` : ''}. Be ready!` }
    case 'arrived':
      return { title: 'Your Yellow has arrived', body: `Look for ${plate || `trip ${b.tripCode}`}.` }
    case 'completed':
      return { title: 'Trip complete', body: `Trip ${b.tripCode} is complete. Thanks for riding with Yellow!` }
    case 'cancelled':
      return { title: 'Booking cancelled', body: `Trip ${b.tripCode} was cancelled. Contact support for queries.` }
    default:
      return null
  }
}

function driverPushCopy(event: string, b: Booking): PushMessage | null {
  const pickup = tryParse(b.pickupJson)
  const when = istTime(pickup?.dateTime)
  const where = pickup?.placeName ?? pickup?.location ?? 'pickup'
  switch (event) {
    case 'driver_assigned':
      return { title: 'New trip assigned', body: `${b.tripCode} · ${when} · ${where}` }
    case 'driver_unassigned':
      return { title: 'Trip reassigned', body: `${b.tripCode} is no longer assigned to you.` }
    case 'driver_cancelled':
      return { title: 'Trip cancelled', body: `${b.tripCode} (${when}) was cancelled.` }
    case 'time_changed':
      return { title: 'Pickup time changed', body: `${b.tripCode} moved to ${when}.` }
    default:
      return null
  }
}

export function notifyBookingEvent(
  booking: Booking,
  event: BookingEvent,
  opts: { previousDriverId?: string | null } = {},
): void {
  void (async () => {
    try {
      if (CUSTOMER_EVENTS.includes(event)) {
        if (booking.sendSms === false) return

        const user = booking.userId
          ? await prisma.user.findUnique({ where: { id: booking.userId }, select: { phone: true } })
          : null
        const phones = collectPhones(user?.phone, booking.guestPhone)
        const driver = tryParse(booking.assignedDriverJson)
        const vehicle = tryParse(booking.assignedVehicleJson)
        const pickup = tryParse(booking.pickupJson)
        const ctx = {
          tripType: booking.tripType ?? undefined,
          pickupDateTime: pickup?.dateTime,
          driverName: driver?.name,
          vehiclePlate: vehicle?.licensePlate ?? driver?.plate,
        }
        for (const phone of phones) {
          sendStatusSms(phone, booking.tripCode, event, ctx).catch(() => {})
        }

        const push = customerPushCopy(event, booking)
        if (push && booking.userId) {
          sendPushToOwner('user', booking.userId, { ...push, data: { bookingId: booking.id, status: event } }).catch(() => {})
        }
        return
      }

      // Driver-directed events
      const targetDriverId = event === 'driver_unassigned'
        ? opts.previousDriverId
        : tryParse(booking.assignedDriverJson)?.id
      const push = driverPushCopy(event, booking)
      if (push && targetDriverId) {
        sendPushToOwner('driver', targetDriverId, { ...push, data: { bookingId: booking.id, event } }).catch(() => {})
      }
    } catch (e) {
      console.error('[NOTIFY] Error:', e)
    }
  })()
}
