import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { YL, FONTS } from '@/constants/theme'
import { useDuty, DutyBooking, ACTIVE_STATUSES, DONE_STATUSES } from '@/context/DutyContext'
import { getDriverBookings } from '@/lib/api'
import { ROSTER_POLL_MS } from '@/lib/config'
import DriverBottomNav from '@/components/DriverBottomNav'

// Resume an interrupted trip at the right screen for its server status.
export function screenForStatus(status: string): string {
  switch (status) {
    case 'arrived': return '/(duty)/arrived'
    case 'in_progress': return '/(duty)/in-trip'
    default: return '/(duty)/enroute'
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function formatDateLabel(iso: string): string {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const d = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  if (d === today) return 'Today'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
  })
}

function formatDateChip(): string {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
}

interface StatusPillProps {
  status: string
  isCurrent: boolean
}

function StatusPill({ status, isCurrent }: StatusPillProps) {
  if (isCurrent) {
    return (
      <View style={pillStyles.nextPill}>
        <View style={pillStyles.nextDot} />
        <Text style={pillStyles.nextText}>NEXT</Text>
      </View>
    )
  }
  if (status === 'completed') {
    return (
      <View style={pillStyles.leafPill}>
        <Text style={pillStyles.leafText}>DONE</Text>
      </View>
    )
  }
  if (status === 'cancelled') {
    return (
      <View style={pillStyles.gulmoharPill}>
        <Text style={pillStyles.gulmoharText}>CANCELLED</Text>
      </View>
    )
  }
  if (status === 'no_show') {
    return (
      <View style={pillStyles.gulmoharPill}>
        <Text style={pillStyles.gulmoharText}>NO-SHOW</Text>
      </View>
    )
  }
  if (status === 'in_progress') {
    return (
      <View style={pillStyles.nextPill}>
        <View style={pillStyles.nextDot} />
        <Text style={pillStyles.nextText}>IN TRIP</Text>
      </View>
    )
  }
  return null
}

const pillStyles = StyleSheet.create({
  nextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: YL.ink,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  nextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: YL.yellow,
  },
  nextText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: '#FFFFFF',
  },
  leafPill: {
    backgroundColor: YL.leafSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  leafText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: YL.leaf,
  },
  gulmoharPill: {
    backgroundColor: YL.gulmoharSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gulmoharText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: YL.gulmohar,
  },
})

function tripTypeLabel(b: DutyBooking): string {
  switch (b.tripType) {
    case 'pickup': return 'Airport pickup'
    case 'drop': return 'Airport drop'
    case 'outstation': return 'Outstation trip'
    case 'hourly': return 'Hourly rental'
    default: return 'Trip'
  }
}

interface TripCardProps {
  booking: DutyBooking
  isCurrent: boolean
  masked: boolean
  onSelect: (booking: DutyBooking) => void
}

function TripCard({ booking, isCurrent, masked, onSelect }: TripCardProps) {
  const isActive = ACTIVE_STATUSES.includes(booking.status)
  const collectFare =
    booking.driverCollect && booking.paymentStatus !== 'paid' ? booking.pricing?.totalPrice : null

  function handlePress() {
    if (!isActive || masked) return
    onSelect(booking)
  }

  return (
    <TouchableOpacity
      style={[styles.tripCard, !isActive && styles.tripCardMuted]}
      onPress={handlePress}
      activeOpacity={isActive && !masked ? 0.8 : 1}
    >
      {/* Top row: time + date label + status pill */}
      <View style={styles.tripTopRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.tripTime}>
            {booking.pickup?.dateTime ? formatTime(booking.pickup.dateTime) : '—'}
          </Text>
          <Text style={styles.tripDateLabel}>
            {booking.pickup?.dateTime ? formatDateLabel(booking.pickup.dateTime) : ''}
          </Text>
        </View>
        <StatusPill status={booking.status} isCurrent={isCurrent} />
      </View>

      {masked ? (
        /* Upcoming trips stay summary-only until the current one is done */
        <View>
          <Text style={styles.routeText}>{tripTypeLabel(booking)}</Text>
          <Text style={styles.maskedNote}>Details unlock after your current trip</Text>
        </View>
      ) : (
        <>
          {/* Route row */}
          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={1}>
              {booking.pickup?.placeName ?? booking.pickup?.location ?? '—'}
            </Text>
            <Text style={styles.routeArrow}>→</Text>
            <Text style={styles.routeText} numberOfLines={1}>
              {booking.drop?.placeName ?? booking.drop?.location ?? '—'}
            </Text>
          </View>

          {/* Bottom chips */}
          {(booking.flight?.flightNumber || collectFare != null) ? (
            <View style={styles.chipsRow}>
              {booking.flight?.flightNumber ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{booking.flight.flightNumber}</Text>
                </View>
              ) : null}
              {collectFare != null ? (
                <View style={styles.fareChip}>
                  <Text style={styles.fareText}>COLLECT ₹{collectFare}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  )
}

export default function RosterScreen() {
  const { bookings, currentBookingId, setCurrentBooking, setBookings } = useDuty()
  const [refreshing, setRefreshing] = useState(false)

  const handleSelect = useCallback((booking: DutyBooking) => {
    setCurrentBooking(booking.id)
    router.push(`${screenForStatus(booking.status)}?id=${booking.id}` as any)
  }, [setCurrentBooking])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const trips = await getDriverBookings()
      setBookings(trips?.bookings ?? trips ?? [])
    } catch {
      // silent — keep cached
    } finally {
      setRefreshing(false)
    }
  }, [setBookings])

  // Silent background refresh so new assignments appear without pull-to-refresh
  useEffect(() => {
    const t = setInterval(() => {
      getDriverBookings()
        .then((trips) => setBookings(trips?.bookings ?? trips ?? []))
        .catch(() => {})
    }, ROSTER_POLL_MS)
    return () => clearInterval(t)
  }, [setBookings])

  const sorted = [...bookings].sort((a, b) => {
    const ta = a.pickup?.dateTime ?? ''
    const tb = b.pickup?.dateTime ?? ''
    return ta.localeCompare(tb)
  })

  const allDone =
    sorted.length > 0 && sorted.every((b) => DONE_STATUSES.includes(b.status))

  // Route through close-duty so closing odometer/SoC readings are captured
  function handleCloseDuty() {
    router.push('/(duty)/close-duty')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Roster</Text>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>{formatDateChip()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={YL.ink2}
            colors={[YL.ink]}
          />
        }
      >
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No trips assigned</Text>
            <Text style={styles.emptySubtitle}>Pull down to refresh once admin assigns a trip.</Text>
          </View>
        ) : (
          (() => {
            // Only the next pending trip shows full details; later ones stay summary-only
            const nextId = sorted.find((b) => !DONE_STATUSES.includes(b.status))?.id
            return sorted.map((booking) => {
              const masked = !DONE_STATUSES.includes(booking.status) && booking.id !== nextId
              return (
                <TripCard
                  key={booking.id}
                  booking={booking}
                  isCurrent={booking.id === (currentBookingId ?? nextId)}
                  masked={masked}
                  onSelect={handleSelect}
                />
              )
            })
          })()
        )}

        {allDone && (
          <TouchableOpacity style={styles.ghostBtn} onPress={handleCloseDuty} activeOpacity={0.75}>
            <Text style={styles.ghostBtnText}>Close duty</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <DriverBottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 22,
    color: YL.ink,
  },
  dateChip: {
    backgroundColor: YL.bg2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dateChipText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink2,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  tripCard: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
  },
  tripCardMuted: {
    opacity: 0.65,
  },
  tripTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripTime: {
    fontFamily: FONTS.mono,
    fontSize: 16,
    color: YL.ink,
  },
  tripDateLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  routeText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
    flex: 1,
  },
  routeArrow: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: YL.ink3,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: YL.bg2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink2,
  },
  fareChip: {
    backgroundColor: YL.yellowSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  maskedNote: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink3,
    marginTop: 4,
  },
  fareText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: YL.ink,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 18,
    color: YL.ink2,
  },
  emptySubtitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink3,
    textAlign: 'center',
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  ghostBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: YL.ink2,
  },
})
