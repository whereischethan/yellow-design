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
import { postDriverLocation } from '@/lib/api'

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
  const { bookings } = useDuty()
  const booking = bookings.find((b) => b.id === id) ?? null

  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)
  const subRef = useRef<Location.LocationSubscription | null>(null)
  const lastPostRef = useRef(0)

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
          if (Date.now() - lastPostRef.current >= 10_000) {
            lastPostRef.current = Date.now()
            postDriverLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              heading: loc.coords.heading ?? undefined,
              speed: loc.coords.speed ?? undefined,
            })
          }
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

  const withinRange = hasCoords && distanceKm !== null && distanceKm <= 2
  const canMarkArrived = !hasCoords || withinRange
  const tripCode = booking?.tripCode ?? id?.slice(-6).toUpperCase() ?? '—'

  function handleOpenMaps() {
    if (!hasCoords) return
    Linking.openURL(mapsUrl(pickupLat!, pickupLng!))
  }

  function handleCallRider() {
    if (!booking?.guestPhone) return
    Linking.openURL(`tel:${booking.guestPhone}`)
  }

  function handleArrived() {
    router.push(`/(duty)/arrived?id=${id}`)
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centerState}>
          <Text style={styles.centerText}>Trip not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn}>
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
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>En Route</Text>
          <View style={styles.tripCodeChip}>
            <Text style={styles.tripCodeText}>{tripCode}</Text>
          </View>
        </View>

        {/* Rider card */}
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

        {/* Drop address card */}
        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>DROP</Text>
          <Text style={styles.addressText}>
            {booking.drop?.placeName ?? booking.drop?.location ?? '—'}
          </Text>
        </View>

        {/* Geofence status bar */}
        {hasCoords ? (
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

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.ghostBtn, !booking.guestPhone && styles.ghostBtnDisabled]}
            onPress={handleCallRider}
            disabled={!booking.guestPhone}
            activeOpacity={0.75}
          >
            <Text style={styles.ghostBtnText}>Call rider</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, !canMarkArrived && styles.primaryBtnDisabled]}
            onPress={handleArrived}
            disabled={!canMarkArrived}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>I've arrived ✓</Text>
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
