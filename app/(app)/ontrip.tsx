import React from 'react'
import { View, Text, Pressable, Linking, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YButton from '../../components/YButton'
import LiveMap from '../../components/LiveMap'
import { useBookingTracking } from '../../lib/useBookingTracking'
import type { Booking } from '../../types/booking'

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

  const driver = (booking as any)?.assignedDriver
  const vehicle = (booking as any)?.assignedVehicle
  const flight = (booking as any)?.flight

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

        <View style={{
          position: 'absolute', top: 14, left: 14, right: 14,
          paddingHorizontal: 14, paddingVertical: 10,
          backgroundColor: YL.ink, borderRadius: 14,
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: YL.yellow }} />
          <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: 'white', flex: 1 }}>
            On the way to <Text style={{ fontWeight: '600' }}>{dropName}</Text>
            {eta != null ? <Text style={{ fontWeight: '600' }}> · {eta} min</Text> : null}
          </Text>
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

        {flightNum ? (
          <View style={{
            paddingHorizontal: 14, paddingVertical: 12,
            backgroundColor: YL.leafSoft, borderRadius: 12,
            flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
          }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: YL.leaf, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path d="M2 11L7 8.5V4L9 3L10 6.5L14 5V7L8.5 9.5L9 14H7L5 10L2 11Z" fill="white" />
              </Svg>
            </View>
            <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink, flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>{flightNum}</Text>
            </Text>
          </View>
        ) : null}

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
          <YButton variant="ink" size="md" full={false} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(app)/complete', params: { bookingId: booking?.id, booking: params.booking } })}>Complete</YButton>
        </View>
      </View>
    </SafeAreaView>
  )
}
