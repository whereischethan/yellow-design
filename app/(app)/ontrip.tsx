import React from 'react'
import { View, Text, Pressable, Linking, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YButton from '../../components/YButton'
import LiveMap from '../../components/LiveMap'
import { useBookingTracking } from '../../lib/useBookingTracking'
import { fetchFlight } from '../../lib/api'
import { fmtTimeIST, istDateString } from '../../lib/ist'
import type { Booking, FlightInfo } from '../../types/booking'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function ActionCircle({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: YL.bg2, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      {children}
    </Pressable>
  )
}

function PhoneIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 16 16" fill="none">
      <Path d="M3 3 Q3 11 13 13 L13 10 L10 9 L8 11 Q6 10 5 8 L7 6 L6 3 Z" fill={YL.ink} />
    </Svg>
  )
}

function HomeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M3 8.5L9 3L15 8.5V15H11V11H7V15H3V8.5Z" stroke={YL.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// Badge colors keyed off the live flight status text
function flightBadgeColors(status: string): { bg: string; accent: string } {
  const s = status.toLowerCase()
  if (s.includes('cancel') || s.includes('divert')) return { bg: '#FEF2F2', accent: '#C0392B' }
  if (s.includes('delay')) return { bg: YL.gulmoharSoft, accent: YL.gulmohar }
  return { bg: YL.leafSoft, accent: YL.leaf }
}

function flightStatusLabel(status: string): string {
  const s = status.toLowerCase()
  if (s === 'scheduled' || s === 'expected') return 'On time'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function ScreenOnTrip() {
  const router = useRouter()
  const params = useLocalSearchParams<{ booking: string }>()
  const initialBooking: Booking | null = (() => {
    try { return params.booking ? JSON.parse(params.booking) : null } catch { return null }
  })()

  const { booking: liveBooking, trackingInfo, secondsAgo, isLive } = useBookingTracking(initialBooking)
  const booking = liveBooking ?? initialBooking

  // Auto-advance when the trip finishes (driver/admin updates)
  React.useEffect(() => {
    if (!liveBooking) return
    if (liveBooking.status === 'completed' || liveBooking.status === 'cancelled') {
      router.replace({ pathname: '/(app)/complete', params: { bookingId: liveBooking.id, booking: JSON.stringify(liveBooking) } })
    }
  }, [liveBooking?.status])

  // Live flight status: fetched once on mount, stored snapshot as fallback
  const [liveFlight, setLiveFlight] = React.useState<FlightInfo | null>(null)
  React.useEffect(() => {
    const fn = initialBooking?.flight?.flightNumber
    if (!fn) return
    const date = initialBooking?.pickup?.dateTime ? istDateString(initialBooking.pickup.dateTime) : undefined
    fetchFlight(fn, date || new Date())
      .then(setLiveFlight)
      .catch(() => {})
  }, [])

  const driver = (booking as any)?.assignedDriver
  const vehicle = (booking as any)?.assignedVehicle
  const flight: FlightInfo | null = liveFlight ?? (booking as any)?.flight ?? null

  const driverName = driver?.name ?? 'Your chauffeur'
  const initials = driver?.name ? getInitials(driver.name) : '?'
  const plate = vehicle?.licensePlate ?? '——'
  const dropName = booking?.drop?.placeName ?? booking?.drop?.location ?? 'Destination'
  const flightNum = flight?.flightNumber ?? ''

  const eta = trackingInfo?.etaMinutes
  const updateText = isLive && secondsAgo != null
    ? `Live · updated ${secondsAgo}s ago`
    : trackingInfo?.tracking && trackingInfo.driver?.stale ? 'Live location unavailable' : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden' }}>
      <View style={{ flex: 1, position: 'relative', minHeight: 320 }}>
        <LiveMap
          driver={isLive ? trackingInfo?.driver : null}
          pickup={trackingInfo?.pickup}
          drop={trackingInfo?.drop}
          target="drop"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Pressable
            onPress={() => router.replace('/(app)/home')}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 20, backgroundColor: YL.card,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <HomeIcon />
          </Pressable>

          <View style={{
            flex: 1, paddingHorizontal: 14, paddingVertical: 10,
            backgroundColor: YL.ink, borderRadius: 14,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: YL.yellow }} />
            <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: 'white', flex: 1 }}>
              On the way to <Text style={{ fontWeight: '600' }}>{dropName}</Text>
              {eta != null ? <Text style={{ fontWeight: '600' }}> · {eta} min</Text> : null}
            </Text>
          </View>
        </View>

        {updateText ? (
          <View style={{
            position: 'absolute', bottom: 32, left: 14,
            paddingHorizontal: 10, paddingVertical: 5,
            backgroundColor: YL.card, borderRadius: 100, opacity: 0.92,
          }}>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink3 }}>{updateText}</Text>
          </View>
        ) : null}
      </View>

      <View style={{
        backgroundColor: YL.card, borderTopWidth: 1, borderTopColor: YL.line,
        paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20,
        borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, zIndex: 2,
      }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: YL.line, alignSelf: 'center', marginTop: -4, marginBottom: 14 }} />

        {flightNum ? (() => {
          const { bg, accent } = flightBadgeColors(flight?.status ?? '')
          const arrivalTime = flight?.arrival ? fmtTimeIST(flight.arrival) : ''
          const detailBits = [
            flight?.status ? flightStatusLabel(flight.status) : '',
            arrivalTime ? `Arrives ${arrivalTime}` : '',
            flight?.terminal || '',
          ].filter(Boolean)
          return (
            <View style={{
              paddingHorizontal: 14, paddingVertical: 12,
              backgroundColor: bg, borderRadius: 12,
              flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
            }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M2 11L7 8.5V4L9 3L10 6.5L14 5V7L8.5 9.5L9 14H7L5 10L2 11Z" fill="white" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink }}>
                  <Text style={{ fontWeight: '600' }}>{flightNum}</Text>
                  {flight?.airline ? ` · ${flight.airline}` : ''}
                </Text>
                {detailBits.length ? (
                  <Text style={{ fontFamily: FONTS.display, fontSize: 11.5, color: YL.ink3, marginTop: 1 }}>
                    {detailBits.join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>
          )
        })() : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: YL.gulmoharSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: '500', color: YL.gulmohar }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 13.5, fontWeight: '500', color: YL.ink }}>
              {driverName} · {plate}
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 11.5, color: YL.ink3, marginTop: 1 }}>
              via NICE Road · tolls included
            </Text>
          </View>
          <ActionCircle onPress={() => { if (driver?.phone) Linking.openURL(`tel:${driver.phone}`) }}>
            <PhoneIcon />
          </ActionCircle>
        </View>

        <View style={{ height: 1, backgroundColor: YL.lineSoft, marginVertical: 14, marginHorizontal: -2 }} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <YButton variant="soft" size="md" full={false} style={{ flex: 1 }} onPress={() => {
            const from = (booking as any)?.pickup?.location ?? ''
            const to = booking?.drop?.placeName ?? booking?.drop?.location ?? ''
            Share.share({ message: `Tracking my Yellow ride\nFrom: ${from}\nTo: ${to}\nDriver: ${driverName} · ${plate}` })
          }}>Share</YButton>
          <YButton variant="soft" size="md" full={false} style={{ flex: 1 }} onPress={() => Linking.openURL('tel:112')}>SOS</YButton>
        </View>
      </View>
    </SafeAreaView>
  )
}
