import React from 'react'
import { View, Text, Pressable, Linking, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YButton from '../../components/YButton'
import LiveMap from '../../components/LiveMap'
import { useBookingTracking } from '../../lib/useBookingTracking'
import { SUPPORT_WHATSAPP } from '../../constants/config'
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

function MailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect x={2} y={4} width={14} height={10} rx={2} stroke={YL.ink} strokeWidth={1.5} />
      <Path d="M2 7L9 11L16 7" stroke={YL.ink} strokeWidth={1.5} strokeLinecap="round" />
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

export default function ScreenPartnerEnRoute() {
  const router = useRouter()
  const params = useLocalSearchParams<{ booking: string }>()
  const initialBooking: Booking | null = (() => {
    try { return params.booking ? JSON.parse(params.booking) : null } catch { return null }
  })()

  const { booking: liveBooking, trackingInfo, secondsAgo, isLive, connectionError } = useBookingTracking(initialBooking)
  const booking = liveBooking ?? initialBooking

  // Auto-advance when the trip status moves on (driver/admin updates)
  React.useEffect(() => {
    if (!liveBooking) return
    if (liveBooking.status === 'in_progress') {
      router.replace({ pathname: '/(app)/ontrip', params: { booking: JSON.stringify(liveBooking) } })
    } else if (liveBooking.status === 'completed' || liveBooking.status === 'cancelled') {
      router.replace({ pathname: '/(app)/complete', params: { bookingId: liveBooking.id, booking: JSON.stringify(liveBooking) } })
    }
  }, [liveBooking?.status])

  const driver = (booking as any)?.assignedDriver
  const vehicle = (booking as any)?.assignedVehicle

  const driverName = driver?.name ?? 'Your chauffeur'
  const initials = driver?.name ? getInitials(driver.name) : '?'
  const vehicleLabel = vehicle ? `${vehicle.make} ${vehicle.model}` : 'Yellow Sky'
  const plate = vehicle?.licensePlate ?? '——'

  const arrived = booking?.status === 'arrived'
  const eta = trackingInfo?.etaMinutes
  const statusText = arrived
    ? 'Partner has arrived'
    : eta != null ? `Partner is on the way · ${eta} min` : 'Partner is on the way'
  const updateText = isLive && secondsAgo != null
    ? `Live · updated ${secondsAgo}s ago`
    : trackingInfo?.tracking && trackingInfo.driver?.stale ? 'Live location unavailable' : null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden' }}>
      <View style={{ flex: 1, position: 'relative', backgroundColor: YL.bg2, minHeight: 360 }}>
        <LiveMap
          driver={isLive ? trackingInfo?.driver : null}
          pickup={trackingInfo?.pickup}
          drop={trackingInfo?.drop}
          target="pickup"
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
            flex: 1, paddingHorizontal: 14, paddingVertical: 9,
            backgroundColor: YL.card, borderRadius: 100,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: arrived ? YL.yellowDeep : YL.leaf }} />
            <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, fontWeight: '500', color: YL.ink }}>
              {statusText}
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

      {connectionError && (
        <View style={{ backgroundColor: '#FEF9C3', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingHorizontal: 20, paddingVertical: 8 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: '#92400E', textAlign: 'center' }}>
            Trouble connecting — tracking may be delayed
          </Text>
        </View>
      )}

      <View style={{
        backgroundColor: YL.card, borderTopWidth: 1, borderTopColor: YL.line,
        paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20,
        borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, zIndex: 2,
      }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: YL.line, alignSelf: 'center', marginTop: -4, marginBottom: 14 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: YL.gulmoharSoft, borderWidth: 1.5, borderColor: YL.gulmohar + '33',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: '500', color: YL.gulmohar }}>{initials}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: '500', color: YL.ink }}>{driverName}</Text>
          </View>

          <ActionCircle onPress={() => { if (driver?.phone) Linking.openURL(`tel:${driver.phone}`) }}>
            <PhoneIcon />
          </ActionCircle>
          <ActionCircle onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`)}>
            <MailIcon />
          </ActionCircle>
        </View>

        <View style={{ height: 1, backgroundColor: YL.lineSoft, marginVertical: 14, marginHorizontal: -2 }} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: YL.bg2, padding: 10, borderRadius: 12 }}>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10, color: YL.ink3, letterSpacing: 0.3, marginBottom: 4 }}>VEHICLE</Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: '500', color: YL.ink }}>{vehicleLabel}</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: YL.yellow, borderRadius: 12, borderWidth: 1.5, borderColor: YL.ink }}>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 10.5, color: YL.ink, opacity: 0.75, letterSpacing: 0.3, marginBottom: 4 }}>PLATE</Text>
            <Text style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: '600', color: YL.ink, letterSpacing: 1 }}>{plate}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <YButton variant="soft" size="md" full={false} style={{ flex: 1 }} onPress={() => {
            const from = (booking as any)?.pickup?.location ?? ''
            const to = (booking as any)?.drop?.location ?? ''
            Share.share({ message: `Tracking my Yellow ride\nFrom: ${from}\nTo: ${to}\nDriver: ${driverName} · ${plate}` })
          }}>Share trip</YButton>
        </View>
      </View>
    </SafeAreaView>
  )
}
