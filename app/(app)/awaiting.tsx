import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Svg, { Path, Circle } from 'react-native-svg'
import { YL, FONTS } from '../../constants/theme'
import YAppChrome from '../../components/YAppChrome'
import YButton from '../../components/YButton'
import GulmoharSpray from '../../components/GulmoharSpray'
import RouteVisualizer from '../../components/RouteVisualizer'
import { getBooking, updateBookingStatus } from '../../lib/api'
import type { Booking } from '../../types/booking'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`
}

function formatPickupLabel(iso: string): string {
  try {
    const d = new Date(iso)
    const day = DAYS[d.getDay()]
    const date = d.getDate()
    const mon = MONTHS[d.getMonth()]
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${day}, ${date} ${mon} · ${h % 12 || 12}:${m} ${ampm}`
  } catch {
    return ''
  }
}

export default function ScreenAwaitingPartner() {
  const router = useRouter()
  const params = useLocalSearchParams<{ booking: string }>()
  const [booking, setBooking] = useState<Booking | null>(() => {
    try { return params.booking ? JSON.parse(params.booking) : null } catch { return null }
  })
  const [elapsed, setElapsed] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!booking?.id) return
    if (booking.assignedDriver) {
      router.push({ pathname: '/(app)/enroute', params: { booking: JSON.stringify(booking) } })
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const updated = await getBooking(booking.id)
        setBooking(updated)
        if (updated.assignedDriver) {
          if (pollRef.current) clearInterval(pollRef.current)
          router.push({ pathname: '/(app)/enroute', params: { booking: JSON.stringify(updated) } })
        }
      } catch {
        // silent
      }
    }, 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [booking?.id])

  const tripCode = booking?.tripCode ?? '#YL-——'
  const pickupName = booking?.pickup?.placeName ?? booking?.pickup?.location ?? 'Pickup'
  const dropName = booking?.drop?.placeName ?? booking?.drop?.location ?? 'Destination'
  const pickupTime = booking?.pickup?.dateTime ? formatPickupLabel(booking.pickup.dateTime) : ''
  const flightNum = (booking as any)?.flight?.flightNumber ?? ''
  const sublabel = [pickupTime, flightNum].filter(Boolean).join(' · ')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: YL.bg, overflow: 'hidden', position: 'relative' }}>
      <GulmoharSpray
        style={{ position: 'absolute', right: -80, top: -20, width: 280, height: 280 }}
        color={YL.gulmohar}
        opacity={0.08}
      />

      <YAppChrome
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: YL.leaf }} />
            <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink3 }}>confirmed</Text>
          </View>
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 4, zIndex: 1 }}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: YL.yellow, borderWidth: 2, borderColor: YL.ink,
          alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Svg width={30} height={24} viewBox="0 0 30 24" fill="none">
            <Path d="M4 13L11 20L26 4" stroke={YL.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>

        <Text style={{ fontFamily: FONTS.display, fontSize: 32, fontWeight: '500', color: YL.ink, letterSpacing: -1 }}>
          You're <Text style={{ fontStyle: 'italic' }}>set.</Text>
        </Text>
        <Text style={{ fontFamily: FONTS.display, fontSize: 14, color: YL.ink2, marginTop: 8 }}>
          Booking{' '}
          <Text style={{ fontFamily: FONTS.mono, color: YL.ink }}>{tripCode}</Text>
        </Text>
      </View>

      {/* Partner assignment card */}
      <View style={{
        marginHorizontal: 20, marginTop: 18, padding: 18,
        backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line,
        borderRadius: 22, zIndex: 1,
      }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, letterSpacing: 0.3, marginBottom: 10 }}>
          PARTNER ASSIGNMENT
        </Text>

        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: YL.bg2, borderWidth: 1.5, borderColor: YL.line,
            borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
          }}>
            <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
              <Circle cx={14} cy={10} r={5} stroke={YL.ink3} strokeWidth={1.5} strokeDasharray="3 2" />
              <Path d="M5 26C5 21.029 9.029 17 14 17C18.971 17 23 21.029 23 26" stroke={YL.ink3} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="3 2" />
            </Svg>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.display, fontSize: 17, fontWeight: '500', color: YL.ink, letterSpacing: -0.3 }}>
              Assigning 60 min before pickup
            </Text>
            <Text style={{ fontFamily: FONTS.display, fontSize: 12.5, color: YL.ink3, marginTop: 2 }}>
              You'll get an SMS & push when your partner is set
            </Text>
          </View>
        </View>

        <View style={{
          marginTop: 14, paddingHorizontal: 14, paddingVertical: 12,
          backgroundColor: YL.bg, borderRadius: 12,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 12, color: YL.ink2 }}>Waiting</Text>
          <Text style={{ fontFamily: FONTS.mono, fontSize: 15, fontWeight: '500', color: YL.ink, letterSpacing: 0.5 }}>
            {formatElapsed(elapsed)}
          </Text>
        </View>
      </View>

      {/* Your ride card */}
      <View style={{
        marginHorizontal: 20, marginTop: 12, padding: 16,
        backgroundColor: YL.card, borderWidth: 1, borderColor: YL.line,
        borderRadius: 20, zIndex: 1,
      }}>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: YL.ink3, letterSpacing: 0.3, marginBottom: 10 }}>
          YOUR RIDE
        </Text>
        <RouteVisualizer
          stops={[
            { label: pickupName, sublabel },
            { label: dropName },
          ]}
        />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, zIndex: 1 }}>
        <YButton variant="outline" full={false} style={{ flex: 1 }} onPress={async () => {
          if (booking?.id) {
            try { await updateBookingStatus(booking.id, 'cancelled') } catch {}
          }
          router.replace('/(app)/home')
        }}>
          Cancel booking
        </YButton>
        <YButton variant="ink" full={false} style={{ flex: 1.3 }} onPress={() => Linking.openURL('https://wa.me/918628062808')}>
          WhatsApp support
        </YButton>
      </View>
    </SafeAreaView>
  )
}
