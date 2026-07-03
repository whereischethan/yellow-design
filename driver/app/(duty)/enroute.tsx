import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as Location from 'expo-location'
import { YL, FONTS } from '@/constants/theme'
import { useDuty } from '@/context/DutyContext'
import { haversineKm, isWithinKm } from '@/lib/geo'
import { postDriverLocation, updateBookingStatus } from '@/lib/api'
import { callPhone } from '@/lib/contact'
import { ARRIVAL_RADIUS_KM, GPS_TIMEOUT_MS, LOCATION_POST_MS } from '@/lib/config'
import { useCancellationWatch } from '@/lib/useCancellationWatch'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
}

export default function EnRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bookings, refreshBooking } = useDuty()
  const booking = bookings.find((b) => b.id === id) ?? null

  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [arriving, setArriving] = useState(false)
  const [arriveError, setArriveError] = useState('')
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)
  const [gpsUnavailable, setGpsUnavailable] = useState(false)
  const subRef = useRef<Location.LocationSubscription | null>(null)
  const lastPostRef = useRef(0)
  const gotFixRef = useRef(false)

  // If GPS never resolves within 60s (permission denied, slow web geolocation),
  // unlock manual arrival instead of soft-locking the driver
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!gotFixRef.current) setGpsUnavailable(true)
    }, GPS_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  useCancellationWatch(booking?.id)

  const pickupLat = booking?.pickup?.lat
  const pickupLng = booking?.pickup?.lng
  const hasCoords = pickupLat != null && pickupLng != null

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (!mounted) return

      if (status !== 'granted') {
        setLocationLoading(false)
        return
      }
      setPermissionGranted(true)

      // Watch regardless of pickup coords — location posting must not depend on them
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        (loc: Location.LocationObject) => {
          if (!mounted) return
          if (Date.now() - lastPostRef.current >= LOCATION_POST_MS) {
            lastPostRef.current = Date.now()
            postDriverLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              heading: loc.coords.heading ?? undefined,
              speed: loc.coords.speed ?? undefined,
            })
          }
          gotFixRef.current = true
          setGpsUnavailable(false)
          if (hasCoords) {
            const km = haversineKm(loc.coords.latitude, loc.coords.longitude, pickupLat!, pickupLng!)
            setDistanceKm(km)
          }
          setLocationLoading(false)
        }
      )
      subRef.current = sub
      if (!hasCoords) setLocationLoading(false)
    })()

    return () => {
      mounted = false
      subRef.current?.remove()
    }
  }, [hasCoords, pickupLat, pickupLng])

  const withinRange = hasCoords && distanceKm !== null && distanceKm <= ARRIVAL_RADIUS_KM
  const canMarkArrived = !hasCoords || withinRange || gpsUnavailable
  const tripCode = booking?.tripCode ?? id?.slice(-6).toUpperCase() ?? '—'

  const dropLat = booking?.drop?.lat
  const dropLng = booking?.drop?.lng
  const dropHasCoords = dropLat != null && dropLng != null

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/(duty)/roster')
  }

  function handleOpenMaps() {
    if (!hasCoords) return
    Linking.openURL(mapsUrl(pickupLat!, pickupLng!))
  }

  function handleOpenDropMaps() {
    if (!dropHasCoords) return
    Linking.openURL(mapsUrl(dropLat!, dropLng!))
  }

  function handleCallPassenger() {
    if (!booking?.guestPhone) return
    callPhone(booking.guestPhone)
  }

  async function handleArrived() {
    // The server enforces status order, so 'arrived' must land before the
    // driver can start the trip — surface failures instead of swallowing them.
    if (booking && !['arrived', 'in_progress', 'completed'].includes(booking.status)) {
      setArriving(true)
      setArriveError('')
      try {
        await updateBookingStatus(String(id), 'arrived')
        refreshBooking({ ...booking, status: 'arrived' })
      } catch (e: any) {
        setArriveError(e?.message || 'Could not update trip status — check your connection and retry.')
        setArriving(false)
        return
      }
      setArriving(false)
    }
    router.push(`/(duty)/arrived?id=${id}`)
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centerState}>
          <Text style={styles.centerText}>Trip not found.</Text>
          <TouchableOpacity onPress={() => router.replace('/(duty)/roster')} style={styles.backLinkBtn}>
            <Text style={styles.backLinkText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* TopBar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>En Route</Text>
          <View style={styles.tripCodeChip}>
            <Text style={styles.tripCodeText}>{tripCode}</Text>
          </View>
        </View>

        {/* Passenger card */}
        <View style={styles.card}>
          <Text style={styles.riderName}>{booking.guestName ?? 'Passenger'}</Text>
          {booking.flight ? (
            <View style={styles.flightRow}>
              <Text style={styles.flightNumber}>{booking.flight.flightNumber}</Text>
              <Text style={styles.flightAirline}>{booking.flight.airline}</Text>
              <View style={styles.onTimePill}>
                <Text style={styles.onTimeText}>{booking.flight.status ?? 'On time'}</Text>
              </View>
            </View>
          ) : null}
          {booking.pickup?.dateTime ? (
            <Text style={styles.pickupDateTime}>{formatDateTime(booking.pickup.dateTime)}</Text>
          ) : null}
        </View>

        {/* Pickup address card */}
        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>PICKUP</Text>
          <Text style={styles.addressText}>
            {booking.pickup?.location ?? booking.pickup?.placeName ?? '—'}
          </Text>
          {hasCoords ? (
            <TouchableOpacity style={styles.mapsLink} onPress={handleOpenMaps} activeOpacity={0.7}>
              <Text style={styles.mapsLinkText}>Open in Maps →</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stops card */}
        {booking.stops && booking.stops.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>
              {booking.stops.length === 1 ? 'STOP' : `STOPS (${booking.stops.length})`}
            </Text>
            {booking.stops.map((stop, i) => (
              <View key={i} style={styles.stopRow}>
                <Text style={styles.stopIndex}>{i + 1}</Text>
                <Text style={styles.stopText}>{stop.placeName ?? stop.location}</Text>
                {stop.lat != null && stop.lng != null ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(mapsUrl(stop.lat!, stop.lng!))}
                    hitSlop={8}
                  >
                    <Text style={styles.mapsLinkText}>Maps →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Drop address card */}
        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>DROP</Text>
          <Text style={styles.addressText}>
            {booking.drop?.placeName ?? booking.drop?.location ?? '—'}
          </Text>
          {booking.drop?.placeName &&
          booking.drop?.location &&
          booking.drop.location !== booking.drop.placeName ? (
            <Text style={styles.addressSub}>{booking.drop.location}</Text>
          ) : null}
          {dropHasCoords ? (
            <TouchableOpacity
              style={styles.mapsLink}
              onPress={handleOpenDropMaps}
              activeOpacity={0.7}
            >
              <Text style={styles.mapsLinkText}>Open in Maps →</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Geofence status bar */}
        {gpsUnavailable ? (
          <View style={[styles.geofenceBar, styles.geofenceBarNeutral]}>
            <Text style={styles.geofenceTextMuted}>
              Location unavailable — you can mark arrival manually
            </Text>
          </View>
        ) : hasCoords ? (
          locationLoading ? (
            <View style={[styles.geofenceBar, styles.geofenceBarNeutral]}>
              <ActivityIndicator size="small" color={YL.ink3} style={{ marginRight: 8 }} />
              <Text style={styles.geofenceTextMuted}>Getting your location…</Text>
            </View>
          ) : withinRange ? (
            <View style={[styles.geofenceBar, styles.geofenceBarGreen]}>
              <Text style={styles.geofenceIcon}>📍</Text>
              <Text style={styles.geofenceTextGreen}>Within 2 km — you can mark arrival</Text>
            </View>
          ) : (
            <View style={[styles.geofenceBar, styles.geofenceBarOrange]}>
              <Text style={styles.geofenceIcon}>🔥</Text>
              <Text style={styles.geofenceTextOrange}>
                ≈ {distanceKm !== null ? distanceKm.toFixed(1) : '—'} km away
              </Text>
            </View>
          )
        ) : (
          <View style={[styles.geofenceBar, styles.geofenceBarNeutral]}>
            <Text style={styles.geofenceTextMuted}>
              Location data unavailable — tap when you arrive
            </Text>
          </View>
        )}

        {arriveError ? (
          <Text style={{ fontFamily: FONTS.display, fontSize: 13, color: '#DC2626', textAlign: 'center' }}>
            {arriveError}
          </Text>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.ghostBtn, !booking.guestPhone && styles.ghostBtnDisabled]}
            onPress={handleCallPassenger}
            disabled={!booking.guestPhone}
            activeOpacity={0.75}
          >
            <Text style={styles.ghostBtnText}>Call passenger</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, (!canMarkArrived || arriving) && styles.primaryBtnDisabled]}
            onPress={handleArrived}
            disabled={!canMarkArrived || arriving}
            activeOpacity={0.85}
          >
            {arriving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{arriveError ? 'Retry — I\'ve arrived' : 'I\'ve arrived ✓'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: YL.bg,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  backArrow: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    color: YL.ink,
  },
  topTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 20,
    color: YL.ink,
    flex: 1,
  },
  tripCodeChip: {
    backgroundColor: YL.yellow,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tripCodeText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink,
  },
  card: {
    backgroundColor: YL.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: YL.line,
    padding: 16,
    gap: 8,
  },
  riderName: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 20,
    color: YL.ink,
  },
  flightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  flightNumber: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.ink,
  },
  flightAirline: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink2,
  },
  onTimePill: {
    backgroundColor: YL.leafSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  onTimeText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: YL.leaf,
  },
  pickupDateTime: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink2,
  },
  sectionEyebrow: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: YL.ink3,
  },
  addressText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: YL.ink,
    lineHeight: 22,
  },
  addressSub: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: YL.ink2,
    lineHeight: 18,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopIndex: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: YL.ink3,
    width: 16,
    textAlign: 'center',
  },
  stopText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: YL.ink,
    flex: 1,
  },
  mapsLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  mapsLinkText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: YL.leaf,
  },
  geofenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  geofenceBarGreen: {
    backgroundColor: YL.leafSoft,
  },
  geofenceBarOrange: {
    backgroundColor: YL.gulmoharSoft,
  },
  geofenceBarNeutral: {
    backgroundColor: YL.bg2,
  },
  geofenceIcon: {
    fontSize: 16,
  },
  geofenceTextGreen: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.leaf,
    flex: 1,
  },
  geofenceTextOrange: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.gulmohar,
    flex: 1,
  },
  geofenceTextMuted: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: YL.ink3,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  ghostBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: YL.line,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostBtnDisabled: {
    opacity: 0.4,
  },
  ghostBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: YL.ink2,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: YL.ink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  centerText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: YL.ink2,
  },
  backLinkBtn: {
    padding: 8,
  },
  backLinkText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: YL.leaf,
  },
})
